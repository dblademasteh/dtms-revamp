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
NETWORK_NAME="dts-network"

# Find the running backend container.
# NOTE: the docker name filter is a SUBSTRING match ("name=backend" can match
# compose "dtms-revamp-backend-1" plus legacy containers), which yields a
# multi-line ID and breaks later commands. Resolve exactly ONE:
#   1) exact container name
#   2) compose-managed backend service
#   3) any running container with "backend" in its name (first match)
OLD_ID=""
for name in "dts-project-backend" "dts-backend" "backend" "dtms-backend"; do
  OLD_ID=$(docker ps -q --filter "name=^${name}$" 2>/dev/null | head -n1)
  [ -n "$OLD_ID" ] && break
done
if [ -z "$OLD_ID" ]; then
  OLD_ID=$(docker ps -q --filter "label=com.docker.compose.service=backend" 2>/dev/null | head -n1)
fi
if [ -z "$OLD_ID" ]; then
  OLD_ID=$(docker ps -q --filter "name=backend" 2>/dev/null | head -n1)
fi

if [ -z "$OLD_ID" ]; then
  echo "ERROR: No running backend container found. Start it first."
  docker ps --format "table {{.Names}}\t{{.Status}}"
  exit 1
fi

OLD_NAME=$(docker inspect --format '{{.Name}}' "$OLD_ID" | tr -d '/')
echo "Backend container found: $OLD_NAME"

echo "=== Step 1: Capture environment + networks from existing container ==="
ENV_ARGS=()
while IFS= read -r line; do
  [ -n "$line" ] && ENV_ARGS+=("--env" "$line")
done < <(docker inspect "$OLD_ID" --format '{{range .Config.Env}}{{.}}{{"\n"}}{{end}}')

# Capture all networks the old container is attached to (compose net + dts-network)
NETS=()
while IFS= read -r net; do
  [ -n "$net" ] && NETS+=("$net")
done < <(docker inspect "$OLD_ID" --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}')

echo "  Networks: ${NETS[*]}"

echo "=== Step 2: Build backend image (dts-backend:latest) ==="
docker build -t dts-backend:latest -f backend/Dockerfile backend/

echo "=== Step 3: Stop and remove old backend container ==="
docker stop "$OLD_NAME" 2>/dev/null || true
docker rm "$OLD_NAME" 2>/dev/null || true

echo "=== Step 4: Start new backend container (reusing name '$OLD_NAME') ==="
docker network create "$NETWORK_NAME" 2>/dev/null || true

docker run -d \
  --name "$OLD_NAME" \
  --restart unless-stopped \
  "${ENV_ARGS[@]}" \
  -v "$DOCKER_BASE_PATH/backend/.env:/var/www/html/.env" \
  -v "$DOCKER_BASE_PATH/backend/storage:/var/www/html/storage" \
  -v "$DOCKER_BASE_PATH/backend/bootstrap/cache:/var/www/html/bootstrap/cache" \
  dts-backend:latest

echo "=== Step 5: Reconnect networks ==="
for net in "${NETS[@]}"; do
  if [ "$net" = "$NETWORK_NAME" ]; then
    echo "  Connecting '$OLD_NAME' to $net with alias 'backend'..."
    docker network connect --alias backend "$net" "$OLD_NAME" 2>/dev/null || true
  else
    echo "  Connecting '$OLD_NAME' to $net..."
    docker network connect "$net" "$OLD_NAME" 2>/dev/null || true
  fi
done

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
docker exec "$OLD_NAME" php artisan route:list --path=admin/settings 2>/dev/null | grep -E "GET|PUT|POST|DELETE" || echo "(route:list unavailable, check logs)"

echo ""
echo "Backend rebuilt. New routes are now live:"
echo "  GET/PUT /api/admin/settings"
echo "  POST/DELETE /api/admin/branding/logo"
echo "  GET /api/branding (public)"
