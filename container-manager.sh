#!/bin/bash
# ==========================================
# Synology Docker Container Task Manager
# ==========================================
# Manages container lifecycle: status, rebuild, logs, restart
# Usage: ./container-manager.sh [command] [service]
#
# Commands:
#   status           Show all container status
#   rebuild [name]   Rebuild a specific service (frontend|backend|all)
#   logs [name]      Show logs for a service
#   restart [name]   Restart a specific service
#   stop [name]      Stop a specific service
#   start [name]     Start a specific service
#
# Example:
#   ./container-manager.sh rebuild frontend
#   ./container-manager.sh status
#   ./container-manager.sh logs backend
# ==========================================

set -euo pipefail

PROJECT_PATH="${PROJECT_PATH:-/volume1/docker/dts/dtms-revamp}"
COMPOSE_FILE="docker-compose.synology.yml"

export COMPOSE_FILE

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_compose() {
  if ! COMPOSE_FILE=$COMPOSE_FILE docker compose version >/dev/null 2>&1; then
    log_error "Docker Compose not available or COMPOSE_FILE issue"
    log_info "Try: COMPOSE_FILE=docker-compose.synology.yml docker compose ps"
    exit 1
  fi
}

show_status() {
  log_info "=== Container Status ==="
  echo ""
  check_compose
  COMPOSE_FILE=$COMPOSE_FILE docker compose ps
  echo ""
  log_info "=== Resource Usage ==="
  docker stats --no-stream --format "table {{.Container}}\t{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" || true
}

rebuild_service() {
  local service="$1"
  if [ "$service" = "all" ]; then
    log_info "Rebuilding ALL services..."
    COMPOSE_FILE=$COMPOSE_FILE docker compose build
    COMPOSE_FILE=$COMPOSE_FILE docker compose up -d --force-recreate
  else
    log_info "Rebuilding '${service}' service..."
    COMPOSE_FILE=$COMPOSE_FILE docker compose build "$service"
    COMPOSE_FILE=$COMPOSE_FILE docker compose up -d --build --force-recreate --no-deps "$service"
  fi
  log_ok "Rebuild complete"
  show_status
}

show_logs() {
  local service="$1"
  log_info "Showing logs for '${service}' (Ctrl+C to exit)..."
  COMPOSE_FILE=$COMPOSE_FILE docker compose logs -f --tail=50 "$service"
}

restart_service() {
  local service="$service"
  log_info "Restarting '${service}'..."
  COMPOSE_FILE=$COMPOSE_FILE docker compose restart "$service"
  log_ok "Restarted '${service}'"
}

stop_service() {
  local service="$1"
  log_info "Stopping '${service}'..."
  COMPOSE_FILE=$COMPOSE_FILE docker compose stop "$service"
  log_ok "Stopped '${service}'"
}

start_service() {
  local service="$1"
  log_info "Starting '${service}'..."
  COMPOSE_FILE=$COMPOSE_FILE docker compose start "$service"
  log_ok "Started '${service}'"
}

show_usage() {
  cat << EOF
${CYAN}Synology Docker Container Task Manager${NC}
${YELLOW}==========================================${NC}

${CYAN}Usage:${NC}
  $0 <command> [service]

${CYAN}Commands:${NC}
  ${GREEN}status${NC}            Show all container status + resource usage
  ${GREEN}rebuild${NC} [name]    Rebuild service (frontend|backend|all)
  ${GREEN}logs${NC}    [name]    Show live logs for a service
  ${GREEN}restart${NC} [name]   Restart a service
  ${GREEN}stop${NC}    [name]    Stop a service
  ${GREEN}start${NC}   [name]   Start a service

${CYAN}Examples:${NC}
  $0 status
  $0 rebuild frontend
  $0 rebuild all
  $0 logs backend
  $0 restart frontend

EOF
}

# ---- Main ----
cd "$PROJECT_PATH" 2>/dev/null || { log_error "Directory not found: $PROJECT_PATH"; exit 1; }

if [ ! -f .env ]; then
  log_warn "No .env found, copying from .env.synology..."
  cp .env.synology .env 2>/dev/null || true
fi

case "${1:-}" in
  status)       show_status ;;
  rebuild)      rebuild_service "${2:-all}" ;;
  logs)         show_logs "${2:-frontend}" ;;
  restart)      restart_service "${2:-frontend}" ;;
  stop)         stop_service "${2:-frontend}" ;;
  start)        start_service "${2:-frontend}" ;;
  ""|help|-h)   show_usage ;;
  *)            log_error "Unknown command: $1"; show_usage; exit 1 ;;
esac
