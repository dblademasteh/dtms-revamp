# Deploy DTS to Synology via SSH

One script updates the NAS with the latest code and redeploys the full stack.

## Quick Start

From your **local machine** (simplest — the script handles everything over SSH):

```bash
./deploy-synology.sh                                    # defaults below
./deploy-synology.sh bfp-r2-nas1 /volume1/docker/dts bfpr2
SEED=1 ./deploy-synology.sh                             # seed the DB after a fresh install
```

Defaults: host `bfpr2.tw4.quickconnect.to`, path `/volume1/docker/dts`, user `bfpr2`.

### Manual SSH Commands

To SSH into the NAS and deploy by hand instead:

```bash
ssh bfpr2@bfpr2.tw4.quickconnect.to
cd /volume1/docker/dts
git pull --ff-only
cp .env.synology .env 2>/dev/null || true   # first time only, then edit it
mkdir -p backend/storage
touch backend/.env
export COMPOSE_FILE=docker-compose.synology.yml
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f --tail 50 backend
```

> Use a bare `up -d` — listing services can tear down `cloudflared`. After the
> frontend is updated, **Purge the Cloudflare cache** (Caching → Purge Everything)
> or add a Bypass rule for `/index.html`, otherwise users see the old build.

Requirements:

- SSH access to the NAS (Control Panel → Terminal & SNMP → Enable SSH)
- The NAS can reach GitHub (to `git pull` the repo)
- Docker Compose v2 (Container Manager)

## What the Script Does

| Step | Action |
|---|---|
| 1 | Clone the repo on first run |
| 2 | `git pull --ff-only` (resets to upstream if that fails) |
| 3 | Ensure `.env` exists; create `backend/.env` (empty; APP_KEY generated on first boot) |
| 4 | `docker compose build` |
| 5 | `docker compose up -d --build` |
| 6 | Wait for the backend container to become healthy |
| 7 | Run migrations (or `db:seed --force` when `SEED=1`) |

## Environment Files

Two files control the deployment:

| File | Purpose |
|---|---|
| `./.env` (from `.env.synology`) | Compose variables: `DOCKER_BASE_PATH`, ports, domain, `CLOUDFLARE_TUNNEL_TOKEN`, DB passwords |
| `${DOCKER_BASE_PATH}/backend/.env` | Laravel env; `APP_KEY` is generated and persisted here by the entrypoint |

Must-haves before the first deploy:

- `CLOUDFLARE_TUNNEL_TOKEN` set in `.env` (tunnel ingress must point at `http://localhost:80`)
- `SESSION_DOMAIN` / `SANCTUM_STATEFUL_DOMAINS` / `APP_URL` / `FRONTEND_URL` match the hostname you browse with
- `SESSION_SECURE_COOKIE=true` for HTTPS, `false` for plain-HTTP LAN access

## Useful Commands on the NAS

```bash
cd /volume1/docker/dts
export COMPOSE_FILE=docker-compose.synology.yml

docker compose ps                                   # container status
docker compose logs -f --tail 100 backend           # backend logs
docker compose logs -f --tail 50 cloudflared        # tunnel logs
docker compose exec -T backend php artisan tinker   # Laravel REPL
docker compose exec -T backend php artisan db:backup      # built-in DB backup (also runs nightly at 03:00; managed via Settings → Database)
docker compose down && docker compose up -d --build # full restart
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `curl localhost:8000` → `000` | Backend not running/unhealthy; check `docker compose ps` + backend logs |
| 500 "No application encryption key" | Remove the `APP_KEY=` line from `backend/.env` and recreate the backend container |
| Compose: "Couldn't find env file" | Create `mkdir -p backend/storage && touch backend/.env` |
| Login fails / sessions drop | `SESSION_DOMAIN`, `SANCTUM_STATEFUL_DOMAINS`, `APP_URL` don't match your browser host; check `SESSION_SECURE_COOKIE` |
| Tunnel down | `CLOUDFLARE_TUNNEL_TOKEN` set? Tunnel ingress → `http://localhost:80`? `docker compose logs cloudflared` |
| Old build shown after deploy | Purge the Cloudflare cache / add the `/index.html` bypass rule |
| Port 80 in use (DSM) | Set `FRONTEND_PORT=8080` in `.env` and redeploy |

See [`SYNLOGY_DEPLOY.md`](SYNLOGY_DEPLOY.md) for the full step-by-step guide.
