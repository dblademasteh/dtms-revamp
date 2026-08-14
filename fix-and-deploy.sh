#!/bin/bash
# ==========================================
# Synology Deployment Fix + Update Script
# ==========================================
# Rebuilds frontend and ensures all services are on the correct network
# Usage: bash fix-and-deploy.sh
# ==========================================================================

set -e

PROJECT_PATH="/volume1/docker/dts/dtms-revamp"
cd "$PROJECT_PATH"

COMPOSE_FILE="docker-compose.synology.yml"
NETWORK_NAME="dtms-revamp_default"       # network used by compose services

echo "=== Step 1: Pull latest changes ==="
git pull origin master

echo "=== Step 2: Ensure .env exists ==="
if [ ! -f .env ]; then
  cp .env.synology .env
fi

echo "=== Step 3: Build frontend image ==="
docker build \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_APP_NAME=DTS \
  --build-arg VITE_REVERB_HOST= \
  --build-arg VITE_REVERB_PORT= \
  --build-arg VITE_REVERB_SCHEME=http \
  --build-arg VITE_REVERB_APP_KEY=dts-reverb-key \
  -t dts-frontend:latest \
  -f frontend/Dockerfile \
  frontend/

echo "=== Step 4: Stop and remove old frontend container ==="
docker stop dts-frontend 2>/dev/null || true
docker rm dts-frontend 2>/dev/null || true

echo "=== Step 5: Find backend container ID ==="
# The name filter for docker ps is PREFIX-MATCH, so we use a list and pick the running one
BACKEND_CONTAINER=$(docker ps --filter "name=dtms-revamp-backend-1" --format "{{.ID}}" | head -n1)
if [ -z "$BACKEND_CONTAINER" ]; then
  echo "WARNING: No running backend container found."
fi

echo "=== Step 6: Start frontend container on composite network ==="
FRONTEND_ID=$(docker run -d \
  --name dts-frontend \
  --network "$NETWORK_NAME" \
  --network-alias dts-frontend \
  --restart unless-stopped \
  dts-frontend:latest)
echo "  Frontend started: $FRONTEND_ID"

echo "=== Step 7: Wait for frontend to be healthy ==="
RETRIES=10
FRONTEND_RUNNING=false
for i in $(seq 1 $RETRIES); do
  sleep 1
  STATUS=$(docker inspect --format '{{.State.Running}}' "$FRONTEND_ID" 2>/dev/null || echo "false")
  if [ "$STATUS" = "true" ]; then
    FRONTEND_RUNNING=true
    echo "  Frontend is running (check $i)"
    break
  fi
  echo "  Waiting for frontend... ($i/$RETRIES)"
done

if [ "$FRONTEND_RUNNING" = "false" ]; then
  echo "ERROR: Frontend container failed to start!"
  docker logs --tail 20 "$FRONTEND_ID"
  exit 1
fi

echo "=== Step 8: Ensure backend is on the same network ==="
if [ -n "$BACKEND_CONTAINER" ]; then
  # Check if backend is already on the network
  docker network connect "$NETWORK_NAME" "$BACKEND_CONTAINER" 2>/dev/null || true
fi

echo "=== Step 9: Start cloudflared tunnel ==="
if ! docker ps --filter "name=cloudflared" --format "{{.ID}}" | grep -q .; then
  docker run -d \
    --name cloudflared \
    --restart unless-stopped \
    --network "$NETWORK_NAME" \
    cloudflare/cloudflared:latest \
    tunnel --no-autoupdate run --url=http://localhost:80 --token=eyJhIjoiY2Q3YWUzNzZlNzRjMmEwMjkxOTQ1YWNmZThhNTAyYmUiLCJ0IjoiOGE5ZjNiNDMtODUzZC00NWZjLTkxMWEtNzE2NGZhOTJmNzQ3IiwicyI6Ik1qUTJNalU1WkRZdFlqTmxNeTAwTlRVNUxXRTNNREV0TXpsa05tRXpNVFEzTlRSaSJ9
fi
docker start cloudflared 2>/dev/null || true

echo "=== Step 10: Verify all containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== Deployment complete ==="