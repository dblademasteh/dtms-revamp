# Deploy DTMS to Hostinger VPS with CloudPanel

Docker Compose stack behind CloudPanel Nginx. CloudPanel terminates SSL
and reverse-proxies to the frontend container on loopback; the frontend
proxies `/api`, `/app`, `/broadcasting`, `/storage` to the backend
inside the compose network.

```
Internet -> CloudPanel Nginx (:80/:443, Let's Encrypt)
         -> http://127.0.0.1:8080 (frontend nginx)
         -> http://backend:8000 (/api, /app ws, /broadcasting, /storage)
Postgres / Redis / Meilisearch: compose network only, no host ports.
```

Files:

| File | Purpose |
|---|---|
| `docker-compose.cloudpanel.yml` | Production stack for this setup (no cloudflared, loopback-only frontend port) |
| `.env.cloudpanel` | Template — copy to `.env` and fill in |
| `deploy-cloudpanel.sh` | Runs on the VPS: pull, build, up, migrate, optional seed |

## 0. Size the VPS

Minimum: **2 vCPU / 4 GB RAM / 40 GB disk** (KVM2 or higher). The stack runs
PHP-FPM + Nginx, Postgres 16, Redis 7, Meilisearch, plus a Node build step.
1 GB RAM instances will OOM during `npm run build` / composer install.

## 1. One-time VPS setup

1. Provision Hostinger VPS with **Ubuntu 24.04 + CloudPanel** (or install
   CloudPanel per its docs), then SSH in.
2. Install Docker (official method, dynamic codename — the hardcoded
   `jammy` apt line breaks on 24.04):
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   docker compose version
   ```
3. DNS: create an `A` record for your domain (e.g. `dtms.example.com`)
   pointing at the VPS IP. Verify: `dig +short dtms.example.com`.
4. CloudPanel: **Sites → Add Site → Create a Reverse Proxy**
   - Domain: your domain
   - Reverse Proxy URL: `http://127.0.0.1:8080`
5. CloudPanel: **Sites → your site → SSL/TLS → Let's Encrypt** → issue cert.
   Force HTTPS on.
6. Firewall: keep CloudPanel defaults (22, 80, 443, 8443). Do **not** open
   8080/8000/5432/6379/7700 publicly — the app ports stay on loopback.

> CloudPanel runs its own Redis on 6379. That is fine: our Redis stays
> inside the compose network and is never mapped to the host.

## 2. First deploy

```bash
# on the VPS
git clone <your-repo-url> /opt/dtms-revamp
cd /opt/dtms-revamp

cp .env.cloudpanel .env
nano .env   # replace EVERY REPLACE_WITH_* (domain, DB/MEILI/Reverb secrets, Gmail)

mkdir -p /opt/dtms/backend && touch /opt/dtms/backend/.env
chmod +x deploy-cloudpanel.sh

# First install: migrate + seed (BFP Region 2 offices + superadmin)
SEED=1 ./deploy-cloudpanel.sh
```

Generate strong secrets with:

```bash
openssl rand -base64 32   # DB_PASSWORD / MEILISEARCH_KEY / REVERB keys
```

Key `.env` values (single-domain setup):

```
APP_URL=https://dtms.example.com
FRONTEND_URL=https://dtms.example.com
SESSION_DOMAIN=dtms.example.com
SANCTUM_STATEFUL_DOMAINS=dtms.example.com
SESSION_SECURE_COOKIE=true
FRONTEND_PORT=8080
```

Superadmin after seed: `dcitmbfpro02@gmail.com` / `@dmiN123`
(change it immediately; the account has `must_change_password=false`).

## 3. CloudPanel vhost tweaks

Default reverse-proxy vhost works, but add WebSocket + upload support
(Reverb live updates, 100 MB uploads). In CloudPanel go to
**Sites → your site → Vhost Editor** and make sure the `location /` block
looks like this:

```nginx
location / {
  proxy_pass http://127.0.0.1:8080;
  proxy_http_version 1.1;
  proxy_set_header X-Forwarded-Host $host;
  proxy_set_header X-Forwarded-Server $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Host $http_host;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
  proxy_pass_request_headers on;
  proxy_max_temp_file_size 0;
  client_max_body_size 100M;
  proxy_connect_timeout 900;
  proxy_send_timeout 900;
  proxy_read_timeout 900;
}
```

Then restart Nginx (Admin → Services → Nginx → Restart).

## 4. Verify

```bash
cd /opt/dtms-revamp
export COMPOSE_FILE=docker-compose.cloudpanel.yml
docker compose ps
curl -fsS http://127.0.0.1:8080/up              # via frontend
docker compose exec -T backend curl -fsS http://localhost:8000/api/health
```

From your browser: `https://your-domain/` → login page,
`https://your-domain/api/health` → `{"status":"ok"}`.

## 5. Updates

```bash
cd /opt/dtms-revamp
./deploy-cloudpanel.sh            # pull + rebuild + migrate, no reseed
```

Never run `SEED=1` on an existing install (it re-runs all seeders).
`docker compose down` keeps data (binds under `/opt/dtms`);
`docker compose down -v` does not apply here (no named volumes) — data
loss only happens if you delete `/opt/dtms`.

## 6. Backups

- App DB dumps: built-in `php artisan db:backup` runs nightly at 03:00
  Asia/Manila (retention `DB_BACKUP_RETENTION`, managed in-app via
  Settings → Database). Files land under `/opt/dtms/backend/storage`.
- Filesystem: back up `/opt/dtms` (postgres/redis/meili data + uploads)
  with a host-level snapshot/rsync — CloudPanel site backups do **not**
  cover `/opt/dtms`.
- Before upgrades: `docker compose exec -T backend php artisan db:backup`.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| 502 from CloudPanel | Frontend not on 127.0.0.1:8080? `docker compose ps`, `docker compose logs frontend`; port in CloudPanel site must match `FRONTEND_PORT` |
| Login loops / session drops | `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `APP_URL`, `FRONTEND_URL` must all match the public domain; keep `SESSION_SECURE_COOKIE=true` behind HTTPS |
| Mixed-content / http URLs | `TRUSTED_PROXIES` default covers Docker + loopback; don't unset it when behind CloudPanel |
| Live updates dead (Reverb) | Vhost missing `Upgrade`/`Connection` headers (see §3); keep `VITE_REVERB_HOST/PORT` empty for same-origin |
| `curl localhost:8000` → 000 | Backend has no published ports by design; check from inside: `docker compose exec backend curl localhost:8000/api/health` |
| `No application encryption key` | `rm` the `APP_KEY=` line from `/opt/dtms/backend/.env` and recreate backend container (key regenerates) |
| Port conflict on 6379 | You mapped something to host 6379 — don't. Compose Redis is internal-only; CloudPanel owns host 6379 |
| Old frontend after deploy | Hard-refresh; frontend `index.html` is `no-cache`, hashed assets are immutable — no Cloudflare purge needed here |

## 8. How this differs from the Synology setup

- No `cloudflared` service (CloudPanel does SSL + public ingress).
- Frontend binds `127.0.0.1:8080`, not `:80`; backend publishes nothing.
- Data default is `/opt/dtms` instead of `/volume1/docker/dts`.
- Same images, same healthchecks (`/api/health`), same entrypoint behavior
  (APP_KEY generation, `migrate --force`, `storage:link`).
