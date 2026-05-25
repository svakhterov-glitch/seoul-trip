#!/usr/bin/env bash
# Подтягивает свежий код из GitHub и пересобирает Next.js.
# Делает сервер точной копией origin/main, ставит зависимости и собирает в out/.
# .env.production (вне git) с ключами Supabase не удаляется при reset.
set -euo pipefail
DIR=/var/www/seoul-trip
export PATH="/usr/bin:/usr/local/bin:$PATH"
git -C "$DIR" fetch --quiet origin main
git -C "$DIR" reset --hard --quiet origin/main
cd "$DIR"
npm ci --no-audit --no-fund
npm run build
