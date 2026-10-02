# Profile Setup Banner/Modal System — Specification

This document is a reverse-engineered specification of the profile setup
banner/modal system in the DTMS Revamp codebase. It traces the flow of the
`profile_setup_complete` and `profile_setup_skipped` flags from the backend
API through the frontend auth store to UI render conditions, and documents
the dismissal and re-opening mechanisms.

---

## 1. Technology Stack and Architecture

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Backend      | Laravel (PHP 8.3+), Sanctum API auth         |
| Backend ORM  | Eloquent, `App\Models\User`                 |
| API routes   | `backend/routes/api.php` (REST + Sanctum)   |
| Frontend     | React 18, TypeScript, Vite                   |
| State mgmt   | Zustand (`useAuthStore`), TanStack Query     |
| Storage (ephemeral flag) | `sessionStorage` (per-tab browser session) |
| Persistence  | Zustand `persist` middleware (localStorage) |

### Architecture summary

The system is a **single-page application** backed by a Laravel Sanctum API.
Authentication state is held in a Zustand store (`authStore`) that persists the
`user` object, `token`, and `isAuthenticated` flag to `localStorage`.
The `showProfileSetup` boolean lives in the store but is **not** persisted
(see §2.4). Ephemeral UI state (banner dismissal) is stored in
`sessionStorage`, which is scoped to the browser tab session.

A full user object is re-fetched from `GET /auth/me` on every app load
(App.tsx `userSynced` gating) so that server-side flag changes since the last
persisted snapshot are reflected before any render decision is made.

### Role model

| Role            | Profile setup modal                | Email verification |
|-----------------|------------------------------------|--------------------|
| `office_station`| `OfficeProfileSetupModal`          | none (admin-provisioned) |
| `superadmin` / `officer` / `non_officer` / `fcos` | `ProfileSetupModal` | required after setup |

`UserRole` enum lives at `backend/app/Enums/UserRole.php`.

---

## 2. Module / Directory Structure

### Backend

| Path | Responsibility |
|------|----------------|
| `backend/app/Models/User.php` | Eloquent model; declares `profile_setup_complete` and `profile_setup_skipped` as `$fillable` + `$casts` booleans |
| `backend/app/Http/Controllers/Api/AuthController.php` | `me`, `completeProfileSetup`, `completeOfficeProfileSetup`, `updateProfile` |
| `backend/app/Http/Controllers/Api/OfficeController.php` | `myOffice`, `updateMyOffice` (separate office-info save — does **not** touch setup flags) |
| `backend/routes/api.php` | Route definitions |
| `backend/database/migrations/2026_08_19_000001_add_profile_setup_complete_to_users.php` | Adds `profile_setup_complete` (bool, default false); backfills existing named users to `true` |
| `backend/database/migrations/2026_10_02_000001_add_profile_setup_skipped_to_users.php` | Adds `profile_setup_skipped` (bool, default false) |

### Frontend

| Path | Responsibility |
|------|----------------|
| `frontend/src/App.tsx` (lines ~122-262) | Central render gate for banner + modal; owns `skippedBannerDismissed` + `userSynced` state |
| `frontend/src/stores/authStore.ts` | Zustand store: `user`, `isAuthenticated`, `showProfileSetup`, `setShowProfileSetup`, `setUser` |
| `frontend/src/components/ProfileSkippedBanner.tsx` | Amber banner with "Complete now" + dismiss (X) buttons |
| `frontend/src/components/ProfileSetupModal.tsx` | Regular-user modal: name, email, rank, designation, unit assignment |
| `frontend/src/components/OfficeProfileSetupModal.tsx` | Office-station modal: email, phone, office type, description |
| `frontend/src/pages/Settings.tsx` (lines ~697, ~779) | Re-entry button when `user.profile_setup_skipped` |
| `frontend/src/pages/OfficeProfile.tsx` (line ~476) | Re-entry button when `user.profile_setup_skipped` |
| `frontend/src/pages/Users.tsx` (admin user table) | Displays Skipped / Complete / Pending badges (read-only, lines ~483, ~659) |
| `frontend/src/types/index.ts` (line 15) | `User.profile_setup_complete` type declaration |
| `frontend/src/services/api.ts` | Axios instance used by all mutations |

### API surface (authenticated, `auth:sanctum` + `force-password-change` middleware)

| Method | Path | Controller | Purpose |
|--------|------|------------|---------|
| `GET`  | `/auth/me` | `AuthController@me` | Returns `user` (with `office` loaded) — source of truth for flags |
| `PUT`  | `/auth/profile-setup` | `AuthController@completeProfileSetup` | Regular-user setup/skip |
| `PUT`  | `/auth/office-profile-setup` | `AuthController@completeOfficeProfileSetup` | Office-station setup/skip (403 if not `office_station`) |
| `PUT`  | `/auth/profile` | `AuthController@updateProfile` | General profile edit — **also clears** `profile_setup_skipped` |

---

## 3. Observed Requirements (EARS Format)

### 3.1 Data model

- **REQ-MDL-01**: The `users` table SHALL have a boolean column
  `profile_setup_complete` (default `false`) that indicates whether the user
  has completed or skipped profile setup.
- **REQ-MDL-02**: The `users` table SHALL have a boolean column
  `profile_setup_skipped` (default `false`) that indicates whether the user
  explicitly skipped the profile setup flow.
- **REQ-MDL-03**: Both columns SHALL be cast to `boolean` on the `User` Eloquent
  model and SHALL be included in the `$fillable` array so they can be mass-assigned
  by `update()`.

### 3.2 Backend — `completeProfileSetup` (`PUT /auth/profile-setup`)

- **REQ-CPS-01**: WHEN a regular (non-`office_station`) authenticated user sends
  `PUT /auth/profile-setup` WITHOUT `skip: true`, THEN the server SHALL update
  `first_name`, `last_name`, `middle_name`, `suffix`, `email`, `rank`,
  `designation`, `unit_assignment`, set `profile_setup_complete = true`,
  set `profile_setup_skipped = false`, and return the refreshed user object.
- **REQ-CPS-02**: WHEN the request includes `skip: true`, THEN validation SHALL
  only require `skip` to be a boolean and the other fields SHALL be optional;
  the server SHALL set `profile_setup_complete = true` and
  `profile_setup_skipped = true` without modifying the user's profile fields.
- **REQ-CPS-03**: WHEN the regular-user setup is completed (non-skip), THEN
  `email_verified_at` SHALL be set to `null` if the email was changed, forcing
  re-verification.
- **REQ-CPS-04**: WHEN the regular-user setup is completed (non-skip), THEN
  `unit_assignment` SHALL be resolved to an `office_id` via
  `PersonnelOfficeResolver` and the user's `office_id` updated, if the user is
  a super-admin or the field was supplied.
- **REQ-CPS-05**: The response payload for both paths SHALL be
  `{ "message": ..., "user": <User with office loaded> }`.

### 3.3 Backend — `completeOfficeProfileSetup` (`PUT /auth/office-profile-setup`)

- **REQ-COPS-01**: WHEN an `office_station` authenticated user sends
  `PUT /auth/office-profile-setup` WITHOUT `skip: true`, THEN the server SHALL
  update `email`, `phone`, set `profile_setup_complete = true`,
  `profile_setup_skipped = false`, set `email_verified_at` to `now()`
  (admin-provisioned email — no verification loop), and persist
  `office_type` / `description` onto the associated office record.
- **REQ-COPS-02**: WHEN the request includes `skip: true`, THEN the server
  SHALL set `profile_setup_complete = true` and `profile_setup_skipped = true`
  without modifying any profile fields.
- **REQ-COPS-03**: WHEN a non-`office_station` user calls this endpoint, THEN
  the server SHALL respond `403 Unauthorized`.

### 3.4 Backend — `updateProfile` (`PUT /auth/profile`)

- **REQ-UP-01**: WHEN an authenticated user updates their profile via
  `PUT /auth/profile` and the user's `profile_setup_skipped` is truthy, THEN
  the server SHALL set `profile_setup_skipped = false` (the act of editing the
  profile counts as completing a skipped setup).

### 3.5 Backend — `me` (`GET /auth/me`)

- **REQ-ME-01**: The `me` endpoint SHALL return the fully-loaded user object
  including `profile_setup_complete`, `profile_setup_skipped`,
  `email_verified_at`, `must_change_password`, `role`, and the loaded
  `office` relationship.
- **REQ-ME-02**: The user object returned by `/auth/me` SHALL be the source of
  truth for the setup flags on the frontend; any persisted localStorage
  snapshot SHALL be considered stale and refreshed on every app load.

### 3.6 Frontend store (`authStore`)

- **REQ-STORE-01**: The auth store SHALL persist `token`, `user`, and
  `isAuthenticated` to `localStorage` under the key `auth-storage`.
- **REQ-STORE-02**: The `showProfileSetup` flag SHALL be a transient,
  non-persisted boolean in the auth store; it SHALL NOT survive a page reload
  unless a UI condition drives it.
- **REQ-STORE-03**: The `login` action SHALL initialize `showProfileSetup` to
  `false`.
- **REQ-STORE-04**: The `logout` action SHALL set `showProfileSetup` to `false`,
  `user` to `null`, `token` to `null`, and `isAuthenticated` to `false`.
- **REQ-STORE-05**: The `setUser` action SHALL normalize the user avatar to a
  root-relative `/storage/...` path on assignment and on store rehydration.

### 3.7 Frontend — App shell render gating (App.tsx)

- **REQ-APP-01**: The application SHALL define `unlocked` as
  `isAuthenticated && !user?.must_change_password` (line 125).
- **REQ-APP-02**: `needsProfileSetup` SHALL be `true` when `unlocked`,
  `user` exists, AND `user.profile_setup_complete === false` (line 126).
- **REQ-APP-03**: `profileSetupSkipped` SHALL be `true` when `unlocked`,
  `user` exists, `user.profile_setup_complete === true`, AND
  `user.profile_setup_skipped === true` (line 130).

### 3.8 Frontend — User sync gate

- **REQ-SYNC-01**: WHEN the user is authenticated, THEN the App component SHALL
  fetch `GET /auth/me`, write the returned user to the auth store via
  `setUser`, and set `userSynced = true` only after the request settles
  (lines 148-160).
- **REQ-SYNC-02**: The profile modal and skipped banner SHALL NOT render until
  `userSynced === true` (lines 252, 258), ensuring server-side flag changes
  are reflected before any decision is made.

### 3.9 Frontend — Skipped banner (`ProfileSkippedBanner`)

- **REQ-BANNER-01**: The `ProfileSkippedBanner` SHALL be rendered WHEN:
  `unlocked` AND `profileSetupSkipped` AND NOT
  `skippedBannerDismissed` AND NOT `needsProfileSetup` AND
  NOT `onVerifyEmailPage` (line 252).
- **REQ-BANNER-02**: The banner's "Complete now" button SHALL call
  `setShowProfileSetup(true)` to open the appropriate profile setup modal
  (line 254).
- **REQ-BANNER-03**: The banner's dismiss (X) button SHALL set the
  `sessionStorage` key `profile-setup-banner-dismissed` to `"1"` and set
  `skippedBannerDismissed` to `true` (line 162-165).
- **REQ-BANNER-04**: The dismissal SHALL persist for the duration of the
  browser tab session (the sessionStorage key is never cleared).
- **REQ-BANNER-05**: WHEN `isAuthenticated` transitions to `false` (logout),
  THEN `skippedBannerDismissed` SHALL be re-read from `sessionStorage`
  (lines 137-143). **NOTE**: `sessionStorage` is NOT cleared on logout, so a
  dismissal in one login session within the same tab persists across
  re-login.

### 3.10 Frontend — Profile setup modal

- **REQ-MODAL-01**: WHEN `(needsProfileSetup OR showProfileSetup)` AND
  `userSynced` is true, THEN the profile modal SHALL render (line 258).
- **REQ-MODAL-02**: WHEN the authenticated user's role is `office_station`,
  THEN `OfficeProfileSetupModal` SHALL render; OTHERWISE
  `ProfileSetupModal` SHALL render (line 259).
- **REQ-MODAL-03**: WHEN `onVerifyEmailPage` (`/verify-email` route), THEN
  neither the modal NOR the banner SHALL render (guards on lines 252 and 258).
- **REQ-MODAL-04**: The `ProfileSetupModal` SHALL pre-fill form fields from
  the current `user` object and SHALL validate: first name, last name,
  email (regex), rank, designation, unit_assignment are required (lines 57-82).
- **REQ-MODAL-05**: The `ProfileSetupModal`'s "Complete Setup" button SHALL
  `PUT /auth/profile-setup`; on success it SHALL update the store via
  `setUser(res.data.user)`, show a toast, and call `onComplete()` which sets
  `showProfileSetup = false` (lines 45-55, 254).
- **REQ-MODAL-06**: The `ProfileSetupModal`'s "Skip for now" button SHALL
  call `mutation.mutate({ skip: true })` → `PUT /auth/profile-setup`,
  setting both `profile_setup_complete` and `profile_setup_skipped` to `true`
  (line 234).
- **REQ-MODAL-07**: The `OfficeProfileSetupModal` SHALL require only `email`
  (regex validated) and SHALL submit `PUT /auth/office-profile-setup`; on
  success it SHALL call `onComplete()` → `setShowProfileSetup(false)`.
- **REQ-MODAL-08**: The `OfficeProfileSetupModal`'s "Skip for now" button
  SHALL call `mutation.mutate({ skip: true })` →
  `PUT /auth/office-profile-setup`.
- **REQ-MODAL-09**: BOTH modals SHALL disable their submit/skip buttons while
  the mutation is pending (`mutation.isPending`).

### 3.11 Frontend — Re-entry points

- **REQ-REENTRY-01**: The Settings page SHALL render a "Complete Your Profile"
  button in the office-account card when `user.profile_setup_skipped` is truthy
  (line 697).
- **REQ-REENTRY-02**: The Settings page SHALL render a "Complete Setup"
  button in the identity header when `user.profile_setup_skipped` is truthy
  (line 779).
- **REQ-REENTRY-03**: The OfficeProfile page SHALL render a "Complete Your
  Profile" button in the Office Information card header when
  `user.profile_setup_skipped` is truthy (line 476).
- **REQ-REENTRY-04**: ALL re-entry buttons SHALL call `setShowProfileSetup(true)`
  (lines 700, 782, 479), which SHALL cause the `App` shell to render the
  appropriate modal on the next render cycle.

### 3.12 State reset on logout

- **REQ-RESET-01**: WHEN `isAuthenticated` becomes `false`, THEN the App
  component SHALL set `showProfileSetup = false` and reset
  `userSynced = false` (lines 137-143).

---

## 4. Non-Functional Observations

- **NF-01 (No cross-tab persistence for banner dismissal)**: Because
  `sessionStorage` is scoped per browser tab, dismissing the banner in one tab
  does not dismiss it in another tab open to the same origin.
- **NF-02 (Store persistence excludes UI flags)**: `showProfileSetup` is NOT
  in the `partialize` whitelist (authStore lines 166-170), so it defaults to
  `false` on every hard page load. The banner/modal only re-appears via
  server-derived conditions (`needsProfileSetup`) or explicit `setShowProfileSetup(true)`.
- **NF-03 (Client-side modal routing)**: The selection between
  `ProfileSetupModal` and `OfficeProfileSetupModal` is decided entirely on the
  frontend by checking `user.role === 'office_station'`. The backend enforces
  this only for the office-setup endpoint (403 guard); a regular user could
  submit to the office-setup endpoint if the frontend were bypassed.
- **NF-04 (Email verification interleaving)**: For non-office users who
  complete (not skip) setup and change their email, the system enters an
  email-verification gate (`needsEmailVerification`) that suppresses the
  profile banner/modal on the `/verify-email` page.
- **NF-05 (must_change_password gate)**: The setup modal/banner are gated behind
  `unlocked` (`!must_change_password`), meaning these protected routes
  (`auth:sanctum` + `force-password-change`) are unreachable until the
  password-change requirement is satisfied.

---

## 5. Inferred Acceptance Criteria

### 5.1 First login — regular user, no profile
1. User logs in with `must_change_password = true` → redirect to
   change-password flow; no banner/modal.
2. After password change, `GET /auth/me` returns `profile_setup_complete = false`.
3. App renders `ProfileSetupModal` (role ≠ `office_station`).
4. User completes the form → `PUT /auth/profile-setup` → flags set to
   `complete=true, skipped=false` → modal closes → banner does not appear.
5. If email changed → `email_verified_at = null` → `EmailVerificationModal`
   appears instead.

### 5.2 First login — office station
1. After password change, `GET /auth/me` returns
   `profile_setup_complete = false, role = office_station`.
2. App renders `OfficeProfileSetupModal`.
3. User completes → `PUT /auth/office-profile-setup` →
   `complete=true, skipped=false, email_verified_at = now()` → modal closes.

### 5.3 User skips setup
1. User clicks "Skip for now" → `PUT /auth/profile-setup { skip: true }`
   → `complete=true, skipped=true`.
2. `setUser()` updates store; `onComplete()` sets `showProfileSetup = false`.
3. Because `profileSetupSkipped` is now true, `ProfileSkippedBanner` renders
   (unless already dismissed in this tab session).
4. Banner "Complete now" → `setShowProfileSetup(true)` → modal reopens.
5. Banner X → `sessionStorage['profile-setup-banner-dismissed'] = '1'` → banner hidden
   for the rest of the tab session.

### 5.4 Re-opening from Settings / OfficeProfile page
1. Navigate to `/settings` (non-office view) or `/office-profile`.
2. If `user.profile_setup_skipped` is truthy, a "Complete Setup" /
   "Complete Your Profile" button is visible.
3. Clicking it → `setShowProfileSetup(true)` → `App` renders the modal.
4. Completing the setup clears `profile_setup_skipped` (via the backend
   response + `setUser`), so the button disappears on next render.

### 5.5 Dismissal behavior verification
- Dismissing the banner sets a sessionStorage key; refreshing the page within
  the same tab does NOT re-show the banner.
- Closing and reopening the browser tab (new session) re-shows the banner if
  the user still has `profile_setup_skipped = true`.
- Logging out and back in within the same tab does NOT re-show the banner
  (sessionStorage is preserved; see REQ-RESET-01 / §3.9.5).

---

## 6. Uncertainties and Questions

1. **SessionStorage persistence across re-login**:
   The `useEffect` on `isAuthenticated === false` re-reads
   `sessionStorage['profile-setup-banner-dismissed']` but does **not** clear it.
   This means a user who dismisses the banner, logs out, and logs back in
   within the same browser tab will **not** see the banner again — even though
   the banner title says "Dismiss for this session." Is this intentional, or
   should logout clear the sessionStorage key so the banner re-appears on a
   fresh login?

2. **`updateProfile` clearing `profile_setup_skipped` without setting
   `profile_setup_complete`**: The regular-profile update endpoint (PUT
   /auth/profile) clears the skipped flag but never sets `profile_setup_complete
   = true` (it was already `true` from the skip). This means a user who
   skipped setup can subsequently edit their profile in Settings, which silently
   removes the banner without them ever completing the structured setup form.
   Is this an acceptable "loophole," or should the profile edit page also
   enforce completion of the structured setup fields?

3. **`ProfileSkippedBanner` dismissal scope**: The banner's dismiss button
   tooltip reads "Dismiss for this session," but sessionStorage survives page
   reloads (true per-tab session). It only resets across a full tab close /
   browser restart. Is "session" intended to mean browser-tab session, or
   should it be shorter (e.g., in-memory only via React state)?

4. **Frontend-only role branching for modal selection**:
   The decision to show `OfficeProfileSetupModal` vs `ProfileSetupModal` relies
   solely on `user.role === 'office_station'` in App.tsx (line 259). The backend
   `completeProfileSetup` has no role guard. If a non-office user manually
   triggers `showProfileSetup` and their role is mis-synced, they'd see the
   regular modal but could also (if frontend were tampered) submit to either
   endpoint. Should the role check be mirrored server-side for
   `completeProfileSetup` as well?

5. **`userSynced` initial value**: `userSynced` initializes to `false` and is
   set `true` only after `GET /auth/me` resolves. During that window, the
   modal/banner are suppressed. If the API call fails (network error), the
   modal will never render even if `profile_setup_complete === false` in the
   persisted store. Is there a timeout or error-recovery path, or is silent
   suppression acceptable?

6. **OfficeProfile page save does not clear skipped flag**:
   `PUT /my-office` (`updateMyOffice`) in `OfficeController` updates office
   details (name, email, unit_code, etc.) but does **not** touch
   `profile_setup_complete` or `profile_setup_skipped`. Saving the office
   profile via this page therefore does NOT resolve a skipped status — the
   banner/button would persist. Is this intentional (office setup is only
   resolved via the dedicated modal), or should saving the office profile also
   clear the skipped flag?

7. **`onVerifyEmailPage` guard**: The banner and modal are suppressed on the
   `/verify-email` route. But `showProfileSetup` (driven by re-entry buttons)
   has no `onVerifyEmailPage` guard — if a skipped user navigates to
   `/verify-email` while `showProfileSetup` is true, the modal could still
   render. (In practice, verification only applies to non-skipped, non-office
   users, so this overlap is unlikely, but it is an unguarded path.)

---

## 7. Recommendations

1. **Centralize the dismissal-reset logic**: Consider clearing
   `sessionStorage['profile-setup-banner-dismissed']` on logout in the
   `logout()` action of the auth store (or in the App `useEffect` when
   `!isAuthenticated`). This makes the "Dismiss for this session" tooltip
   honest and prevents the banner from permanently hiding across re-logins
   in the same tab.

2. **Mirror the role guard server-side**: Add a role check in
   `completeProfileSetup` for non-`office_station` users (and keep the
   office guard in `completeOfficeProfileSetup`), so the role-based modal
   dispatch is enforced at the API layer, not just the UI layer.

3. **Add an API error path for `userSynced`**: If `GET /auth/me` fails in
   App.tsx, consider a fallback (e.g., set `userSynced = true` after a
   timeout, or show a retry banner) so the user is never silently blocked
   from completing setup.

4. **Document the `updateProfile` → clears-skipped side effect**: This
   behavior (editing profile in Settings clears the skipped banner) is
   non-obvious. Add a code comment or consider unifying it through the
   dedicated `/auth/profile-setup` (non-skip) endpoint instead.

5. **Clarify the relationship between `my-office` save and setup state**:
   Decide whether `PUT /my-office` should also resolve the skipped state
   for office accounts, or whether the dedicated
   `OfficeProfileSetupModal` should remain the sole path. The current split
   (office info editable in two places with different flag effects) is a
   potential source of confusion.

6. **Consider elevating `showProfileSetup` to a persisted store field if
   cross-reload re-opening is desired**: Currently a hard refresh resets it
   to `false`. If the intent is that a re-entry click from Settings should
   survive a refresh, persist it (with care to avoid leaking across users).
   The current design (non-persisted) is arguably safer and likely
   intentional — this is noted for awareness only.
