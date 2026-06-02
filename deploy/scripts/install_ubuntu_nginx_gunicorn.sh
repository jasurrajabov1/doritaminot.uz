#!/usr/bin/env bash
set -euo pipefail

# Pharm Demand System — Ubuntu + Nginx + Gunicorn auto install.
# Usage:
#   sudo bash deploy/scripts/install_ubuntu_nginx_gunicorn.sh example.uz
#   sudo bash deploy/scripts/install_ubuntu_nginx_gunicorn.sh 1.2.3.4

APP_DIR="${APP_DIR:-/var/www/pharm_demand_system}"
SERVER_NAME="${1:-${SERVER_NAME:-*}}"
PYTHON_BIN="${PYTHON_BIN:-python3}"
APP_USER="${APP_USER:-www-data}"
APP_GROUP="${APP_GROUP:-www-data}"
SERVICE_NAME="${SERVICE_NAME:-pharm_demand_backend}"
NGINX_SITE="${NGINX_SITE:-pharm_demand_system}"
GUNICORN_BIND="${GUNICORN_BIND:-127.0.0.1:8000}"
GUNICORN_WORKERS="${GUNICORN_WORKERS:-3}"

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: bu scriptni sudo/root bilan ishga tushiring."
  exit 1
fi

if [ ! -d "$APP_DIR/backend" ] || [ ! -f "$APP_DIR/backend/manage.py" ]; then
  echo "ERROR: $APP_DIR ichida backend/manage.py topilmadi."
  echo "ZIP faylni /var/www/pharm_demand_system ichiga oching."
  exit 1
fi

if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
  echo "ERROR: frontend/dist/index.html topilmadi."
  exit 1
fi

echo "==> Python versiya tekshirilmoqda..."
$PYTHON_BIN - <<'PY_VERSION_CHECK'
import sys
if sys.version_info < (3, 12):
    raise SystemExit("ERROR: Django 6 uchun Python 3.12+ kerak. Ubuntu 24.04 yoki Python 3.12/3.13 ishlating.")
print(f"Python OK: {sys.version.split()[0]}")
PY_VERSION_CHECK

echo "==> Kerakli paketlar o'rnatilmoqda..."
if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx python3 python3-venv python3-pip unzip curl
else
  echo "DIQQAT: apt-get topilmadi. nginx/python3-venv/pip ni qo'lda o'rnating."
fi

cd "$APP_DIR/backend"

echo "==> Backend virtualenv tayyorlanmoqda..."
$PYTHON_BIN -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

if [ "$SERVER_NAME" = "*" ] || [ "$SERVER_NAME" = "_" ]; then
  ALLOWED_HOSTS="*"
  TRUSTED_ORIGINS=""
  NGINX_SERVER_NAME="_"
else
  ALLOWED_HOSTS="$SERVER_NAME,127.0.0.1,localhost"
  TRUSTED_ORIGINS="http://$SERVER_NAME,https://$SERVER_NAME"
  NGINX_SERVER_NAME="$SERVER_NAME"
fi

if [ ! -s "$APP_DIR/backend/.env" ] || grep -q "bu-yerga\|CHANGE_ME\|dev-only" "$APP_DIR/backend/.env"; then
  echo "==> Yangi backend/.env yaratilmoqda..."
  SECRET_KEY=$(python - <<'PY_SECRET'
import secrets
print(secrets.token_urlsafe(64))
PY_SECRET
)
  cat > "$APP_DIR/backend/.env" <<ENV_EOF
DJANGO_SECRET_KEY=$SECRET_KEY
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=$ALLOWED_HOSTS
DJANGO_CSRF_TRUSTED_ORIGINS=$TRUSTED_ORIGINS
DJANGO_CORS_ALLOWED_ORIGINS=$TRUSTED_ORIGINS
DJANGO_SECURE_SSL_REDIRECT=False
DJANGO_SECURE_HSTS_SECONDS=0
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=False
DJANGO_SECURE_HSTS_PRELOAD=False
DJANGO_SESSION_COOKIE_SECURE=False
DJANGO_CSRF_COOKIE_SECURE=False
DJANGO_SQLITE_TIMEOUT=30
DJANGO_DATA_UPLOAD_MAX_MEMORY_SIZE=104857600
DJANGO_FILE_UPLOAD_MAX_MEMORY_SIZE=104857600
ENV_EOF
else
  echo "==> backend/.env bor, mavjud sozlamalar saqlandi."
fi

echo "==> Django migrate/seed/collectstatic..."
python -X utf8 manage.py migrate
python -X utf8 manage.py seed_roles || true
python -X utf8 manage.py collectstatic --noinput

echo "==> Systemd service yozilmoqda..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE_EOF
[Unit]
Description=Pharm Demand Django Backend
After=network.target

[Service]
User=$APP_USER
Group=$APP_GROUP
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
ExecStart=$APP_DIR/backend/venv/bin/gunicorn config.wsgi:application --bind $GUNICORN_BIND --workers $GUNICORN_WORKERS --timeout 180
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE_EOF

echo "==> Nginx config yozilmoqda..."
cat > "/etc/nginx/sites-available/${NGINX_SITE}" <<NGINX_EOF
server {
    listen 80;
    server_name $NGINX_SERVER_NAME;

    client_max_body_size 100M;

    root $APP_DIR/frontend/dist;
    index index.html;

    location /assets/ {
        try_files \$uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://$GUNICORN_BIND/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
    }

    location /admin/ {
        proxy_pass http://$GUNICORN_BIND/admin/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 180s;
        proxy_read_timeout 180s;
    }

    location /static/ {
        alias $APP_DIR/backend/staticfiles/;
        expires 30d;
        access_log off;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX_EOF

ln -sf "/etc/nginx/sites-available/${NGINX_SITE}" "/etc/nginx/sites-enabled/${NGINX_SITE}"
rm -f /etc/nginx/sites-enabled/default || true

echo "==> Fayl ruxsatlari sozlanmoqda..."
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chmod 750 "$APP_DIR/backend" || true
chmod 640 "$APP_DIR/backend/.env" || true
chmod 660 "$APP_DIR/backend/db.sqlite3" || true

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
nginx -t
systemctl reload nginx

echo ""
echo "============================================================"
echo "TAYYOR: Pharm Demand System web serverda ishga tushdi."
echo "URL: http://$NGINX_SERVER_NAME/login"
echo "Agar SERVER_NAME='_' bo'lsa, server IP orqali oching."
echo "Status: sudo systemctl status $SERVICE_NAME"
echo "Log:    sudo journalctl -u $SERVICE_NAME -f"
echo "============================================================"
