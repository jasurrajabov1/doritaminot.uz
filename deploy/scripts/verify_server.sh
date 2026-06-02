#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
SERVICE_NAME="${SERVICE_NAME:-pharm_demand_backend}"
echo "== Files =="
test -f "$APP_DIR/backend/manage.py" && echo "OK backend/manage.py"
test -f "$APP_DIR/backend/db.sqlite3" && echo "OK backend/db.sqlite3"
test -f "$APP_DIR/frontend/dist/index.html" && echo "OK frontend/dist/index.html"
echo "== Django check =="
cd "$APP_DIR/backend"
source venv/bin/activate
python -X utf8 manage.py check
echo "== Service =="
systemctl --no-pager status "$SERVICE_NAME" || true
echo "== Nginx =="
nginx -t
echo "Verify finished"
