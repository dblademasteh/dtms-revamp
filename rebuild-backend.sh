#!/bin/bash
# ==========================================
# Synology Backend Rebuild Script
# ==========================================
# Rebuilds the Laravel backend image and recreates the container,
# preserving the existing container's environment variables,
# network connections, and data volumes.
#
# Usage: bash rebuild-backend.sh
# ==========================================

set -e

PROJECT_PATH="/volume1/docker/dts/dtms-revamp"
cd "$PROJECT_PATH"

DOCKER_BASE_PATH="${DOCKER_BASE_PATH:-/volume1/docker/dts}"
COMPOSITE_NETWORK="dtms-revamp_default"   # network used by docker-compose.synology.yml
LEGACY_NETWORK="dts-network"              # fallback/legacy network

echo "=== Finding existing backend container ==="
OLD_ID=""
for name in "dtms-revamp-backend-1" "dtms-project-backend" "dts-backend" "dtms-backend"; do
  OLD_ID=$(docker ps --filter "name=^${name}$" --format "{{.ID}}" | head -n1)
  [ -n "$OLD_ID" ] && break
done
if [ -z "$OLD_ID" ]; then
  OLD_ID=$(docker ps --filter "label=com.docker.compose.service=backend" --format "{{.ID}}" | head -n1)
fi
if [ -z "$OLD_ID" ]; then
  OLD_ID=$(docker ps -q --filter "name=backend" | head -n1)
fi

if [ -z "$OLD_ID" ]; then
  echo "ERROR: No running backend container found. Start it first."
  docker ps --format "table {{.Names}}\t{{.Status}}"
  exit 1
fi

OLD_NAME=$(docker inspect --format '{{.Name}}' "$OLD_ID" | tr -d '/')
echo "Backend container found: $OLD_NAME (id ${OLD_ID:0:12})"

echo "=== Step 1: Capture environment from existing container ==="
ENV_ARGS=()
while IFS= read -r line; do
  [ -n "$line" ] && ENV_ARGS+=("--env" "$line")
done < <(docker inspect "$OLD_ID" --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}')

echo "=== Step 2: Build backend image (dts-backend:latest) ==="
docker build -t dts-backend:latest -f backend/Dockerfile backend/

echo "=== Step 3: Stop and remove old backend container ==="
docker stop "$OLD_NAME" 2>/dev/null || true
docker rm "$OLD_NAME" 2>/dev/null || true

echo "=== Step 4: Start new backend container ==="
docker network create "$COMPOSITE_NETWORK" 2>/dev/null || true

docker run -d \
  --name "$OLD_NAME" \
  --restart unless-stopped \
  "${ENV_ARGS[@]}" \
  -v "$DOCKER_BASE_PATH/backend/.env:/var/www/html/.env" \
  -v "$DOCKER_BASE_PATH/backend/storage:/var/www/html/storage" \
  -v "$DOCKER_BASE_PATH/backend/bootstrap/cache:/var/www/html/bootstrap/cache" \
  dts-backend:latest

echo "=== Step 5: Reconnect to composite network (dtms-revamp_default) ==="
docker network connect --alias backend "$COMPOSITE_NETWORK" "$OLD_NAME" 2>/dev/null || echo "  Already connected to $COMPOSITE_NETWORK"

echo "=== Step 6: Wait for backend to be healthy ==="
RETRIES=15
for i in $(seq 1 $RETRIES); do
  sleep 2
  STATUS=$(docker inspect --format '{{.State.Running}}' "$OLD_NAME" 2>/dev/null || echo "false")
  if [ "$STATUS" = "true" ]; then
    echo "  Backend is running (check $i)"
    break
  fi
  echo "  Waiting for backend... ($i/$RETRIES)"
done

RUNNING=$(docker inspect --format '{{.State.Running}}' "$OLD_NAME" 2>/dev/null || echo "false")
if [ "$RUNNING" != "true" ]; then
  echo "ERROR: Backend failed to start!"
  docker logs --tail 30 "$OLD_NAME"
  exit 1
fi

echo "=== Step 7: Verify ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|backend" || true

echo ""
echo "Backend rebuilt successfully on network '$COMPOSITE_NETWORK'"
echo "Services can reach each other via Docker DNS (postgres, redis, meilisearch)"