#!/bin/bash
# ==========================================
# Synology Deployment Fix + Update Script
# ==========================================
# Fixes broken Docker Compose and deploys updated frontend
# Paste this into your SSH session on the Synology NAS
# ==========================================

set -e

PROJECT_PATH="/volume1/docker/dts/dtms-revamp"
cd "$PROJECT_PATH"

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

echo "=== Step 4: Stop existing containers ==="
docker stop cloudflared 2>/dev/null || true
docker stop dts-frontend 2>/dev/null || true
docker rm cloudflared 2>/dev/null || true
docker rm dts-frontend 2>/dev/null || true

echo "=== Step 5: Set up custom network for DNS resolution ==="
NETWORK_NAME="dts-network"
docker network create "$NETWORK_NAME" 2>/dev/null || true

# Find and connect backend container to custom network
echo "Finding backend container..."
BACKEND_CONTAINER=""
for name in "backend" "dts-backend" "dtms-backend"; do
  FOUND=$(docker ps -q --filter "name=$name" 2>/dev/null || true)
  if [ -n "$FOUND" ]; then
    BACKEND_CONTAINER="$FOUND"
    break
  fi
done

if [ -n "$BACKEND_CONTAINER" ]; then
  BACKEND_NAME=$(docker inspect --format '{{.Name}}' "$BACKEND_CONTAINER" | tr -d '/')
  echo "  Backend found: $BACKEND_NAME, connecting to $NETWORK_NAME with alias 'backend'..."
  docker network disconnect "$NETWORK_NAME" "$BACKEND_CONTAINER" 2>/dev/null || true
  docker network connect --alias backend "$NETWORK_NAME" "$BACKEND_CONTAINER"
else
  echo "  WARNING: Backend not running. Frontend will serve static content only."
fi

echo "=== Step 6: Start frontend container ==="
FRONTEND_ID=$(docker run -d \
  --name dts-frontend \
  --network "$NETWORK_NAME" \
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
  echo "=== Frontend logs ==="
  docker logs --tail 20 "$FRONTEND_ID"
  echo "=== Network info ==="
  docker network inspect "$NETWORK_NAME" --format '{{json .Containers}}' 2>/dev/null || true
  echo "=== Backend containers ==="
  docker ps --filter "name=backend" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}" 2>/dev/null || true
  exit 1
fi

echo "=== Step 8: Start cloudflared tunnel ==="
docker start cloudflared 2>/dev/null || docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  --network container:dts-frontend \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --url=http://localhost --token=eyJhIjoiY2Q3YWUzNzZlNzRjMmEwMjkxOTQ1YWNmZThhNTAyYmUiLCJ0IjoiOGE5ZjNiNDMtODUzZC00NWZjLTkxMWEtNzE2NGZhOTJmNzQ3IiwicyI6Ik1qUTJNalU1WkRZdFlqTmxNeTAwTlRVNUxXRTNNREV0TXpsa05tRXpNVFEzTlRSaSJ9

echo "=== Step 9: Verify all containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== Deployment complete ==="
