#!/usr/bin/env bash
# Run this ONCE on the production server (as root, via SSH) to wire up
# aaPanel's Nginx to proxy /api to the Node backend and serve the React
# SPA correctly on refresh/direct navigation.
#
# Usage:
#   scp this file to the server, then:
#     chmod +x aapanel-setup.sh
#     DOMAIN=inauguration.transportersfortinubu.ng ./aapanel-setup.sh
#
# It only touches aaPanel's own include directories (proxy/ and rewrite/),
# so it won't be wiped out by later changes made through the panel UI.

set -euo pipefail

DOMAIN="${DOMAIN:?Set DOMAIN, e.g. DOMAIN=inauguration.transportersfortinubu.ng ./aapanel-setup.sh}"
API_PORT="${API_PORT:-8787}"

PROXY_DIR="/www/server/panel/vhost/nginx/proxy/${DOMAIN}"
REWRITE_FILE="/www/server/panel/vhost/rewrite/${DOMAIN}.conf"

echo "==> Configuring aaPanel Nginx for ${DOMAIN} (API on 127.0.0.1:${API_PORT})"

mkdir -p "$PROXY_DIR"
cat > "${PROXY_DIR}/api.conf" <<EOF
location /api/ {
    proxy_pass http://127.0.0.1:${API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF
echo "  wrote ${PROXY_DIR}/api.conf"

cat > "$REWRITE_FILE" <<'EOF'
location / {
    try_files $uri $uri/ /index.html;
}
EOF
echo "  wrote ${REWRITE_FILE}"

echo "==> Testing Nginx config"
nginx -t

echo "==> Reloading Nginx"
systemctl reload nginx || service nginx reload

echo "==> Done. Try logging in again at https://${DOMAIN}/login"
