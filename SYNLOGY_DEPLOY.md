# Synology NAS Deployment Guide

This guide walks you through deploying the DTS (Document Tracking System) to a Synology NAS using Docker Compose via **Container Manager**.

## Prerequisites

1. **Synology NAS** running DSM 7.x with **Container Manager** package installed
2. **Shared folder** named `docker` (or create one at `/volume1/docker`)
3. **SSH access** enabled (Control Panel → Terminal & SNMP)
4. **Terminal** access (use `sudo -i` after SSH login)

## 1. Create a Shared Folder

1. Open **Control Panel** → **Shared Folder**
2. Click **Create**
3. Name it e.g. `docker` — this maps to `/volume1/docker`
4. Assign appropriate permissions

## 2. Transfer Project Files

Copy the entire `dts-project` to your Synology:

```bash
# From your local machine, copy the project to the NAS
scp -r dts-project admin@SYNOLOGY_IP:/volume1/docker/dts-project
```

Or use **File Station** to drag-and-drop the project folder into the `docker` shared folder.

## 3. Configure Environment Variables

Two `.env` files are needed:

### 3a. Root `.env` (compose variables)

Create the `.env` file from the template:

```bash
cd /volume1/docker/dts-project
cp .env.synology .env
```

Edit `.env` to match your setup:

```bash
vi .env
```

### Critical Settings to Change

| Variable | What to set |
|---|---|
| `APP_URL` | Your public URL, e.g. `https://dtms.devbry.online` |
| `DB_PASSWORD` | A strong password of your choice |
| `MEILISEARCH_KEY` | A strong key of your choice |
| `SESSION_DOMAIN` | Your public domain (or leave empty for a host-only cookie) |
| `SANCTUM_STATEFUL_DOMAINS` | Your public domain, e.g. `dtms.devbry.online` |
| `CLOUDFLARE_TUNNEL_TOKEN` | Your Cloudflare tunnel token (required for public access) |
| `SESSION_SECURE_COOKIE` | `true` behind HTTPS, `false` for plain-HTTP LAN access |

### 3b. Backend `.env` (APP_KEY persistence)

The backend auto-generates `APP_KEY` on first run and writes it to the
bind-mounted file at `${DOCKER_BASE_PATH}/backend/.env`. Create it before
starting the stack (it may be empty):

```bash
mkdir -p /volume1/docker/dts/backend/storage
touch /volume1/docker/dts/backend/.env
```

> **Important**: `docker compose` refuses to start if this file is missing,
> because it is declared with `env_file`. Do not put an empty
> `APP_KEY=` line in it — the backend will generate and persist a real key
> for you on first boot.

DSM Control Panel → Network → Network Interface

## 4. Start the Stack

```bash
cd /volume1/docker/dts-project
docker compose -f docker-compose.synology.yml up -d --build
```

### Deploying updates over SSH

Once the project is on the NAS, the one-liner deploy script does everything:
pull latest code, ensure env files, build, start, wait for health, migrate:

```bash
# from your machine (host, path, user)
./deploy-synology.sh bfp-r2-nas1 /volume1/docker/dts bfpr2

# seed the database on a fresh install
SEED=1 ./deploy-synology.sh
```

Defaults: `bfpr2.tw4.quickconnect.to`, `/volume1/docker/dts`, user `bfpr2`.

Check the status:

```bash
docker compose -f docker-compose.synology.yml ps
docker compose -f docker-compose.synology.yml logs -f --tail 50
```

## 5. Run Database Migrations

Wait for `postgres` to be healthy (≈30s), then:

```bash
docker compose -f docker-compose.synology.yml exec backend \
  php artisan migrate --force
```

For a fresh install (seeds default data):

```bash
docker compose -f docker-compose.synology.yml exec backend \
  php artisan db:seed --force
```

## 6. Access the Application

- **Frontend**: `http://YOUR_NAS_IP:${FRONTEND_PORT}` (default `80`)
- **Backend API**: `http://YOUR_NAS_IP:${BACKEND_PORT}/api` (default port `8000`)
- **Public HTTPS** (via Cloudflare tunnel): `https://YOUR_TUNNEL_HOSTNAME`

> The tunnel token is read from `CLOUDFLARE_TUNNEL_TOKEN` in `.env`. In the
> Cloudflare Zero Trust dashboard, make the tunnel's ingress (Public
> Hostname) point to `http://localhost:80`.

### Default Credentials

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@dts.gov.ph` | `password` |
| Encoder | `encoder@dts.gov.ph` | `password` |
| Approver | `approver@dts.gov.ph` | `password` |
| HR Head | `hrhead@dts.gov.ph` | `password` |

## Common Tasks

### View Logs

```bash
# All services
docker compose -f docker-compose.synology.yml logs -f --tail 100

# Specific service (e.g., backend)
docker compose -f docker-compose.synology.yml logs -f backend
```

### Stop / Restart

```bash
docker compose -f docker-compose.synology.yml down
docker compose -f docker-compose.synology.yml up -d --build
```

### Rebuild After Code Changes

```bash
docker compose -f docker-compose.synology.yml up -d --build --force-recreate
```

### Tinker (PHP REPL)

```bash
docker compose -f docker-compose.synology.yml exec backend php artisan tinker
```

### Backup the Database

```bash
docker compose -f docker-compose.synology.yml exec -T postgres \
  pg_dump -U dts_user dts_database > backup_$(date +%F).sql
```

### Restore the Database

```bash
docker compose -f docker-compose.synology.yml exec -T postgres \
  psql -U dts_user dts_database < backup_file.sql
```

## Using a Custom Domain or HTTPS

### Option A: Synology Reverse Proxy (HTTP/HTTPS)

1. **Control Panel** → **Application Portal** → **Reverse Proxy**
2. Click **Create** to add a rule:

   | Field | Value |
   |---|---|
   | Description | DTS |
   | Source | `http://YOUR_NAS_IP` (or your domain) |
   | Destination | `http://localhost:80` |

   For HTTPS, add a certificate and use `https://` on the source.

   3. After setting up the proxy, update `.env`:
      - Set `APP_URL=https://your-domain.com`
      - Set `SANCTUM_STATEFUL_DOMAINS=your-domain.com`
      - Set `SESSION_DOMAIN=your-domain.com`

   4. Restart the stack for changes to take effect:

   ```bash
   docker compose -f docker-compose.synology.yml up -d --build --force-recreate
   ```

   > **Note**: Environment variables in `.env` are read at container build/start time, so you must recreate containers after changing them.

### Option B: Direct Port Mapping

If you prefer to run the frontend on a custom port, set `FRONTEND_PORT` in `.env`:

```
FRONTEND_PORT=8080
```

Then access at `http://YOUR_NAS_IP:8080`.

## Troubleshooting

### Permission Errors on Shared Folders

Ensure the `docker` shared folder is accessible:

1. **Control Panel** → **Shared Folder** → select `docker` → **Edit** → **Permissions**
2. Ensure your user and the `users` group have **Read/Write** access

### Health Check Failures

If `postgres` or `redis` health checks fail:

```bash
# Check individual service logs
docker compose -f docker-compose.synology.yml logs postgres
docker compose -f docker-compose.synology.yml logs redis

# Verify data directories
ls -la /volume1/docker/dts/postgres/data
ls -la /volume1/docker/dts/redis/data
```

### Port Already in Use

If port 80 or 8000 is taken (e.g., by another Container Manager project or Synology DSM):

```
FRONTEND_PORT=8080
BACKEND_PORT=8200
```

### Websocket (Reverb) Connection Issues

- Ensure `REVERB_HOST`, `REVERB_SCHEME`, and `REVERB_PORT` in `.env` match your `APP_URL`
- The frontend proxies `/app` websocket paths through nginx automatically
- Behind an HTTPS reverse proxy, set `REVERB_SCHEME=https`

### App Key Persistence

The backend auto-generates APP_KEY on first startup and saves it to the
bind-mounted `.env` file at `/volume1/docker/dts/backend/.env`.
Inspect or modify it via SSH:

```bash
cat /volume1/docker/dts/backend/.env
```

### Backend Returns 500 / "No application encryption key has been specified"

The entrypoint only generates `APP_KEY` when the `.env` file has no
`APP_KEY=base64:` line. If you copied a template containing an empty
`APP_KEY=` line into `backend/.env`, delete that line (or the whole file)
and recreate the container:

```bash
sed -i '/^APP_KEY=/d' /volume1/docker/dts/backend/.env
docker compose -f docker-compose.synology.yml up -d --force-recreate backend
```

### Compose Fails: "Couldn't find env file"

The backend service requires `/volume1/docker/dts/backend/.env` to exist:

```bash
mkdir -p /volume1/docker/dts/backend/storage
touch /volume1/docker/dts/backend/.env
```

### Login Fails / Sessions Don't Persist

Check `.env` — `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `APP_URL` and
`FRONTEND_URL` must match the hostname you actually browse with. For HTTPS
access, `SESSION_SECURE_COOKIE=true`; for plain HTTP access on the LAN, set
it to `false` and recreate the backend container.

### Tunnel Not Working

- Confirm `CLOUDFLARE_TUNNEL_TOKEN` is set in `.env` (no `--url` is used
  with token-based tunnels).
- In Cloudflare Zero Trust, the tunnel's Public Hostname must route to
  `http://localhost:80`.
- Check tunnel logs: `docker compose -f docker-compose.synology.yml logs cloudflared`.
