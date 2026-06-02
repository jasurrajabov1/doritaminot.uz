#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
SERVICE_NAME="${SERVICE_NAME:-pharm_demand_backend}"
if [ $# -lt 1 ]; then
  echo "Ishlatish: sudo bash deploy/scripts/restore_sqlite.sh /path/to/db_backup.sqlite3"
  exit 1
fi
BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: backup file topilmadi: $BACKUP_FILE"
  exit 1
fi
systemctl stop "$SERVICE_NAME" || true
cp "$APP_DIR/backend/db.sqlite3" "$APP_DIR/backend/db.sqlite3.before_restore_$(date +%Y%m%d_%H%M%S)" || true
cp "$BACKUP_FILE" "$APP_DIR/backend/db.sqlite3"
chown www-data:www-data "$APP_DIR/backend/db.sqlite3" || true
chmod 660 "$APP_DIR/backend/db.sqlite3" || true
systemctl start "$SERVICE_NAME"
echo "Restore OK"
