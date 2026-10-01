#!/bin/bash
# ==========================================
# DTMS - CloudPanel (Hostinger VPS) deploy script
# Runs ON the VPS inside the git checkout.
#
# Usage:
#   ./deploy-cloudpanel.sh                 # migrate only
#   SEED=1 ./deploy-cloudpanel.sh          # first install: migrate + seed
#                                          # (BFP Region 2 offices + superadmin)
#   ./deploy-cloudpanel.sh /opt/dtms-revamp # custom checkout path
#
# Prerequisites (one time, see CLOUDPANEL_DEPLOY.md):
#   - .env created from .env.cloudpanel and filled in
#   - /opt/dtms/backend/.env exists (may be empty; APP_KEY generated on boot)
# ==========================================

set -euo pipefail

PROJECT_PATH="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
COMPOSE_FILE="docker-compose.cloudpanel.yml"
SEED="${SEED:-0}"

cd "$PROJECT_PATH"

echo "==> Deploying DTMS from $PROJECT_PATH"
echo "==> COMPOSE_FILE=$COMPOSE_FILE SEED=$SEED"
echo ""

export COMPOSE_FILE

echo "=== 1/6 Pull latest code ==="
if [ -d .git ]; then
  git pull --ff-only || echo "WARNING: git pull failed — continuing with current checkout."
else
  echo "ERROR: $PROJECT_PATH is not a git checkout." >&2
  exit 1
fi

echo ""
echo "=== 2/6 Check environment files ==="
if [ ! -f .env ]; then
  echo "ERROR: .env not found. Create it first:" >&2
  echo "  cp .env.cloudpanel .env && nano .env" >&2
  exit 1
fi
DOCKER_BASE_PATH=$(grep -E '^DOCKER_BASE_PATH=' .env 2>/dev/null | head -n1 | cut -d= -f2- | tr -d '\042\047 ')
DOCKER_BASE_PATH="${DOCKER_BASE_PATH:-/opt/dtms}"
export DOCKER_BASE_PATH
mkdir -p "$DOCKER_BASE_PATH/backend"
if [ ! -f "$DOCKER_BASE_PATH/backend/.env" ]; then
  : > "$DOCKER_BASE_PATH/backend/.env"
  echo "NOTE: created empty $DOCKER_BASE_PATH/backend/.env (APP_KEY generated on first boot)."
fi
if grep -v '^[#\s]' .env | grep -q "REPLACE_WITH_"; then
  echo "ERROR: .env still contains REPLACE_WITH_ placeholders. Edit them first." >&2
  grep -v '^[#\s]' .env | grep -n "REPLACE_WITH_" | head -n 20 >&2 || true
  exit 1
fi

echo ""
echo "=== 3/6 Build images ==="
docker compose build

echo ""
echo "=== 4/6 Start the stack ==="
docker compose up -d --build
docker compose ps

echo ""
echo "=== 5/6 Wait for backend health ==="
for i in $(seq 1 30); do
  if docker compose exec -T backend curl -fsS -o /dev/null http://localhost:8000/api/health 2>/dev/null; then
    echo "Backend healthy after ${i}0s."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: backend never became healthy. Logs:" >&2
    docker compose logs --tail 100 backend >&2 || true
    exit 1
  fi
  sleep 10
done

echo ""
echo "=== 6/6 Migrate (and optionally seed) ==="
docker compose exec -T backend php artisan migrate --force
if [ "$SEED" = "1" ]; then
  docker compose exec -T backend php artisan db:seed --force
fi

echo ""
echo "==> Done. Verify:"
echo "    curl -fsS https://$(grep -E '^SESSION_DOMAIN=' .env | cut -d= -f2)/up || true"
echo "    docker compose logs --tail 50 backend"
