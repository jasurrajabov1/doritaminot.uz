#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
cp "$APP_DIR/backend/db.sqlite3" "$BACKUP_DIR/db_$TS.sqlite3"
echo "Backup: $BACKUP_DIR/db_$TS.sqlite3"
