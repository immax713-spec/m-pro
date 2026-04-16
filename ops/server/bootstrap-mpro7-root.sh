#!/usr/bin/env bash

set -euo pipefail

SITE_ROOT="/var/www/html"
RELEASE_ROOT="${SITE_ROOT}/releases"
CURRENT_LINK="${SITE_ROOT}/current"
PLACEHOLDER_RELEASE="${RELEASE_ROOT}/bootstrap-empty"
NGINX_CONF_SOURCE="ops/nginx/mpro7-root-new-server.conf"
NGINX_CONF_TARGET="/etc/nginx/sites-available/mpro7-root"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash ops/server/bootstrap-mpro7-root.sh"
  exit 1
fi

apt update
apt install -y nginx rsync certbot python3-certbot-nginx

mkdir -p "${RELEASE_ROOT}"
touch "${SITE_ROOT}/.keep"

if [[ ! -e "${CURRENT_LINK}" ]]; then
  mkdir -p "${PLACEHOLDER_RELEASE}"
  cat > "${PLACEHOLDER_RELEASE}/index.html" <<'HTML'
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>mpro7.ru</title>
</head>
<body>
  <p>Waiting for the first deployment.</p>
</body>
</html>
HTML
  ln -sfn "${PLACEHOLDER_RELEASE}" "${CURRENT_LINK}"
fi

if [[ ! -f "${NGINX_CONF_TARGET}" ]]; then
  install -m 644 "${NGINX_CONF_SOURCE}" "${NGINX_CONF_TARGET}"
else
  echo "Nginx config already exists at ${NGINX_CONF_TARGET}; leaving it unchanged."
fi

ln -sfn "${NGINX_CONF_TARGET}" /etc/nginx/sites-enabled/mpro7-root

if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl enable --now nginx
systemctl reload nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
fi

echo "Bootstrap complete."
echo "Release root: ${RELEASE_ROOT}"
echo "Current symlink: ${CURRENT_LINK}"
echo "Nginx config: ${NGINX_CONF_TARGET}"
