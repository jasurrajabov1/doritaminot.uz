#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
USERNAME="${1:-alisher0505}"
PASSWORD="${2:-}"
if [ -z "$PASSWORD" ]; then
  echo "Ishlatish: sudo bash deploy/scripts/reset_admin_password_server.sh alisher0505 YangiParol"
  exit 1
fi
cd "$APP_DIR/backend"
source venv/bin/activate
python -X utf8 manage.py bootstrap_system "$USERNAME" "$PASSWORD" --first-name Alisher --last-name Tashov
systemctl restart pharm_demand_backend || true
echo "Password yangilandi: $USERNAME"
