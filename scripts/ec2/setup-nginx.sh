#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$HOME/soothsayer}"
SERVER_NAME="${SERVER_NAME:-100.48.60.255}"
NGINX_CONF_SRC="${ROOT_DIR}/infra/ec2/nginx/soothsayer.conf"
NGINX_CONF_DST="/etc/nginx/conf.d/soothsayer.conf"

if [ ! -f "${NGINX_CONF_SRC}" ]; then
  echo "Missing nginx template: ${NGINX_CONF_SRC}"
  exit 1
fi

echo "[1/5] Installing nginx"
sudo dnf install -y nginx

echo "[2/5] Writing Soothsayer nginx config for ${SERVER_NAME}"
tmp_file="$(mktemp)"
sed "s/server_name 100.48.60.255;/server_name ${SERVER_NAME};/" "${NGINX_CONF_SRC}" > "${tmp_file}"
sudo cp "${tmp_file}" "${NGINX_CONF_DST}"
rm -f "${tmp_file}"

echo "[3/5] Testing nginx configuration"
sudo nginx -t

echo "[4/5] Enabling and restarting nginx"
sudo systemctl enable nginx
sudo systemctl restart nginx

echo "[5/5] Nginx reverse proxy active"
echo "Open: http://${SERVER_NAME}/login"
