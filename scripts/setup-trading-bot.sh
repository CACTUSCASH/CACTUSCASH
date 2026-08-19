#!/usr/bin/env bash
set -euo pipefail

# Run inside the VM to set up the trading bot as a persistent systemd service

REPO_DIR="${HOME}/CACTUSCASH"
SERVICE_NAME="cactuscash-bot"

log() { printf "\033[1;32m[setup]\033[0m %s\n" "$1"; }

log "Cloning repository..."
if [[ ! -d "$REPO_DIR" ]]; then
  git clone https://github.com/CACTUSCASH/CACTUSCASH.git "$REPO_DIR"
fi

cd "$REPO_DIR/trading-bot"

log "Installing dependencies..."
npm install

log "Creating .env file..."
if [[ ! -f .env ]]; then
  cat > .env <<'ENV'
EXCHANGE_API_KEY=your_api_key_here
EXCHANGE_API_SECRET=your_api_secret_here
NODE_ENV=production
ENV
  log "Edit trading-bot/.env with your exchange API keys"
fi

log "Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<SERVICE
[Unit]
Description=CactusCash Trading Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${USER}
WorkingDirectory=${REPO_DIR}/trading-bot
EnvironmentFile=${REPO_DIR}/trading-bot/.env
ExecStart=/usr/bin/node ${REPO_DIR}/scripts/orchestrator.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl start ${SERVICE_NAME}

log "Service status:"
sudo systemctl status ${SERVICE_NAME} --no-pager || true

log "=== Setup complete ==="
log "Bot running as systemd service: ${SERVICE_NAME}"
log "Dashboard: http://localhost:3000"
log "Logs: journalctl -u ${SERVICE_NAME} -f"
log "Stop: sudo systemctl stop ${SERVICE_NAME}"
log "Restart: sudo systemctl restart ${SERVICE_NAME}"
