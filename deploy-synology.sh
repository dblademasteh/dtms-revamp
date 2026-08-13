#!/bin/bash
# Deploy DTS frontend to Synology NAS via SSH
# Usage: ./deploy-synology.sh [ssh_host] [project_path] [ssh_user]
# Defaults:
#   ssh_host=bfpr2.tw4.quickconnect.to
#   project_path=/volume1/docker/dts
#   ssh_user=bfpr2

set -euo pipefail

SSH_HOST="${1:-bfpr2.tw4.quickconnect.to}"
PROJECT_PATH="${2:-/volume1/docker/dts}"
SSH_USER="${3:-bfpr2}"
REPO_URL="https://github.com/dblademasteh/dtms-revamp.git"

echo "==> Deploying to ${SSH_USER}@${SSH_HOST}:${PROJECT_PATH}"

ssh "${SSH_USER}@${SSH_HOST}" << DEPLOY_EOF
set -e

echo "=== Checking git repo ==="
if [ ! -d "${PROJECT_PATH}/.git" ]; then
  echo "Repo not found, cloning..."
  rm -rf ${PROJECT_PATH}/dtms-revamp
  mkdir -p ${PROJECT_PATH}/dtms-revamp
  git clone ${REPO_URL} ${PROJECT_PATH}/dtms-revamp
fi

echo "=== Pulling latest changes ==="
cd ${PROJECT_PATH}/dtms-revamp
# Use COMPOSE_FILE to avoid -f flag issue on Synology Docker
cp .env.synology .env 2>/dev/null || true

echo "=== Stopping existing frontend container ==="
COMPOSE_FILE=docker-compose.synology.yml docker compose stop frontend 2>/dev/null || true

echo "=== Building and starting frontend ==="
COMPOSE_FILE=docker-compose.synology.yml docker compose up -d --build --force-recreate --no-deps frontend

echo "=== Verifying deployment ==="
COMPOSE_FILE=docker-compose.synology.yml docker compose ps frontend

echo "=== Deployment complete ==="
DEPLOY_EOF

echo "Done."