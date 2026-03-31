#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  LoginApp — Local Dev Setup Script
#  Run: chmod +x setup.sh && ./setup.sh
# ═══════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${BLUE}[setup]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✔ $1${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
err()  { echo -e "${RED}  ✘ $1${NC}"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      LoginApp — Microservices Setup      ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Check prerequisites ──────────────────────────────────────
log "Checking prerequisites..."

if ! command -v node &>/dev/null; then
  err "Node.js not found. Install from https://nodejs.org"
  exit 1
fi
ok "Node.js $(node -v)"

if ! command -v npm &>/dev/null; then
  err "npm not found."
  exit 1
fi
ok "npm $(npm -v)"

if command -v psql &>/dev/null; then
  ok "PostgreSQL found"
  POSTGRES=true
else
  warn "PostgreSQL not found locally — user-service will fail until installed"
  warn "Install: https://www.postgresql.org/download/"
  POSTGRES=false
fi

if command -v redis-cli &>/dev/null; then
  ok "Redis found"
  REDIS=true
else
  warn "Redis not found — auth-service will run without session store (tokens still work)"
  warn "Install: https://redis.io/docs/getting-started/installation/"
  REDIS=false
fi

echo ""

# ── Install dependencies ─────────────────────────────────────
log "Installing dependencies..."

SERVICES=("api-gateway" "auth-service" "user-service" "notification-service" "frontend")
for svc in "${SERVICES[@]}"; do
  echo -n "   Installing ${svc}... "
  (cd "$svc" && npm install --silent 2>/dev/null)
  ok "done"
done

echo ""

# ── Create PostgreSQL DB ──────────────────────────────────────
if [ "$POSTGRES" = true ]; then
  log "Setting up PostgreSQL database..."
  if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw loginapp; then
    ok "Database 'loginapp' already exists"
  else
    if psql -U postgres -c "CREATE DATABASE loginapp;" 2>/dev/null; then
      ok "Created database 'loginapp'"
    else
      warn "Could not create database — you may need to create it manually:"
      warn "  psql -U postgres -c 'CREATE DATABASE loginapp;'"
    fi
  fi
fi

echo ""

# ── Print start instructions ──────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup Complete! 🎉               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Start each service in a separate terminal:${NC}"
echo ""
echo -e "  Terminal 1 — ${YELLOW}API Gateway${NC}"
echo "    cd api-gateway && npm run dev"
echo ""
echo -e "  Terminal 2 — ${YELLOW}Auth Service${NC}"
echo "    cd auth-service && npm run dev"
echo ""
echo -e "  Terminal 3 — ${YELLOW}User Service${NC}"
echo "    cd user-service && npm run dev"
echo ""
echo -e "  Terminal 4 — ${YELLOW}Notification Service${NC}"
echo "    cd notification-service && npm run dev"
echo ""
echo -e "  Terminal 5 — ${YELLOW}Frontend${NC}"
echo "    cd frontend && npm run dev"
echo ""
echo -e "${BLUE}Or use the start script:${NC}"
echo "    ./start-all.sh"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo "    Frontend  → http://localhost:3000"
echo "    Gateway   → http://localhost:4000"
echo "    Auth      → http://localhost:4001"
echo "    Users     → http://localhost:4002"
echo "    Notify    → http://localhost:4003"
echo ""
echo -e "${BLUE}Docker (Phase 2):${NC}"
echo "    docker compose up --build"
echo ""
