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

echo "=== Step 4: Stop existing frontend + cloudflared containers ==="
docker stop cloudflared 2>/dev/null || true
docker stop dts-frontend 2>/dev/null || true
docker rm cloudflared 2>/dev/null || true
docker rm dts-frontend 2>/dev/null || true

echo "=== Step 5: Start frontend container ==="
# Create custom network for backend->frontend DNS resolution
NETWORK_NAME="dts-network"
docker network create "$NETWORK_NAME" 2>/dev/null || true

# Connect backend container to the custom network (if running)
BACKEND_CONTAINER=$(docker ps -q --filter "name=backend" --filter "name=dts-backend" 2>/dev/null || true)
if [ -n "$BACKEND_CONTAINER" ]; then
  docker network connect "$NETWORK_NAME" "$BACKEND_CONTAINER" 2>/dev/null || true
fi

docker run -d \
  --name dts-frontend \
  --network "$NETWORK_NAME" \
  --restart unless-stopped \
  dts-frontend:latest

echo "=== Step 6: Wait for frontend to be ready, then start cloudflared ==="
echo "Waiting for frontend to stabilize..."
sleep 3
docker start cloudflared 2>/dev/null || docker run -d \
  --name cloudflared \
  --restart unless-stopped \
  --network container:dts-frontend \
  cloudflare/cloudflared:latest \
  tunnel --no-autoupdate run --url=http://localhost --token=eyJhIjoiY2Q3YWUzNzZlNzRjMmEwMjkxOTQ1YWNmZThhNTAyYmUiLCJ0IjoiOGE5ZjNiNDMtODUzZC00NWZjLTkxMWEtNzE2NGZhOTJmNzQ3IiwicyI6Ik1qUTJNalU1WkRZdFlqTmxNeTAwTlRVNUxXRTNNREV0TXpsa05tRXpNVFEzTlRSaSJ9

echo "=== Step 7: Verify containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo "=== Deployment complete ==="
