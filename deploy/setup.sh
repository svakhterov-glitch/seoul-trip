#!/usr/bin/env bash
# ============================================================
# Развёртывание статического сайта seoul-trip на Ubuntu/Debian
# (nginx). Идемпотентно: повторный запуск обновляет код.
#
# Использование (на сервере, под root):
#   curl -fsSL https://raw.githubusercontent.com/svakhterov-glitch/seoul-trip/main/deploy/setup.sh \
#     | bash -s -- "<SUPABASE_URL>" "<SUPABASE_KEY>" "<FUNCTIONS_URL>"
#
# Без аргументов сайт встанет в локальном режиме (localStorage).
# Ключ publishable безопасен для браузера (защищён RLS) и всё
# равно отдаётся каждому посетителю в config.local.js.
# ============================================================
set -euo pipefail

SUPA_URL="${1:-}"
SUPA_KEY="${2:-}"
FN_URL="${3:-}"
DIR=/var/www/seoul-trip
REPO=https://github.com/svakhterov-glitch/seoul-trip.git

echo ">>> Установка nginx и git…"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git

echo ">>> Получение кода…"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin main
  git -C "$DIR" reset --hard origin/main
else
  rm -rf "$DIR"
  git clone "$REPO" "$DIR"
fi

if [ -n "$SUPA_URL" ] && [ -n "$SUPA_KEY" ]; then
  echo ">>> Запись config.local.js (подключение к Supabase)…"
  cat > "$DIR/config.local.js" <<EOF
export default {
  supabase: {
    url: "$SUPA_URL",
    anonKey: "$SUPA_KEY",
  },
  functionsUrl: "$FN_URL",
};
EOF
else
  echo ">>> Supabase не передан — локальный режим (localStorage)."
fi

echo ">>> Настройка nginx…"
cat > /etc/nginx/sites-available/seoul-trip <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    root /var/www/seoul-trip;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/seoul-trip /etc/nginx/sites-enabled/seoul-trip
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

IP="$(hostname -I | awk '{print $1}')"
echo ""
echo "=== ГОТОВО. Сайт доступен: http://${IP}/ ==="
