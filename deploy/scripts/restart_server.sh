#!/usr/bin/env bash
set -euo pipefail
SERVICE_NAME="${SERVICE_NAME:-pharm_demand_backend}"
sudo systemctl restart "$SERVICE_NAME"
sudo nginx -t
sudo systemctl reload nginx
echo "Restart OK"
