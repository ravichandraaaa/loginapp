#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  start-all.sh — Launch all services concurrently
#  Requires: npm install -g concurrently
# ═══════════════════════════════════════════════════════════════

if ! command -v concurrently &>/dev/null; then
  echo "Installing concurrently globally..."
  npm install -g concurrently
fi

concurrently \
  --names "GATEWAY,AUTH,USERS,NOTIFY,FRONTEND" \
  --prefix-colors "cyan,magenta,yellow,green,blue" \
  --kill-others-on-fail \
  "cd api-gateway      && npm run dev" \
  "cd auth-service     && npm run dev" \
  "cd user-service     && npm run dev" \
  "cd notification-service && npm run dev" \
  "cd frontend         && npm run dev"
