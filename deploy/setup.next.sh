#!/usr/bin/env bash
# Первичная настройка VPS под Next.js-сборку TripsPlan.
# Ставит Node LTS, nginx, собирает сайт, отдаёт out/.
# Запуск под root:
#   curl -fsSL https://raw.githubusercontent.com/svakhterov-glitch/seoul-trip/main/deploy/setup.next.sh | bash
set -euo pipefail
DIR=/var/www/seoul-trip
REPO=https://github.com/svakhterov-glitch/seoul-trip.git
export DEBIAN_FRONTEND=noninteractive

echo ">>> Node LTS + nginx + git…"
apt-get update -y
apt-get install -y ca-certificates curl gnupg git nginx
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt-get update -y
apt-get install -y nodejs

echo ">>> Код…"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch origin main && git -C "$DIR" reset --hard origin/main
else
  rm -rf "$DIR"; git clone "$REPO" "$DIR"
fi

echo ">>> Ключи Supabase (.env.production) — если ещё нет…"
if [ ! -f "$DIR/.env.production" ]; then
  cat > "$DIR/.env.production" <<EOF
NEXT_PUBLIC_SUPABASE_URL=https://wcipnwgniynriazvqucn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_KRJndMFAM0J-CXhcSIx0Fg_JCcjhdzL
EOF
fi

echo ">>> Сборка…"
cd "$DIR"
npm ci --no-audit --no-fund
npm run build

echo ">>> nginx → out/…"
cat > /etc/nginx/sites-available/seoul-trip <<'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name tripsplan.ru www.tripsplan.ru;
    root /var/www/seoul-trip/out;
    index index.html;
    location / { try_files $uri $uri/ $uri.html /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/seoul-trip /etc/nginx/sites-enabled/seoul-trip
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
echo "=== ГОТОВО. Next.js-сборка отдаётся nginx ==="
