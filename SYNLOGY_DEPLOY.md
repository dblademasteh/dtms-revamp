# Synology NAS Deployment Guide (DTS)

Deploying the DTS (Document Tracking System) to a Synology NAS via Docker Compose
in **Container Manager**. The stack runs entirely on the NAS and is served publicly
through a Cloudflare tunnel.

- **Repo**: `https://github.com/dblademasteh/dtms-revamp.git` (branch `master`)
- **NAS path**: `/volume1/docker/dts`
- **Compose file**: `docker-compose.synology.yml`

## Prerequisites

1. Synology NAS running DSM 7.x with **Container Manager** installed.
2. A `docker` shared folder at `/volume1/docker`.
3. SSH access enabled (Control Panel → Terminal & SNMP).
4. A user in the `docker` group (or use `sudo` for every docker command).
5. GitHub access from the NAS (or deploy from your machine via `deploy-synology.sh`).

## 1. First-time setup

### Clone the repository

```bash
ssh bfpr2@YOUR_NAS_IP
sudo -i
cd /volume1/docker
git clone https://github.com/dblademasteh/dtms-revamp.git dts
cd dts
```

### Environment files

Two `.env` files are needed:

1. **Root `.env`** (compose + app variables) — copy from the template:

   ```bash
   cp .env.synology .env
   vi .env
   ```

   Critical values:

   | Variable | What to set |
   |---|---|
   | `APP_URL` | Public URL, e.g. `https://dtms.devbry.online` |
   | `FRONTEND_URL` | Same public URL |
   | `DB_PASSWORD` | A strong password of your choice |
   | `MEILISEARCH_KEY` | A strong key of your choice |
   | `SANCTUM_STATEFUL_DOMAINS` | Your domain, e.g. `dtms.devbry.online` |
   | `SESSION_DOMAIN` | Your domain (or leave empty for a host-only cookie) |
   | `CLOUDFLARE_TUNNEL_TOKEN` | Your Cloudflare tunnel token (required for public access) |
   | `SESSION_SECURE_COOKIE` | `true` behind HTTPS, `false` for plain-HTTP LAN access |
   | `DB_BACKUP_RETENTION` | How many nightly backups to keep (default `14`) |
   | `FRONTEND_PORT` / `BACKEND_PORT` | Only change if 80/8000 are taken |

2. **Backend `.env`** (APP_KEY persistence) — must exist or compose refuses to start.
   It can be empty; the backend generates and persists `APP_KEY` on first boot:

   ```bash
   mkdir -p /volume1/docker/dts/backend/storage
   touch /volume1/docker/dts/backend/.env
   ```

   > Do **not** add an empty `APP_KEY=` line — the entrypoint only generates the key
   > when the file has no `APP_KEY=` line.

## 2. Start the stack

The canonical deploy (pull → build → start, in that order):

```bash
cd /volume1/docker/dts
git pull --ff-only
sudo docker compose -f docker-compose.synology.yml build
sudo docker compose -f docker-compose.synology.yml up -d
```

> **Important**: use a bare `up -d` (no service list). Enumerating services
> (e.g. `up -d backend frontend ...`) can tear down `cloudflared` and leave the
> tunnel down.
>
> Migrations run automatically on backend boot (entrypoint). On a brand-new
> install, seed default data once:
> `sudo docker compose -f docker-compose.synology.yml exec backend php artisan db:seed --force`

### One-liner from your machine

For routine updates you can run the included deploy script from your workstation.
It SSHes into the NAS, pulls, builds, starts, waits for health, and migrates:

```bash
./deploy-synology.sh                       # defaults: bfpr2.tw4.quickconnect.to, /volume1/docker/dts, bfpr2
./deploy-synology.sh 192.168.1.10 /volume1/docker/dts bfpr2
SEED=1 ./deploy-synology.sh                # seed on a fresh install
```

## 3. After every deploy: clear the Cloudflare cache

Cloudflare caches `index.html`, so a new frontend build will not appear until the
cache is purged. In the Cloudflare dashboard:

1. **Caching → Purge Everything** (or purge `https://your-domain/` and `https://your-domain/index.html`).
2. **Caching → Configuration → Cache Rules**: add a rule for `your-domain.com/index.html`
   with **Bypass cache**, so future deploys show immediately.

If the site still shows the old build after purging, hard-refresh (Ctrl+Shift+R) once.

## 4. Services and ports

| Service | Image | Host port | Purpose |
|---|---|---|---|
| `frontend` | `dts-frontend:latest` (built) | `${FRONTEND_PORT:-80}` | Nginx + built SPA |
| `backend` | `dts-backend:latest` (built) | `${BACKEND_PORT:-8000}` | Laravel API (health `/api/health`) |
| `postgres` | `postgres:16-alpine` | — | Database (`dts_database`) |
| `redis` | `redis:7-alpine` | — | Sessions/cache/queues |
| `meilisearch` | `getmeili/meilisearch:v1.10` | — | Full-text search |
| `cloudflared` | `cloudflare/cloudflared:latest` | — | Public HTTPS tunnel |

`backend/storage` is bind-mounted to `/volume1/docker/dts/backend/storage`, so DB
backups and uploads persist on the NAS.

## 5. Database backups (built-in)

The app has a built-in backup/restore tool (no manual `pg_dump` needed):

- **UI**: Settings → Database → **Create Backup**, plus Download / Restore / Delete.
- **Nightly**: a `db:backup` schedule runs at **03:00 Asia/Manila**; old backups are
  pruned automatically to `DB_BACKUP_RETENTION` (default 14).
- **Location**: `storage/app/backups/` → `/volume1/docker/dts/backend/storage/app/backups/`
  on the NAS.

Manual backup from the command line:

```bash
sudo docker compose -f docker-compose.synology.yml exec backend php artisan db:backup
```

Verify the file landed on the NAS:

```bash
ls -lh /volume1/docker/dts/backend/storage/app/backups/
```

> Restore is destructive (it drops and re-imports); the UI asks for confirmation.
> The NAS keeps the files locally — copy the folder off-box (e.g. Hyper Backup) if
> you want off-site redundancy.

## 6. Access

- **LAN**: `http://YOUR_NAS_IP:${FRONTEND_PORT}` (default `http://YOUR_NAS_IP:80`)
- **API**: `http://YOUR_NAS_IP:${BACKEND_PORT}/api`
- **Public**: `https://your-domain.com` (Cloudflare tunnel → `http://localhost:80`)

Default accounts (seed):

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@dts.gov.ph` | `password` |
| Encoder | `encoder@dts.gov.ph` | `password` |
| Approver | `approver@dts.gov.ph` | `password` |
| HR Head | `hrhead@dts.gov.ph` | `password` |

## 7. Common tasks

```bash
cd /volume1/docker/dts
CF="docker compose -f docker-compose.synology.yml"

# Status / logs
$CF ps
$CF logs -f --tail 100
$CF logs -f backend

# Rebuild after code changes (same as canonical deploy)
git pull --ff-only && sudo $CF build && sudo $CF up -d

# Restart everything
sudo $CF restart

# Tinker (PHP REPL)
$CF exec backend php artisan tinker

# Run a backup manually
$CF exec backend php artisan db:backup
```

Environment-variable changes in `.env` require recreating the affected container:

```bash
sudo $CF up -d --force-recreate backend
```

## 8. Custom domain / HTTPS

The public path is a Cloudflare **tunnel** (token-based). In Cloudflare Zero Trust,
the tunnel's Public Hostname must route to `http://localhost:80`. The frontend nginx
proxies `/api` and `/app` (websocket) to the backend automatically.

If you instead use a Synology reverse proxy or direct port:

| Field | Value |
|---|---|
| Source | `http://YOUR_NAS_IP` (or `https://` with a certificate) |
| Destination | `http://localhost:${FRONTEND_PORT:-80}` |

Then set `APP_URL`, `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN` to
the public hostname and recreate the backend container.

## 9. Troubleshooting

### Stale frontend after deploy
Cloudflare is serving a cached `index.html`. Purge Everything + add the `/index.html`
bypass rule (see section 3).

### "Couldn't find env file"
`backend/.env` is missing. Recreate it (empty is fine) and restart:

```bash
mkdir -p /volume1/docker/dts/backend/storage
touch /volume1/docker/dts/backend/.env
sudo docker compose -f docker-compose.synology.yml up -d
```

### Backend 500 / "No application encryption key"
An empty `APP_KEY=` line exists in `backend/.env`. Remove it and recreate:

```bash
sed -i '/^APP_KEY=/d' /volume1/docker/dts/backend/.env
sudo docker compose -f docker-compose.synology.yml up -d --force-recreate backend
```

### Login fails / sessions don't persist
`SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `APP_URL` and `FRONTEND_URL` must match
the hostname you browse with. `SESSION_SECURE_COOKIE=true` for HTTPS, `false` for LAN
HTTP — then recreate the backend.

### Port already in use
Set `FRONTEND_PORT` / `BACKEND_PORT` in `.env` to free ports, then `up -d --force-recreate`.

### Tunnel not working
- Confirm `CLOUDFLARE_TUNNEL_TOKEN` is set in `.env` (token tunnels do **not** use `--url`).
- Verify the tunnel Public Hostname → `http://localhost:80` in Cloudflare Zero Trust.
- Check logs: `sudo docker compose -f docker-compose.synology.yml logs cloudflared`.
- Make sure you did not run `up -d <service-list>` (this can remove `cloudflared`).

### Health-check failures
```bash
sudo docker compose -f docker-compose.synology.yml logs postgres
sudo docker compose -f docker-compose.synology.yml logs redis
ls -la /volume1/docker/dts/postgres/data
```
