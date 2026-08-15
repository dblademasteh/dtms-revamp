# DTMS Deployment Troubleshooting

Recurring issues for the Synology NAS deployment behind a Cloudflare tunnel (`dts-synology` → `dtms.devbry.online`). Work from the NAS terminal unless noted.

---

## 1. Site is down — 530 / "network is unreachable"

**Check first:**
```bash
cd /volume1/docker/dts-project
sudo docker compose -f docker-compose.synology.yml ps
sudo docker compose -f docker-compose.synology.yml logs --tail 20 cloudflared
```

### A. Logs show connection errors, tunnel never registers
Errors like `network is unreachable`, `dial tcp ... i/o timeout`, or QUIC/UDP failures mean the **NAS cannot reach the Cloudflare edge**. Often the router/synology blocks UDP 7844 or drops long-lived TCP.

**Fixes (already applied, verify they stuck in `docker-compose.synology.yml`):**
- `command` must include `--protocol http2` (bypasses UDP/QUIC entirely).
- cloudflared must run as a **standalone container on the bridge network** (no `network_mode: service:frontend`) so rebuilds of the app never break it.
- Restart it: `sudo docker compose -f docker-compose.synology.yml up -d cloudflared`
- If it keeps failing: check the NAS's internet/firewall, or move the tunnel to an always-on machine (VPS/cloudflared on another box).

### B. Logs show `Invalid tunnel secret` / `Unauthorized` / 401
The tunnel token was revoked (it was pasted in chat once — rotate it then).

**Rotate token** (on the Windows PC):
```powershell
cloudflared.exe tunnel token dts-synology
```
Put the new token in `/volume1/docker/dts-project/.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`, then:
```bash
sudo docker compose -f docker-compose.synology.yml up -d cloudflared
```

### C. Logs show graceful shutdown / SIGTERM right after a deploy
`Initiating graceful shutdown due to signal terminated` → cloudflared was **killed when the compose network was recreated during a partial `up -d backend frontend`** and never restarted.

**Fix now:**
```bash
sudo docker compose -f docker-compose.synology.yml up -d cloudflared
```

**Fix permanently:** always deploy with a bare `up -d` (no service list) so compose restarts *every* service. See section 6.

### Verify
```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://dtms.devbry.online
```
Expect `200`.

---

## 2. Tunnel is connected but pages return 502/504

- cloudflared is up (section 1) but can't reach the app. The **dashboard public hostname in Cloudflare must point to `http://frontend:80`** (it was once `http://localhost:80`, which breaks a standalone cloudflared container).
- Check the app containers are up and healthy:
  ```bash
  sudo docker compose -f docker-compose.synology.yml ps
  sudo docker compose -f docker-compose.synology.yml logs --tail 20 frontend backend
  ```

---

## 3. "Did a deploy wipe my data?"

**No.** Postgres uses a bind mount at `$DOCKER_BASE_PATH/postgres/data`. `build` and `up -d` never touch it. Data is only destroyed by `down -v` or `docker volume rm`. Never run those unless you mean it.

---

## 4. Deployed new code but the UI looks old / "it didn't update"

Two caches, both must be cleared:

1. **Service worker (browser)**
   - DevTools → Application → Service Workers → **Unregister** → Clear site data.
   - Then hard reload (Ctrl+Shift+R).
2. **Cloudflare edge**
   - The edge was caught serving a stale `index.html` (new builds change the hashed asset name, so `index.html` is the only stale file).
   - Cloudflare Dashboard → Caching → Configuration → **Purge Everything**.
   - Add a Cache Rule to stop it recurring: rule matching `URI Path equals /index.html` → **Bypass cache**.
3. **Verify what's actually live** (bundle hash changes per build):
   ```bash
   curl -s https://dtms.devbry.online/ | Select-String "index-"
   ```

---

## 5. Slow loading / slow dashboard

Symptom split — verify each layer:

### a. Compression (already on)
```bash
curl -sI -H "Accept-Encoding: gzip" https://dtms.devbry.online/assets/index-*.js
```
Expect `content-encoding: gzip`. If missing, check `frontend/nginx.conf`.

### b. Round trips (already reduced)
The dashboard now loads in **1 API call** (`/reports/dashboard` returns stats + volume + announcements inline — was 3 calls). Each tunnel round-trip costs ~400-500 ms, so per-request latency through the tunnel is the dominant cost, not PHP compute.

### c. Backend queries
- `/api/health` public time: `curl -s -o /dev/null -w "%{time_total}s\n" https://dtms.devbry.online/api/health`
- Compare backend direct: `curl -s -o /dev/null -w "%{time_total}s\n" http://localhost:8000/api/health` (run on the NAS). Big gap = tunnel RTT.
- Check table growth: `docker compose -f docker-compose.synology.yml exec -T backend php artisan tinker --execute="echo \App\Models\Document::count();"`
- Confirm indexes applied: `docker compose -f docker-compose.synology.yml exec -T backend php artisan migrate:status`
  - Expected migration `2026_08_15_000001_add_dashboard_indexes_to_documents` → Ran.
  - Indexes: `current_office_id`, `originator_id`, `due_at`, `released_at`, `is_public`, composite `(status, due_at)`.

### d. Non-admin users still slow with huge tables (known limit)
`scopeVisibleTo` filters via `orWhereJsonContains` on `cc_list`/`bcc_list`, which Postgres cannot index normally. If a non-admin dashboard is slow after indexes, add **GIN indexes**:
```php
Schema::table('documents', function (Blueprint $table) {
    $table->rawIndex("('cc_list' jsonb) gin, ('bcc_list' jsonb) gin", 'documents_cc_bcc_gin');
});
```

---

## 6. Canonical deploy procedure (use this every time)

```bash
cd /volume1/docker/dts-project
git pull --ff-only
sudo docker compose -f docker-compose.synology.yml build
sudo docker compose -f docker-compose.synology.yml up -d
```

- **`up -d` with NO service list** — critical. Listing services (e.g. `up -d backend frontend`) recreates the network and kills cloudflared without restarting it.
- Migrations auto-run on backend container start (`backend/entrypoint.sh` runs `php artisan migrate --force`), so nothing extra needed after a pull.
- Verify: tunnel up (`curl ... /api/health`), site 200, bundle hash changed if frontend code changed.

---

## Quick reference

| Symptom | Cause | Fix |
|---|---|---|
| 530, `network is unreachable` | NAS → Cloudflare edge blocked | restart cloudflared, check firewall, or move tunnel to VPS |
| `Invalid tunnel secret` | token revoked | re-extract with `cloudflared.exe tunnel token dts-synology`, update `.env` |
| 530 right after deploy | `up -d <service>` recreated network, killed tunnel | `up -d cloudflared`; use bare `up -d` |
| 502/504, tunnel up | ingress points at `localhost:80` | Cloudflare dashboard → `http://frontend:80` |
| UI won't update | service worker + Cloudflare edge cache | unregister SW, Purge Everything, cache rule for `/index.html` |
| Slow load | tunnel RTT per request | dashboard = 1 API call (done); check gzip, indexes, `/api/health` |
| Slow for non-admins, big DB | JSON `cc_list`/`bcc_list` unindexable | add GIN indexes (section 5d) |
