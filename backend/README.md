# Бэкенд — настройка (≈15–20 минут)

Каркас уже написан. Чтобы он заработал, нужно создать аккаунты и вставить
ключи. **Секреты не коммитим** — они идут в `config.local.js` (фронт) и в
секреты Supabase (функции). Без этого шага приложение продолжает работать
локально (localStorage + заглушка ИИ).

Что даёт бэкенд:
- **Синхронизацию** поездок между устройствами (Supabase + БД).
- **«Чтение» ссылок** — развернуть короткую ссылку, прочитать страницу,
  понять место (функция `resolve-link`, + Claude по желанию).
- **Настоящую ИИ-генерацию** маршрута (`generate-itinerary`, Claude).
- **Тренды из Kakao** (`trends`, по желанию).

---

## 1. Supabase (БД + функции)

1. Зарегистрируйся на https://supabase.com → создай проект (запиши пароль БД).
2. **SQL:** Dashboard → SQL Editor → вставь и выполни весь `backend/schema.sql`.
3. **Ключи:** Project Settings → API → скопируй `Project URL` и `anon public key`.
4. Установи CLI и залогинься:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <ref-из-URL>
   ```
5. **Деплой функций** (из папки проекта):
   ```bash
   supabase functions deploy resolve-link --no-verify-jwt
   supabase functions deploy generate-itinerary --no-verify-jwt
   supabase functions deploy trends --no-verify-jwt
   ```
   > `--no-verify-jwt` — функции вызываются из браузера без пользовательского
   > токена. Если захочешь закрыть их, убери флаг и добавь проверку.

## 2. Ключи для функций (секреты Supabase)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # для ИИ и «чтения» ссылок
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6   # (необязательно)
supabase secrets set KAKAO_REST_KEY=...                  # (необязательно, тренды)
```
- Anthropic-ключ: https://console.anthropic.com/ → API Keys.
- Kakao REST-ключ: https://developers.kakao.com/ → приложение → REST API key.

## 3. Подключить фронт

```bash
cp config.local.example.js config.local.js
```
Впиши в `config.local.js`: `supabase.url`, `supabase.anonKey`, `functionsUrl`
(обычно `https://<ref>.functions.supabase.co`). Файл уже в `.gitignore`.

## 4. Авторизация (для синхронизации БД) — уже реализовано

Таблица `trips` защищена RLS — каждый видит только свои поездки. Экран входа
готов (Supabase Auth, email+пароль):
1. Заполни блок `supabase` в `config.local.js` (url + anonKey).
2. В шапке появится кнопка **🔑 Войти** → страница `#/login` → регистрация/вход.
3. После входа приложение переключается в облачный режим и пишет поездки в БД
   под твоим пользователем; «Выйти» возвращает в локальный режим.

Supabase Dashboard → Authentication: включи **Email** провайдер. Для быстрого
старта можно отключить подтверждение email (Auth → Providers → Email →
Confirm email = off), иначе после регистрации нужно подтвердить письмо.

> Разбор ссылок и ИИ-генерацию можно включить **без БД и входа** — достаточно
> задеплоить функции и указать `functionsUrl` (блок `supabase` не заполнять —
> останется localStorage).

---

## Откат

Вся бэкенд-работа — в ветке `backend-scaffold`. Чтобы отказаться:
`git checkout main` (ветку можно удалить). Фронт на `main` не затронут.
