# Personnel Page — Performance Analysis

## 1. Problem Statement

The Personnel page (`frontend/src/pages/Personnel.tsx`) exhibits a noticeable
load lag: the UI stays on the skeleton-spinner, the table renders slowly (or
not at all) on large rosters, and typing into the search/filter boxes stutters.
This affects every admin who opens **Personnel** from the sidebar, which is
gated behind `AdminRoute` (App.tsx:232). The lag grows linearly with the number
of `users` rows in the database.

## 2. Data Flow Analysis

| Step | Where | What happens |
|------|-------|--------------|
| 1 | App.tsx:117-120 | `DropdownOptionsLoader` calls `useDropdownOptions()` (`hooks/useDropdownOptions.ts:18`) which fetches `GET /dropdown-options` once (staleTime 5 min, `api.php:36`). Result is cached in the zustand `dropdownStore` (`stores/dropdownStore.ts`). |
| 2 | Personnel.tsx:32-35 | `useQuery({ queryKey: ['personnel'], queryFn: api.get('/personnel') })`. No `staleTime`, no `select`, no pagination. Hits the inline closure at `backend/routes/api.php:140-156`. |
| 3 | api.php:140-156 | `GET /personnel` runs `User::whereNotIn('role',['office_station','office'])->with(['office','headedOffice'])->withCount(['documents','routedDocuments'])->orderBy('name')->get()` — **the entire users table** is loaded into memory with two eager relations and two aggregate subqueries, then mapped (the `headedOffice` relation is `unset` afterward to "keep the payload clean" — i.e. it is fetched then thrown away). |
| 4 | Personnel.tsx:37-40 | `useQuery({ queryKey: ['offices-min'], queryFn: api.get('/offices') })`. The key name implies a minimal payload, but it actually hits `OfficeController::index` (`app/Http/Controllers/Api/OfficeController.php:15`), which loads **all** offices with `with(['parent','head'])` **and** runs `storageUsageBytes()` **per office** — an N+1 (see §3). |
| 5 | Personnel.tsx:108-124 | The full result array is filtered **client-side** with a plain `.filter(...)` over `search`, `officeFilter`, and `rankFilter`. No server-side search; no debouncing. |
| 6 | Personnel.tsx:201-228 | Four `StatCard` values are computed by re-iterating the full array on every render: `.length`, `new Set(...).size` over `unit_assignment`, `.filter(!office_id).length`, `.filter(officer ranks).length`. None are memoized. |
| 7 | Personnel.tsx:304-347 | The filtered rows are rendered into a plain `<table>` with `filtered.map(...)`. There is **no virtualization** and **no pagination** — one `<tr>` per record. |

### Mutations triggered on this page
- `POST /personnel` (create) → invalidates `['personnel']`
- `PUT /admin/users/{id}` (save) → invalidates `['personnel']`
- `POST /personnel/import` (CSV) → invalidates `['personnel']`
- `DELETE /admin/personnel/clear` → invalidates `['personnel']`

Each mutation success re-fetches the **entire** payload again (step 3).

## 3. Identified Bottlenecks (ranked by impact)

### 3.1 No pagination — the entire `users` table is serialized on every load ⭐⭐⭐⭐⭐
`backend/routes/api.php:140-156` calls `->get()` with no `limit`/`paginate`.
`User` is a wide row (`app/Models/User.php:16-49` — 17 fillable columns,
`notification_preferences` and `two_factor_recovery_codes` cast to `array`,
password/`pincode`/`two_factor_secret` hidden but everything else serialized).
The frontend only renders `rank`, name parts, `designation`, `office.name`,
`role`, `email`, `office_id` — yet it receives the full JSON for every user.

### 3.2 Wasteful eager load + aggregate subqueries that the frontend never uses ⭐⭐⭐⭐
`api.php:143`:
```php
->with(['office', 'headedOffice'])
->withCount(['documents', 'routedDocuments'])
```
- `headedOffice` is eager-loaded for **every** user, then explicitly `unset`
  inside the row map (`api.php:153`). The query runs (one extra SELECT against
  `offices.head_user_id`), allocates Office model objects, then discards them.
  The only reason it exists is the fallback at `api.php:148-151` for users
  without a direct `office_id`.
- `withCount('documents')` and `withCount('routedDocuments')` add two
  correlated `SELECT COUNT(*) ... WHERE documents.originator_id = users.id`
  subqueries (`User.php:135-142`). `originator_id` is indexed
  (`2026_08_15_000001_add_dashboard_indexes_to_documents.php:13`), so this is
  bounded, but it still forces a grouped scan of the `documents` table and
  ships two `*_count` fields per user in the payload — **none of which the
  Personnel page displays** (Personnel.tsx never references `documents_count`
  or `routed_documents_count`).

### 3.3 Client-side filtering of an unbounded result set ⭐⭐⭐⭐
`Personnel.tsx:108-124`:
```ts
const filtered = (personnel ?? []).filter((u) => { ... })
```
Search matches 7 fields, office match on `office_id`, rank match on `rank`.
This runs synchronously on the **full** in-memory array. As the roster grows
into the thousands, each keystroke re-scans every record with no debounce, so
the input visibly lags while typing.

### 3.4 Un-memoized re-computation of every StatCard on every render ⭐⭐⭐
`Personnel.tsx:201-228` — the four dashboard cards each call a separate full-
array pass (`(personnel ?? ).length`, `new Set((personnel ?? []).map(...))`,
two more `.filter(...).length`). Because `filtered` itself is un-memoized,
**and** the stat computations are un-memoized, a single render triggers ~6
O(n) passes over the full personnel array. State updates in the modals
(`setEditForm({ ...editForm, ... })`) cause the parent to re-render and
re-run all of these.

### 3.5 Full-table `<table>` render (no virtualization, no pagination) ⭐⭐⭐
`Personnel.tsx:304-347` renders one `<tr>` per row. React commits a DOM node
for every personnel record. At ~2,000+ users this is thousands of committed
nodes plus per-row inline event handlers; paint time climbs into the
seconds. There is no `react-window`/`virtuoso` virtualizer and no
"load more"/page control.

### 3.6 N+1 on `GET /offices` via `storageUsageBytes()` ⭐⭐
`OfficeController::index` (`app/Http/Controllers/Api/OfficeController.php:37`):
```php
$office->setAttribute('storage_usage_bytes', $office->storageUsageBytes());
```
called per office inside `->map(...)`. `storageUsageBytes()`
(`app/Models/Office.php:64-72`) runs a 3-table join + `SUM(file_size)`
per office. The Personnel page's office selector **only** needs `id` and
`name` (`Personnel.tsx:251-253`, `:419-420`), so the per-office storage
calculation is pure overhead on this page. (It is also a latent N+1 for the
Offices page, but the payload here is inflated regardless.)

### 3.7 Redundant / mis-keyed `offices` query ⭐⭐
`Personnel.tsx:37-40` uses query key `['offices-min']` but calls `/offices`
(the full index, step 4), not a minimal endpoint. The mismatch means any other
consumer of "real" office data cannot share the cache, and this page pays for
the full office payload (including `storage_usage_bytes`) plus the `parent`
eager-load it does not use.

### 3.8 Mutation success invalidates the whole collection ⭐
`Personnel.tsx:46,57,69,91` — every create/update/import/clear calls
`queryClient.invalidateQueries({ queryKey: ['personnel'] })`, which discards
the full (large) payload and refetches it wholesale. A single row update
re-downloads **every** user.

## 4. Root Cause Analysis

| Bottleneck | Root cause |
|---|---|
| 3.1 No pagination | The API is an inline route closure (`api.php:140`) that calls `->get()`; the frontend `useQuery` has no `meta` or pagination options and the table has no pager. |
| 3.2 Wasted relations | The closure was written to pre-empt the `headedOffice` fallback, but `unset($user->headedOffice)` (`api.php:153`) discards it immediately — the fetch is dead work. `withCount` was added for a dashboard that apparently never consumed the counts on this page. |
| 3.3 Client filtering | No server-side `search`/`office_id`/`rank` query params accepted by the route; the page filters the in-memory array instead. |
| 3.4 StatCard re-computation | `filtered` and the StatCard values are computed inline in the render body with no `useMemo`; React re-runs them on every render pass. |
| 3.5 Full render | The table is a plain `<tbody>.map`; no virtualizer dependency in the project for this route. |
| 3.6 Office N+1 | `storageUsageBytes()` is invoked per-row in the collection map rather than batched; no minimal office endpoint exists. |
| 3.7 Mis-keyed query | The query key `['offices-min']` promises a minimal payload that the `/offices` route does not deliver. |
| 3.8 Wholesale invalidation | Mutations invalidate `['personnel']` (the whole collection) rather than updating individual rows via `queryClient.setQueryData` or `upsertQueryData`. |

## 5. Recommended Interventions

### P0 — Backend: scope the `GET /personnel` payload (api.php:140-156)
**R:** The system **shall** accept `search`, `office_id`, and `rank` query
parameters and **shall** return a paginated `length_awesome`-shaped collection
(`data` + `meta`), so the Personnel page **does not** fetch or render more
than one page of rows.

```php
Route::get('/personnel', function (Request $request) {
    $q = User::whereNotIn('role', ['office_station', 'office'])
        ->with('office');            // drop headedOffice — re-apply fallback below if needed

    if ($request->filled('office_id'))  $q->where('office_id', $request->office_id);
    if ($request->filled('rank'))       $q->where('rank', $request->rank);
    if ($request->filled('search')) {
        $s = $request->search;
        $q->where(function ($qq) use ($s) {
            $qq->where('name', 'like', "%$s%")
               ->orWhere('email', 'like', "%$s%")
               ->orWhere('rank', 'like', "%$s%")
               ->orWhere('first_name', 'like', "%$s%")
               ->orWhere('last_name', 'like', "%$s%")
               ->orWhere('unit_assignment', 'like', "%$s%")
               ->orWhere('designation', 'like', "%$s%");
        });
    }

    return $q->orderBy('name')->paginate($request->integer('per_page', 50));
});
```

**Drop** `with(['headedOffice'])` and `withCount(['documents','routedDocuments'])`
from this route — neither is rendered by `Personnel.tsx`. If the
`headedOffice` fallback is still needed elsewhere, move it into a dedicated
controller method and keep this list endpoint lean.

Expected impact: payload shrinks from "all users, full row" to one page of
~50 lean rows; the dominant cause of the load lag is removed.

### P0 — Frontend: paginate + server-filter the personnel query (Personnel.tsx:32-35)
```ts
const [page, setPage] = useState(1)
const [rows, setRows] = useState(50)

const { data: result, isLoading, isError } = useQuery({
  queryKey: ['personnel', { search, officeFilter, rankFilter, page, rows }],
  queryFn: () => api.get('/personnel', {
    params: { search, office_id: officeFilter, rank: rankFilter, page, per_page: rows },
  }).then(res => res.data),
  keepPreviousData: true,            // avoid pop on page change
  staleTime: 30_000,
})

const personnel = result?.data ?? []
const total = result?.meta?.total ?? 0
const lastPage = result?.meta?.last_page ?? 1
```
- Add an `<input type="search">` with a 250-300 ms `useDebounce` so each
  keystroke does not fire a request.
- Render server-side `office_id` and `rank` filters via the `<select>`s,
  not by re-filtering the array.
- Add a simple pager (`Personnel.tsx`) — first/last/prev/next and a page-size
  selector.

### P1 — Frontend: memoize the dashboard statistics (Personnel.tsx:201-228)
```ts
const stats = useMemo(() => {
  const arr = personnel;
  const units = new Set<string>();
  let withoutOffice = 0;
  let officers = 0;
  for (const u of arr) {
    if (u.unit_assignment) units.add(u.unit_assignment);
    if (!u.office_id) withoutOffice++;
    if (OFFICER_RANKS.includes((u.rank || '').toUpperCase())) officers++;
  }
  return { total: arr.length, units: units.size, withoutOffice, officers };
}, [personnel]);
```
This collapses 6 full-array passes into one, recomputed only when the
personnel slice changes.

### P1 — Frontend: virtualize the table (Personnel.tsx:304-347)
Replace the plain `filtered.map(...)` with a virtual list (`react-window`'s
`FixedSizeAutosizeList` or `virtuoso`). This caps DOM nodes at the viewport
height regardless of roster size. (The project already has Tailwind + React;
add `npm i react-window` — ~14 kB.)

### P2 — Frontend: optimistic row updates (Personnel.tsx:42-52, 54-64, 66-80, 82-98)
Replace `queryClient.invalidateQueries({ queryKey: ['personnel'] })` in
`updateMutation.onSuccess` with a targeted `setQueryData`:
```ts
queryClient.setQueryData(['personnel', { ... }], (old: any) => ({
  ...old,
  data: old.data.map((u: any) => u.id === id ? { ...u, ...data } : u),
  total: old.total,
}))
```
For create/import/clear, only invalidate when the page/count actually changes.
This removes the "re-download everything after every save" cost.

### P2 — Backend: minimal office endpoint for the filter (api.php / OfficeController)
Add `GET /offices/min` (or a `fields=id,name` param) returning
`offices ->select('id','name')`, so the Personnel page's filter selector
(`Personnel.tsx:250-253`, `:419-420`) does not pay for `storage_usage_bytes`
N+1 or the `parent`/`head` eager loads:
```php
Route::get('/offices/min', fn () => Office::select('id','name')
    ->orderBy('name')->get());
```
Point the `['offices-min']` query at it and rename the key to `['offices', 'min']`
for cache clarity.

### P2 — Backend: fix the latent `routedDocuments` count semantics
`User::routedDocuments()` (`User.php:140-142`) is
`hasMany(Document::class, 'current_office_id')` — i.e. it counts documents
whose **`current_office_id` equals a user's `id`**. But `documents.current_office_id`
is an Office foreign key (migration `2024_01_01_000004_create_documents_table.php:28`),
so the count is always ~0 and semantically wrong. If the document-in-flight
count is ever needed, the correct accessor is `documents.recipient_id`-based or a
dedicated scope — **remove** `withCount('routedDocuments')` from the personnel
route (covered by P0) until it is corrected.

### P3 — Frontend: lift `useDropdownOptions` load guard
`App.tsx:204` mounts `DropdownOptionsLoader` only when `unlocked`, so the
dropdown cache is warm by the time `Personnel` renders — this is already fine.
No change required, but confirm the `staleTime: 5 * 60 * 1000`
(`useDropdownOptions.ts:28`) is sufficient that switching between pages backed
by `useDropdownGroup` does not re-fetch.

## 6. Expected Impact

| Fix | Impact |
|---|---|
| P0 scope + paginate `GET /personnel` | Eliminates the dominant cause of the load lag. First load goes from "all users, full row, 2 subqueries, 2 eager loads" to a single page of lean rows. On a 2,000-user roster this is roughly a 10–20x payload reduction and removes the multi-second spinner. |
| P0 server-side search/filter | Typing stops re-scanning the in-memory array; filtering becomes O(page) instead of O(n) and is debounced. |
| P1 memoize StatCards | ~6 array passes → 1 per data change; removes re-compute stutter after modal state updates. |
| P1 virtualize table | DOM node count is constant (viewport only); render/paint of large lists drops from seconds to milliseconds. |
| P2 optimistic mutations | Create/update no longer triggers a full re-fetch of the entire personnel list — row updates are local. |
| P2 minimal office endpoint | Removes the `storageUsageBytes()` N+1 from the Personnel page path; office selector renders from a few hundred bytes instead of KB. |
| P2 correct `routedDocuments` semantics | Fixes a silent correctness bug; prevents a future maintainer from re-adding it to a hot path. |

## 7. Verification Plan

1. **Before/after payload size** — `curl -H "Authorization: Bearer $T" http://localhost:8000/api/personnel | wc -c` vs. the paginated `?per_page=50` response; expect ~90%+ reduction per page.
2. **DB query count** — enable `DB::enableQueryLog()` for the route (or use `barryvdh/laravel-debugbar`) and confirm the personnel load is 1 SELECT (no `headedOffice`, no per-row `storageUsageBytes`).
3. **`EXPLAIN ANALYZE`** on the paginated query to confirm the `whereNotIn` + `search` LIKE predicates use indexes (consider a composite index on `(role, name)` if the `whereNotIn('role')` + `orderBy('name')` becomes a hotspot — see `2024_01_01_000002_create_users_table.php:17` for the role enum).
4. **Lighthouse/React Profiler** — confirm table render time is bounded regardless of roster size after virtualization; confirm StatCard re-renders drop to 0 on modal open.
