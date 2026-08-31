#!/bin/bash
# ==========================================
# DTS - Synology NAS Deploy Script
# Pulls the latest code and redeploys the full
# stack on the NAS over SSH.
#
# Usage:
#   ./deploy-synology.sh [ssh_host] [project_path] [ssh_user]
#
# Examples:
#   ./deploy-synology.sh
#   ./deploy-synology.sh 192.168.1.10 /volume1/docker/dts-project bfpr2
#
# Environment:
#   SEED=1   Run "php artisan db:seed --force" after deploy
#
# SSH:
#   Default host is the NAS Tailscale name (bfp-r2-nas1). A ~/.ssh/config
#   entry can also route the QuickConnect host over Tailscale:
#       Host bfpr2.tw4.quickconnect.to bfp-r2-nas1
#           HostName bfp-r2-nas1
#           User bfpr2
# ==========================================

set -euo pipefail

SSH_HOST="${1:-bfp-r2-nas1}"
PROJECT_PATH="${2:-/volume1/docker/dts-project}"
SSH_USER="${3:-bfpr2}"
REPO_URL="https://github.com/dblademasteh/dtms-revamp.git"
COMPOSE_FILE="docker-compose.synology.yml"

echo "==> Deploying DTS to ${SSH_USER}@${SSH_HOST}:${PROJECT_PATH}"
echo "==> SEED=${SEED:-0}"

ssh "${SSH_USER}@${SSH_HOST}" bash -s "${PROJECT_PATH}" "${REPO_URL}" "${COMPOSE_FILE}" "${SEED:-0}" << 'DEPLOY_EOF'
set -e

PROJECT_PATH="$1"
REPO_URL="$2"
COMPOSE_FILE="$3"
SEED="$4"

echo ""
echo "=== 1/7 Ensure repository is present ==="
if [ ! -d "$PROJECT_PATH/.git" ]; then
    rm -rf "$PROJECT_PATH"
    mkdir -p "$PROJECT_PATH"
    git clone "$REPO_URL" "$PROJECT_PATH"
fi
cd "$PROJECT_PATH"

echo "=== 2/7 Pull latest changes ==="
git pull --ff-only || {
    echo "WARNING: fast-forward pull failed. Attempting rebase..."
    git pull --rebase || {
        echo "ERROR: pull failed. Manual intervention needed. Skipping this step."
        echo "  Run: git status && git log --oneline -3"
    }
}

echo "=== 3/7 Ensure environment files ==="
if [ ! -f .env ]; then
    cp .env.synology .env
    echo "NOTE: Created .env from template - review it before continuing."
fi
DOCKER_BASE_PATH=$(grep -E '^DOCKER_BASE_PATH=' .env 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '" ' )
DOCKER_BASE_PATH="${DOCKER_BASE_PATH:-$PROJECT_PATH}"
mkdir -p "$DOCKER_BASE_PATH/backend/storage"
if [ ! -f "$DOCKER_BASE_PATH/backend/.env" ]; then
    : > "$DOCKER_BASE_PATH/backend/.env"
    echo "NOTE: Created empty $DOCKER_BASE_PATH/backend/.env (APP_KEY is generated on first boot)."
fi

echo "=== 4/7 Build images ==="
export COMPOSE_FILE
docker compose build

echo "=== 5/7 Start the stack ==="
docker compose up -d --build

echo "=== 6/7 Wait for backend health ==="
BACKEND_ID=""
for i in $(seq 1 30); do
    BACKEND_ID=$(docker compose ps -q backend 2>/dev/null | head -n1)
    [ -n "$BACKEND_ID" ] && break
    sleep 2
done

if [ -z "$BACKEND_ID" ]; then
    echo "ERROR: backend container was not created"
    docker compose ps || true
    docker compose logs --tail 50 backend || true
    exit 1
fi

HEALTHY=0
for i in $(seq 1 45); do
    STATUS=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}running{{end}}' "$BACKEND_ID" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
        HEALTHY=1
        break
    fi
    sleep 2
done

if [ "$HEALTHY" = "1" ]; then
    echo "backend is healthy"
else
    echo "WARNING: backend not healthy after 90s"
    docker compose ps || true
    docker compose logs --tail 50 backend || true
fi

if [ "$SEED" = "1" ]; then
    echo "=== 7/7 Seed database ==="
    docker compose exec -T backend php artisan db:seed --force
else
    echo "=== 7/7 Migrations ==="
    docker compose exec -T backend php artisan migrate --force || true
fi

echo ""
echo "=== Deployment complete ==="
docker compose ps
DEPLOY_EOF

echo ""
echo "==> Done. Open the frontend port or your tunnel hostname to verify."
