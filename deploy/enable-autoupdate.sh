#!/usr/bin/env bash
# Включает автообновление сайта: cron каждые 2 минуты запускает
# update.sh (git pull). flock не даёт запускам наслаиваться.
set -euo pipefail

cat > /etc/cron.d/seoul-trip-update <<'EOF'
# Автообновление сайта seoul-trip из GitHub каждые 2 минуты
*/2 * * * * root /usr/bin/flock -n /tmp/seoul-update.lock bash /var/www/seoul-trip/deploy/update.sh >> /var/log/seoul-update.log 2>&1
EOF
chmod 0644 /etc/cron.d/seoul-trip-update

# Гарантируем, что cron установлен и запущен
export DEBIAN_FRONTEND=noninteractive
command -v crontab >/dev/null 2>&1 || apt-get install -y cron
systemctl enable --now cron >/dev/null 2>&1 || service cron restart || true

echo "=== Автообновление включено: сервер тянет GitHub каждые 2 минуты ==="
echo "Лог обновлений: /var/log/seoul-update.log"
