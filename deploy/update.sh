#!/usr/bin/env bash
# Подтягивает свежий код из GitHub и пересобирает Next.js — только если
# origin/main изменился (иначе выходит, не нагружая сервер сборкой каждые 2 мин).
# Делает сервер точной копией origin/main, ставит зависимости и собирает в out/.
# .env.production (вне git) с ключами Supabase не удаляется при reset.
set -euo pipefail
DIR=/var/www/seoul-trip
export PATH="/usr/bin:/usr/local/bin:$PATH"
# Не запускать вторую сборку поверх первой (cron раз в ~2 мин). Без этого
# наложенные npm ci + next build загоняют маленький VPS в своп и кладут nginx.
exec 9>/tmp/seoul-trip-deploy.lock
flock -n 9 || { echo "deploy уже идёт — пропускаю"; exit 0; }
# Снижаем приоритет сборки, чтобы nginx оставался отзывчивым.
NICE="nice -n 10"; command -v ionice >/dev/null && NICE="ionice -c3 $NICE"
git -C "$DIR" fetch --quiet origin main
LOCAL=$(git -C "$DIR" rev-parse HEAD)
REMOTE=$(git -C "$DIR" rev-parse origin/main)
# Пересобираем, если код изменился ИЛИ сборки ещё нет (первый запуск/после сбоя).
if [ "$LOCAL" = "$REMOTE" ] && [ -f "$DIR/out/index.html" ]; then
  exit 0
fi
git -C "$DIR" reset --hard --quiet origin/main
cd "$DIR"
$NICE npm ci --no-audit --no-fund
$NICE npm run build
