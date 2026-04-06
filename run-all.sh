#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PID_FILE="/tmp/soothsayer-all.pids"
LOG_FILE="/tmp/soothsayer-all.log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
  echo -e "${GREEN}[soothsayer]${NC} $1"
}

error() {
  echo -e "${RED}[soothsayer]${NC} $1"
}

stop_services() {
  log "Stopping all services..."
  
  if [ -f "$PID_FILE" ]; then
    while read -r pid; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
        log "Stopped process $pid"
      fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
  fi
  
  pkill -f "dax serve" 2>/dev/null || true
  pkill -f "picobot serve" 2>/dev/null || true
  pkill -f "node dist/apps/api" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  
  log "All services stopped"
  exit 0
}

start_services() {
  log "Starting all services..."
  
  rm -f "$PID_FILE"
  touch "$PID_FILE"
  
  echo "" >> "$LOG_FILE"
  echo "=== Soothsayer Startup $(date) ===" >> "$LOG_FILE"
  
  # Check for required env vars
  if [ ! -f ".env" ]; then
    error "No .env file found. Copy .env.example to .env and configure."
    exit 1
  fi
  
  # Start DAX
  log "Starting DAX on port 4096..."
  dax serve >> "$LOG_FILE" 2>&1 &
  DAX_PID=$!
  echo "$DAX_PID" >> "$PID_FILE"
  log "DAX started (PID: $DAX_PID)"
  
  # Start Picobot
  log "Starting Picobot on port 8080..."
  PICOBOT_PYTHON="/opt/homebrew/opt/python@3.14/bin/python3.14"
  if [ -x "$PICOBOT_PYTHON" ]; then
    $PICOBOT_PYTHON -m picobot serve >> "$LOG_FILE" 2>&1 &
    echo "$!" >> "$PID_FILE"
    log "Picobot started"
  elif command -v picobot &> /dev/null; then
    picobot serve >> "$LOG_FILE" 2>&1 &
    echo "$!" >> "$PID_FILE"
    log "Picobot started"
  else
    log "Picobot not available - skipping (start manually if needed)"
  fi
  
  # Build Soothsayer API
  log "Building Soothsayer API..."
  pnpm --filter @soothsayer/api build >> "$LOG_FILE" 2>&1
  pnpm --filter @soothsayer/api prisma:generate >> "$LOG_FILE" 2>&1 || true
  
  # Start Soothsayer API
  log "Starting Soothsayer API on port 3000..."
  cd apps/api && node dist/apps/api/src/main.js >> "$LOG_FILE" 2>&1 &
  API_PID=$!
  cd "$SCRIPT_DIR"
  echo "$API_PID" >> "$PID_FILE"
  log "Soothsayer API started (PID: $API_PID)"
  
  # Start Picobot
  log "Starting Picobot on port 18791 (Picobot web interface)..."
  PICOBOT_PYTHON="/opt/homebrew/opt/python@3.14/bin/python3.14"
  PICOBOT_SOURCE="/Users/Shailesh/MYAIAGENTS/picobot"
  if [ -x "$PICOBOT_PYTHON" ] && [ -d "$PICOBOT_SOURCE" ]; then
    PYTHONPATH="$PICOBOT_SOURCE" $PICOBOT_PYTHON -m picobot gateway --port 18791 >> "$LOG_FILE" 2>&1 &
    echo "$!" >> "$PID_FILE"
    log "Picobot started on port 18791"
  elif command -v picobot &> /dev/null; then
    picobot serve >> "$LOG_FILE" 2>&1 &
    echo "$!" >> "$PID_FILE"
    log "Picobot started"
  else
    log "Picobot not available - skipping"
  fi
  
  # Wait for API to be ready
  log "Waiting for API..."
  for i in {1..30}; do
    if curl -s http://localhost:3000/api/health >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  
  # Start Soothsayer Web
  log "Starting Soothsayer Web on port 5173..."
  pnpm --filter @soothsayer/web exec vite --host 0.0.0.0 >> "$LOG_FILE" 2>&1 &
  WEB_PID=$!
  echo "$WEB_PID" >> "$PID_FILE"
  log "Soothsayer Web started (PID: $WEB_PID)"
  
  echo ""
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}✅ All services are running!${NC}"
  echo -e "${GREEN}======================================${NC}"
  echo ""
  echo -e "  ${YELLOW}DAX:${NC}         http://localhost:4096"
  echo -e "  ${YELLOW}Picobot:${NC}     http://localhost:8080"
  echo -e "  ${YELLOW}Soothsayer API:${NC}  http://localhost:3000"
  echo -e "  ${YELLOW}Soothsayer Web:${NC}  http://localhost:5173"
  echo ""
  echo "Log file: $LOG_FILE"
  echo ""
  echo "Run './run-all.sh stop' to stop all services"
  echo "Press Ctrl+C to stop"
  echo ""
  
  # Wait for Ctrl+C
  trap stop_services SIGINT
  wait
}

case "${1:-start}" in
  start)
    start_services
    ;;
  stop)
    stop_services
    ;;
  restart)
    stop_services
    sleep 2
    start_services
    ;;
  status)
    if [ -f "$PID_FILE" ]; then
      log "Services are running (PID file exists)"
      while read -r pid; do
        if kill -0 "$pid" 2>/dev/null; then
          echo "  Process $pid: running"
        else
          echo "  Process $pid: not running"
        fi
      done < "$PID_FILE"
    else
      log "Services are not running"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
