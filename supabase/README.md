# Бэкенд — деплой через GitHub

Структура стандартная для Supabase:
- `supabase/migrations/` — схема БД (таблица `trips` jsonb, RLS, индексы).
- `supabase/functions/` — edge-функции: `resolve-link`, `generate-itinerary`,
  `trends` (+ общий `_shared`).
- `supabase/config.toml` — конфиг (функции без проверки JWT).

Деплой автоматический по пушу в `main` — два способа на выбор. **Секреты — в
настройках GitHub/Supabase, не в коде.** Без подключённого Supabase приложение
работает локально (localStorage), как раньше.

---

## Сначала: проект Supabase (один раз)

1. supabase.com → New project (запиши пароль БД).
2. Settings → API → запиши **Project URL** (`https://<ref>.supabase.co`) и
   **anon key**. `<ref>` — часть до `.supabase.co`.
3. Authentication → Providers → **Email**: включить. Для быстрого старта можно
   отключить подтверждение email (Confirm email = off).

---

## Способ A — встроенная интеграция Supabase + GitHub (проще)

Supabase сам деплоит миграции и функции при пуше, без GitHub Actions.

1. Залей репозиторий на GitHub (этим займёмся вместе).
2. Supabase Dashboard → **Integrations → GitHub → Connect repository**, выбери
   репозиторий и ветку `main`, каталог `supabase/`.
3. Секреты функций — Dashboard → Edge Functions → Secrets:
   `ANTHROPIC_API_KEY` (и при желании `KAKAO_REST_KEY`).
4. Пуш в `main` → Supabase применит миграции и задеплоит функции.

## Способ B — GitHub Actions (workflow уже в репозитории)

Файл `.github/workflows/deploy-supabase.yml`. Добавь секреты репозитория
(**Settings → Secrets and variables → Actions → New repository secret**):

| Секрет | Откуда | Обязателен |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens | да |
| `SUPABASE_PROJECT_REF` | `<ref>` из Project URL | да |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | для ИИ/ссылок |
| `KAKAO_REST_KEY` | developers.kakao.com | для трендов |
| `SUPABASE_DB_PASSWORD` | пароль БД проекта | для миграций из CI |

Пуш в `main` (или Actions → Run workflow) → задеплоятся функции, синхронизируются
секреты, при наличии `SUPABASE_DB_PASSWORD` применятся миграции.

> Если миграции не гонишь из CI — примени схему один раз вручную:
> Dashboard → SQL Editor → вставь содержимое `supabase/migrations/*_init.sql`.

---

## Подключить фронтенд

```bash
cp config.local.example.js config.local.js
```
Впиши `supabase.url`, `supabase.anonKey`, `functionsUrl`
(`https://<ref>.functions.supabase.co`). Файл в `.gitignore`.

- Только функции (без БД/входа): заполни `functionsUrl` → заработают «чтение»
  ссылок и ИИ.
- Синхронизация: заполни блок `supabase` → в шапке кнопка **🔑 Войти** →
  страница `#/login` → данные пишутся в облако под твоим пользователем.

(Для опубликованного фронтенда anon-ключ безопасен в браузере — он защищён RLS.)
