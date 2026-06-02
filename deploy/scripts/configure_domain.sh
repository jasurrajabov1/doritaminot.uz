#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
DOMAIN="${1:-}"
SCHEME="${2:-http}"
if [ -z "$DOMAIN" ]; then
  echo "Ishlatish: sudo bash deploy/scripts/configure_domain.sh example.uz [http|https]"
  exit 1
fi
if [ "$SCHEME" = "https" ]; then
  SECURE_SSL_REDIRECT=True
  HSTS=31536000
  COOKIE_SECURE=True
else
  SECURE_SSL_REDIRECT=False
  HSTS=0
  COOKIE_SECURE=False
fi
SECRET_KEY=$(python3 - <<'PY_SECRET'
import secrets
print(secrets.token_urlsafe(64))
PY_SECRET
)
cat > "$APP_DIR/backend/.env" <<ENV_EOF
DJANGO_SECRET_KEY=$SECRET_KEY
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=$DOMAIN,127.0.0.1,localhost
DJANGO_CSRF_TRUSTED_ORIGINS=http://$DOMAIN,https://$DOMAIN
DJANGO_CORS_ALLOWED_ORIGINS=http://$DOMAIN,https://$DOMAIN
DJANGO_SECURE_SSL_REDIRECT=$SECURE_SSL_REDIRECT
DJANGO_SECURE_HSTS_SECONDS=$HSTS
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=$COOKIE_SECURE
DJANGO_SECURE_HSTS_PRELOAD=$COOKIE_SECURE
DJANGO_SESSION_COOKIE_SECURE=$COOKIE_SECURE
DJANGO_CSRF_COOKIE_SECURE=$COOKIE_SECURE
DJANGO_SQLITE_TIMEOUT=30
DJANGO_DATA_UPLOAD_MAX_MEMORY_SIZE=104857600
DJANGO_FILE_UPLOAD_MAX_MEMORY_SIZE=104857600
ENV_EOF
sed -i "s/server_name .*/server_name $DOMAIN;/" /etc/nginx/sites-available/pharm_demand_system || true
chown www-data:www-data "$APP_DIR/backend/.env" || true
chmod 640 "$APP_DIR/backend/.env" || true
systemctl restart pharm_demand_backend
nginx -t
systemctl reload nginx
echo "Domain sozlandi: $SCHEME://$DOMAIN/login"
