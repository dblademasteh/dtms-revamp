# Developer Workflow — DTMS (Local Dev + Production Deploy)

Two workflows, one source tree (`git@github.com:dblademasteh/dtms-revamp.git`):

1. **Local dev** — edit code, test against a live backend, no CloudPanel.
2. **Production deploy** — push to GitHub, then one command on the Hostinger VPS updates everything.

---

## 1. Local development

### 1.1 Stack already running

The current repo is running via `docker-compose.yml` (local), which is
distinct from the production `docker-compose.cloudpanel.yml`.

| Service | Image / role | Local port | Notes |
|---|---|---|---|
| `backend` | PHP-FPM 8.4-alpine + nginx, Laravel | `8000` | `php artisan serve` alternative below |
| `frontend` | Vite build served by **nginx** (prod image) | `3000` | **Not** the Vite HMR server — see 1.2 for HMR |
| `postgres` | PostgreSQL 16 | — (internal) | shared data volume |
| `redis` | Redis 7 | — (internal) | healthchecked |
| `meilisearch` | Meilisearch v1.10 | `7700` | exposed for local use |

Quick sanity check:

```bash
curl -fsS http://localhost:8000/api/health        # {"status":"ok"}
curl -fsS http://localhost:3000  | head -n <title>   # "DTMS - Document Tracking..."
```

### 1.2 Option A — Vite HMR (real hot reload, port 3001)

The compose stack above serves the **built** frontend (no hot reload).
For actual editing of React components, run Vite instead:

```bash
# Terminal 1 — backend (choose one)
docker compose up -d backend           # API only, port 8000 stays up
# or, native PHP (no Docker):
cp backend/.env.example backend/.env
php -r "echo str_repeat('x',32);" | xargs -I{} php -r "copy('.env','backend/.env');" # placeholder; edit file
#   -> set DB_CONNECTION=sqlite, DB_DATABASE=/abs/path/database.sqlite
php artisan serve                        # http://127.0.0.1:8000
```

```bash
# Terminal 2 — Vite dev server (proxies /api -> :8000)
npm --prefix frontend install
npm --prefix frontend run dev            # http://localhost:3001
```

`frontend/vite.config.ts` is preconfigured to proxy `/api`,
`/storage`, `/broadcasting`, and `/app` (WebSocket) to
`http://127.0.0.1:8000`. The browser connects to Vite; Vite connects to
the backend; CORS is satisfied because `FRONTEND_URL=http://localhost:3001`
is in the backend `.env`.

> The compose `frontend` nginx (port 3000) and the Vite server (3001) can
> run at the same time — they are different containers/ports.

### 1.3 Option B — Full compose stack (prod parity, no HMR)

```bash
docker compose up -d --build            # backend:8000 + nginx-frontend:3000 + db + redis + meili
```

Good for testing the built output but changes require a rebuild
(`docker compose up -d --build frontend`).

### 1.4 Database (local)

- Default `backend/.env.example` uses PostgreSQL. Create the DB locally:
  ```sql
  CREATE DATABASE dts_database;
  CREATE USER dts_user WITH PASSWORD 'dts_password' SUPERUSER;
  ```
- Or switch to SQLite (fastest for solo dev): set in `backend/.env`
  ```
  DB_CONNECTION=sqlite
  DB_DATABASE=/c/Users/EngrFire/Desktop/dtms-revamp/backend/database/database.sqlite
  ```
  then `touch backend/database/database.sqlite`.

### 1.5 First run after clone

```bash
cd backend
composer install            # or: docker compose run --rm composer install
php artisan key:generate
php artisan migrate:fresh --seed   # BFP Region 2 data + superadmin
# superadmin: dcitmbfpro02@gmail.com / @dmiN123
```

### 1.6 Useful dev commands

```bash
php artisan tinker                      # REPL
php artisan migrate:fresh --seed        # refresh DB
php artisan test                        # PHPUnit
npm --prefix frontend exec eslint . --max-warnings 0   # lint
```

---

## 2. Production deploy (Hostinger VPS)

### 2.1 One-time setup (already done on this VPS)

- VPS: `76.13.187.170` (Ubuntu 24.04 + CloudPanel 6.0.8)
- SSH key (`~/.ssh/id_ed25519`) is in root's `authorized_keys`
- Code checkout: `/opt/dtms-revamp` (git remote → GitHub)
- Secrets in `/opt/dtms-revamp/.env` (APP_KEY auto-generated, not committed)
- CloudPanel reverse-proxy site: `dtms.bfpr2.online` → `http://127.0.0.1:8080`
- Let's Encrypt cert issued and installed by CloudPanel (valid, auto-renewing)

The full manual runbook lives in [`CLOUDPANEL_DEPLOY.md`](./CLOUDPANEL_DEPLOY.md).

### 2.2 Updating production (the normal loop)

```bash
# 1. local: edit + commit + push
git add -A && git commit -m "feature: ..." && git push origin master

# 2. on the VPS
ssh root@76.13.187.170
cd /opt/dtms-revamp
./deploy-cloudpanel.sh      # git pull -> build -> up -> wait-healthy -> migrate
# SEED=1 ./deploy-cloudpanel.sh   # ONLY on first install / empty DB
```

What the script does (6 steps):

1. `git pull --ff-only`
2. validate `.env` (no leftover `REPLACE_WITH_`)
3. `docker compose build`
4. `docker compose up -d --build`
5. wait up to 5 min for `/api/health`
6. `php artisan migrate --force`; optionally `--seed`

`up -d` recreates only the `backend` + `frontend` containers. Postgres +
Redis + Meilisearch keep running (named compose volumes, bind-mounted data
under `/opt/dtms`). Result: **zero-downtime** redeploy (old container stays
up until the new one passes the healthcheck).

### 2.3 Example — apply a fix to production right now

```bash
# (from this repo)
git add -A && git commit -m "fix: ... " && git push origin master

ssh root@76.13.187.170
cd /opt/dtms-revamp && ./deploy-cloudpanel.sh
```

Then verify:

```bash
curl -fsS https://dtms.bfpr2.online/up
curl -fsS https://dtms.bfpr2.online/api/health        # {"status":"ok"}
```

### 2.4 Secrets / credentials on the VPS

Stored in `/opt/dtms-revamp/.env` (git-ignored). Show them with:

```bash
cd /opt/dtms-revamp
grep -E '^(DB_PASSWORD|MEILISEARCH_KEY|REVERB_APP_KEY|REVERB_APP_SECRET|APP_KEY)=' .env
```

To rotate: edit `.env` → `./deploy-cloudpanel.sh` (recreates backend with
the new env). Do **not** edit `.git/` on the VPS — always push to GitHub
and `git pull` to stay auditable.

### 2.5 Maintenance window (optional)

```bash
# 1. enable
touch /home/dtms/htdocs/dtms.bfpr2.online/.maintenance
# 2. deploy
cd /opt/dtms-revamp && ./deploy-cloudpanel.sh
# 3. disable
rm /home/dtms/htdocs/dtms.bfpr2.online/.maintenance
```

Requires a small vhost addition (CloudPanel → Site → Vhost): an
`if (-f .../.maintenance) { return 503; }` inside `location /`.
Ask for the snippet if you want it wired in.

### 2.6 Rollback

```bash
cd /opt/dtms-revamp
git checkout <old-commit>
./deploy-cloudpanel.sh                 # rebuilds + restarts with old code
```

Migrations only add columns, so no `--rollback` step is needed. To restore a
previous DB state, use a backup:

```bash
php artisan db:backup           # list/download from Settings -> Database
# or nightly dump in /opt/dtms/backend/storage
```

---

## 3. Files worth knowing

| Path | Purpose |
|---|---|
| `docker-compose.yml` | Local dev stack (prod nginx frontend on :3000) |
| `docker-compose.cloudpanel.yml` | Production: loopback-only frontend :8080, internal db/redis/meili |
| `.env.cloudpanel` | Template for production `.env` |
| `backend/.env.example` | Template for local backend env |
| `deploy-cloudpanel.sh` | One-command production deploy |
| `CLOUDPANEL_DEPLOY.md` | Deep runbook (firewall, SSL troubleshooting, etc.) |
| `DEV_WORKFLOW.md` | This file |

---

## 4. Status right now

| Check | Result |
|---|---|
| Local `frontend:3000` | 200 OK |
| Local `backend:8000 /api/health` | `{"status":"ok"}` |
| VPS `https://dtms.bfpr2.online/up` | 200 (Let's Encrypt) |
| VPS `https://dtms.bfpr2.online/api/health` | `{"status":"ok"}` |
| Superadmin login | `dcitmbfpro02@gmail.com / @dmiN123` |
| Git pushed to `master` | commit `526cbf7` |
| VPS pulled + deployed | backend/frontend rebuilt, DB migrated |

You are good to: (a) develop locally on `3001` with Vite HMR, or
(b) push a commit and run `./deploy-cloudpanel.sh` to ship.
