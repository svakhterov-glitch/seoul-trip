#!/usr/bin/env bash
# Подтягивает свежий код из GitHub на сервер. Делает сервер точной
# копией origin/main. config.local.js (untracked, в .gitignore) при
# reset --hard НЕ удаляется. Статика nginx перезапуска не требует.
set -euo pipefail
DIR=/var/www/seoul-trip
git -C "$DIR" fetch --quiet origin main
git -C "$DIR" reset --hard --quiet origin/main
