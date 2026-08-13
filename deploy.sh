#!/bin/bash
# Deploy DTS frontend to Synology NAS
# Usage: ./deploy.sh [ssh_host] [project_path]
# Defaults: ssh_host=bfp-r2-nas1, project_path=/volume1/docker/dts

set -euo pipefail

SSH_HOST="${1:-bfp-r2-nas1}"
PROJECT_PATH="${2:-/volume1/docker/dts}"
COMPOSE_FILE="docker-compose.synology.yml"

echo "Deploying to $SSH_HOST:$PROJECT_PATH"

ssh -o StrictHostKeyChecking=no "$SSH_HOST" "
  set -e
  cd '$PROJECT_PATH'
  echo '=== Pulling latest changes ==='
  git pull origin master
  echo '=== Rebuilding frontend container ==='
  docker compose -f '$COMPOSE_FILE' up -d --build --force-recreate --no-deps frontend
  echo '=== Frontend deployment complete ==='
  docker compose -f '$COMPOSE_FILE' ps frontend
"

echo "Done."