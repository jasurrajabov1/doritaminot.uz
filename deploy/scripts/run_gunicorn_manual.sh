#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
cd "$APP_DIR/backend"
source venv/bin/activate
exec gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3 --timeout 180
