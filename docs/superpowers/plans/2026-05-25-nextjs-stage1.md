# TripsPlan — Этап 1 (Next.js): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пересобрать фронтенд TripsPlan на Next.js: лендinг с описанием продукта, авторизация по email+паролю через Supabase, развилка после входа, экран «Мои поездки» и базовое создание поездки.

**Architecture:** Next.js (App Router, TypeScript) со статическим экспортом (`output: 'export'`). Лендинг — серверный компонент (пререндер), всё за входом — клиентские компоненты с авторизацией Supabase на стороне браузера. Бизнес-логика (валидация, маппинг ошибок, фабрика поездки, обращения к Supabase) вынесена в чистые/тонкие функции в `lib/` и покрыта юнит-тестами; React-компоненты тонкие.

**Tech Stack:** Next.js 15, React 19, TypeScript, `@supabase/supabase-js` v2, Vitest + @testing-library/react + jsdom, CSS Modules.

**Спек:** `docs/superpowers/specs/2026-05-25-nextjs-rebuild-stage1-design.md`

**ВАЖНО — безопасность живого сайта:** прод-сервер каждые 2 минуты выполняет `git reset --hard origin/main`. Поэтому весь Этап 1 ведётся на ветке `nextjs-stage1`; `main` (живой сайт) не трогаем до Задачи 14 (переключение). Не сливать в `main`, пока сервер не переведён на сборку Next.js.

---

## Структура файлов (что и зачем)

**Создаём:**
- `package.json`, `next.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `.eslintrc.json` — каркас Next.js.
- `vitest.config.mts`, `vitest.setup.ts` — тесты.
- `.env.local.example` — шаблон публичных ключей Supabase.
- `app/layout.tsx`, `app/globals.css` — корневой layout + палитра.
- `app/page.tsx` — лендинг `/`.
- `app/app/page.tsx` — «Мои поездки» `/app`.
- `app/app/new/page.tsx` — «Новая поездка» `/app/new`.
- `lib/supabase/client.ts` — singleton Supabase-клиента.
- `lib/auth.ts` — обёртки signUp/signIn/signOut/getSession.
- `lib/authErrors.ts` — `mapAuthError()` (чистая).
- `lib/validation.ts` — `validateCredentials()`, `validateNewTrip()` (чистые).
- `lib/entities.ts` — `createTripDoc()` + `DEFAULT_CATEGORIES` (чистая фабрика).
- `lib/trips.ts` — `listTrips()`, `createTrip()` (обращения к Supabase, принимают клиент аргументом).
- `lib/useSession.ts` — клиентский хук состояния сессии.
- `components/landing/SiteHeader.tsx`, `Hero.tsx`, `Steps.tsx`, `AuthCard.tsx` + их `*.module.css`.
- `components/trips/TripsHeader.tsx`, `TripsGrid.tsx`, `NewTripForm.tsx` + их `*.module.css`.
- `lib/*.test.ts`, `components/**/*.test.tsx` — тесты.
- `deploy/setup.next.sh`, обновление `deploy/update.sh` — деплой со сборкой.

**Перемещаем:**
- Текущий ванильный сайт (`index.html`, `css/`, `js/`, `README.md`-фронта) → `legacy/`.

**Не трогаем:** `supabase/`, `docs/`, существующие `config.local.js` (остаётся вне git), `.github/`.

---

## Task 1: Ветка + перенос старого сайта в legacy/

**Files:**
- Move: `index.html`, `css/`, `js/` → `legacy/`
- Modify: `package.json` (заменяется в Task 2)

- [ ] **Step 1: Создать рабочую ветку**

Run:
```bash
cd /Users/vakhterov/Desktop/seoul-trip
git checkout -b nextjs-stage1
```
Expected: `Switched to a new branch 'nextjs-stage1'`

- [ ] **Step 2: Перенести ванильный сайт в legacy/ (сохраняя историю)**

Run:
```bash
mkdir -p legacy
git mv index.html legacy/index.html
git mv css legacy/css
git mv js legacy/js
git mv package.json legacy/package.json
```
Expected: команды выполняются без ошибок. `config.local.js` (вне git) оставить в корне — он понадобится legacy-серверу; в новый Next.js он не используется.

- [ ] **Step 3: Проверить, что перенос корректен**

Run: `ls legacy && git status --short`
Expected: в `legacy/` лежат `index.html css js package.json`; git показывает переименования (`R`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: перенос ванильного сайта в legacy/ перед пересборкой на Next.js

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Каркас Next.js (App Router, TS, статический экспорт)

**Files:**
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `next-env.d.ts`, `.eslintrc.json`, `.gitignore` (дополнить)

- [ ] **Step 1: Создать `package.json`**

```json
{
  "name": "tripsplan",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/supabase-js": "2.48.1"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "@types/node": "22.10.7",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "eslint": "9.18.0",
    "eslint-config-next": "15.1.6",
    "vitest": "3.0.4",
    "@vitejs/plugin-react": "4.3.4",
    "jsdom": "26.0.0",
    "@testing-library/react": "16.2.0",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/user-event": "14.6.1"
  }
}
```

- [ ] **Step 2: Создать `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',          // статический экспорт в out/
  images: { unoptimized: true },
  trailingSlash: true,       // чтобы nginx отдавал /app/ как /app/index.html
};

export default nextConfig;
```

- [ ] **Step 3: Создать `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "legacy"]
}
```

- [ ] **Step 4: Создать `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Создать `.eslintrc.json`**

```json
{ "extends": "next/core-web-vitals" }
```

- [ ] **Step 6: Дополнить `.gitignore`**

Добавить строки (если их нет):
```
/node_modules
/.next
/out
next-env.d.ts
.env.local
.env.production
```

- [ ] **Step 7: Установить зависимости**

Run: `npm install`
Expected: установка без ошибок, появляется `package-lock.json` и `node_modules/`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.mjs tsconfig.json next-env.d.ts .eslintrc.json .gitignore
git commit -m "chore: каркас Next.js (App Router, TS, статический экспорт)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Настройка тестов (Vitest + RTL)

**Files:**
- Create: `vitest.config.mts`, `vitest.setup.ts`, `lib/smoke.test.ts`

- [ ] **Step 1: Создать `vitest.config.mts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules', 'legacy', '.next', 'out'],
  },
  resolve: { alias: { '@': resolve(__dirname, '.') } },
});
```

- [ ] **Step 2: Создать `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Написать smoke-тест**

`lib/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';

describe('окружение тестов', () => {
  it('работает', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test`
Expected: PASS, 1 тест проходит.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.mts vitest.setup.ts lib/smoke.test.ts
git commit -m "test: настройка Vitest + Testing Library

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Глобальные стили + корневой layout

**Files:**
- Create: `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Создать `app/globals.css` (палитра из legacy + база)**

```css
:root {
  --navy: #0f1b3d;
  --navy-2: #1c2c5e;
  --accent: #e8463c;
  --bg: #f4f5f8;
  --card: #ffffff;
  --text: #1a2238;
  --muted: #6b7385;
  --line: #e6e8ef;
  --radius: 16px;
  --shadow: 0 8px 30px rgba(15, 27, 61, 0.10);
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

a { color: inherit; text-decoration: none; }
button { font-family: inherit; cursor: pointer; }

* { touch-action: manipulation; }

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 2: Создать `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TripsPlan — планировщик путешествий',
  description:
    'Введите перелёт и даты — TripsPlan построит календарь поездки. Наполняйте дни местами вручную, по ссылкам или с помощью ИИ.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Проверить, что dev-сервер поднимается (временная заглушка)**

Создать временный `app/page.tsx`:
```tsx
export default function Home() {
  return <main style={{ padding: 40 }}>TripsPlan — заглушка</main>;
}
```
Run: `npm run build`
Expected: сборка успешна, появляется папка `out/` с `index.html`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat: глобальные стили (палитра) + корневой layout

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Маппинг ошибок авторизации (чистая функция + тест)

**Files:**
- Create: `lib/authErrors.ts`, `lib/authErrors.test.ts`

- [ ] **Step 1: Написать тест**

`lib/authErrors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { mapAuthError } from '@/lib/authErrors';

describe('mapAuthError', () => {
  it('неверные учётные данные', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' }))
      .toBe('Неверный email или пароль');
  });
  it('email уже зарегистрирован', () => {
    expect(mapAuthError({ message: 'User already registered' }))
      .toBe('Этот email уже зарегистрирован — войдите');
  });
  it('слишком короткий пароль', () => {
    expect(mapAuthError({ message: 'Password should be at least 6 characters' }))
      .toBe('Пароль должен быть не короче 6 символов');
  });
  it('неизвестная ошибка → общий текст', () => {
    expect(mapAuthError({ message: 'some weird error' }))
      .toBe('Что-то пошло не так. Попробуйте ещё раз');
  });
  it('null → пустая строка', () => {
    expect(mapAuthError(null)).toBe('');
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npm test -- authErrors`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `lib/authErrors.ts`**

```ts
export interface AuthErrorLike {
  message?: string;
  status?: number;
}

export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return '';
  const m = (error.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Этот email уже зарегистрирован — войдите';
  }
  if (m.includes('password should be at least')) {
    return 'Пароль должен быть не короче 6 символов';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Проверьте формат email';
  }
  return 'Что-то пошло не так. Попробуйте ещё раз';
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npm test -- authErrors`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add lib/authErrors.ts lib/authErrors.test.ts
git commit -m "feat: mapAuthError — русские сообщения об ошибках входа

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Валидация форм (чистые функции + тесты)

**Files:**
- Create: `lib/validation.ts`, `lib/validation.test.ts`

- [ ] **Step 1: Написать тест**

`lib/validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateCredentials, validateNewTrip } from '@/lib/validation';

describe('validateCredentials', () => {
  it('пустые поля', () => {
    const e = validateCredentials('', '');
    expect(e.email).toBe('Введите email');
    expect(e.password).toBe('Введите пароль');
  });
  it('кривой email', () => {
    expect(validateCredentials('abc', 'secret1').email).toBe('Проверьте формат email');
  });
  it('короткий пароль', () => {
    expect(validateCredentials('a@b.ru', '123').password)
      .toBe('Пароль должен быть не короче 6 символов');
  });
  it('валидные данные → нет ошибок', () => {
    expect(validateCredentials('a@b.ru', 'secret1')).toEqual({});
  });
});

describe('validateNewTrip', () => {
  const ok = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' };
  it('валидно → нет ошибок', () => {
    expect(validateNewTrip(ok)).toEqual({});
  });
  it('обязательные поля', () => {
    const e = validateNewTrip({ title: '', country: '', city: '', startDate: '', endDate: '' });
    expect(e.title).toBeTruthy();
    expect(e.country).toBeTruthy();
    expect(e.city).toBeTruthy();
    expect(e.startDate).toBeTruthy();
    expect(e.endDate).toBeTruthy();
  });
  it('дата конца раньше начала', () => {
    expect(validateNewTrip({ ...ok, endDate: '2026-06-01' }).endDate)
      .toBe('Дата конца не раньше начала поездки');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- validation`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `lib/validation.ts`**

```ts
export interface CredentialErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!email.trim()) errors.email = 'Введите email';
  else if (!EMAIL_RE.test(email)) errors.email = 'Проверьте формат email';
  if (!password) errors.password = 'Введите пароль';
  else if (password.length < 6) errors.password = 'Пароль должен быть не короче 6 символов';
  return errors;
}

export interface NewTripInput {
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

export type NewTripErrors = Partial<Record<keyof NewTripInput, string>>;

export function validateNewTrip(input: NewTripInput): NewTripErrors {
  const errors: NewTripErrors = {};
  if (!input.title.trim()) errors.title = 'Введите название поездки';
  if (!input.country.trim()) errors.country = 'Укажите страну';
  if (!input.city.trim()) errors.city = 'Укажите город';
  if (!input.startDate) errors.startDate = 'Укажите дату начала';
  if (!input.endDate) errors.endDate = 'Укажите дату конца';
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = 'Дата конца не раньше начала поездки';
  }
  return errors;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- validation`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validation.ts lib/validation.test.ts
git commit -m "feat: валидация форм входа и новой поездки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Фабрика документа поездки (чистая + тест)

**Files:**
- Create: `lib/entities.ts`, `lib/entities.test.ts`

- [ ] **Step 1: Написать тест**

`lib/entities.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createTripDoc, DEFAULT_CATEGORIES } from '@/lib/entities';

describe('createTripDoc', () => {
  const input = { title: ' Сеул ', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' };

  it('тримит название и заполняет поля', () => {
    const t = createTripDoc(input);
    expect(t.title).toBe('Сеул');
    expect(t.country).toBe('Корея');
    expect(t.city).toBe('Сеул');
    expect(t.startDate).toBe('2026-06-07');
    expect(t.endDate).toBe('2026-06-15');
  });

  it('даёт непустой строковый id с префиксом trip_', () => {
    const t = createTripDoc(input);
    expect(typeof t.id).toBe('string');
    expect(t.id.startsWith('trip_')).toBe(true);
  });

  it('инициализирует пустые коллекции и дефолтные категории', () => {
    const t = createTripDoc(input);
    expect(t.days).toEqual([]);
    expect(t.places).toEqual([]);
    expect(t.inbox).toEqual([]);
    expect(t.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('генерирует разные id', () => {
    expect(createTripDoc(input).id).not.toBe(createTripDoc(input).id);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- entities`
Expected: FAIL.

- [ ] **Step 3: Реализовать `lib/entities.ts`**

```ts
export interface Category {
  key: string;
  label: string;
  color: string;
}

// Стартовый набор категорий (порт из legacy js/model/config.js).
export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'start', label: 'Прилёт/отъезд', color: '#6b7385' },
  { key: 'tour', label: 'Экскурсии', color: '#2f6fd6' },
  { key: 'dist', label: 'Прогулки', color: '#159a93' },
  { key: 'shop', label: 'Шопинг', color: '#d98a1b' },
  { key: 'trend', label: 'Тренды', color: '#9a55c9' },
];

export interface TripDoc {
  id: string;
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  lead: string;
  note: string;
  currency: string;
  categories: Category[];
  days: unknown[];
  places: unknown[];
  inbox: unknown[];
}

export interface CreateTripInput {
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

function newId(): string {
  return `trip_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createTripDoc(input: CreateTripInput): TripDoc {
  return {
    id: newId(),
    title: input.title.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    lead: '',
    note: '',
    currency: 'RUB',
    categories: DEFAULT_CATEGORIES,
    days: [],
    places: [],
    inbox: [],
  };
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- entities`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/entities.ts lib/entities.test.ts
git commit -m "feat: createTripDoc — фабрика документа поездки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Supabase-клиент + обёртки авторизации

**Files:**
- Create: `lib/supabase/client.ts`, `lib/auth.ts`, `.env.local.example`

- [ ] **Step 1: Создать `.env.local.example`**

```
# Публичные ключи Supabase (безопасны в браузере, защищены RLS).
# Скопировать в .env.local для разработки и в .env.production на сервере.
NEXT_PUBLIC_SUPABASE_URL=https://wcipnwgniynriazvqucn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

- [ ] **Step 2: Создать `lib/supabase/client.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Не заданы NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  cached = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return cached;
}
```

- [ ] **Step 3: Создать `lib/auth.ts` (тонкие обёртки)**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function signUp(supabase: SupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(supabase: SupabaseClient, email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
```

- [ ] **Step 4: Проверить типобезопасность сборки**

Run: `npx tsc --noEmit`
Expected: без ошибок типов.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/client.ts lib/auth.ts .env.local.example
git commit -m "feat: Supabase-клиент + обёртки авторизации

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Чтение и создание поездок (с моком Supabase + тесты)

**Files:**
- Create: `lib/trips.ts`, `lib/trips.test.ts`

- [ ] **Step 1: Написать тест с фейковым клиентом**

`lib/trips.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listTrips, createTrip } from '@/lib/trips';
import type { SupabaseClient } from '@supabase/supabase-js';

function fakeClientForList(rows: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ order });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as SupabaseClient;
}

describe('listTrips', () => {
  it('разворачивает row.data в объект поездки с id', async () => {
    const client = fakeClientForList([
      { id: 'trip_1', data: { id: 'trip_1', title: 'Сеул', city: 'Сеул' }, created_at: 'x' },
    ]);
    const trips = await listTrips(client);
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip_1');
    expect(trips[0].title).toBe('Сеул');
  });

  it('пустой результат → []', async () => {
    const trips = await listTrips(fakeClientForList([]));
    expect(trips).toEqual([]);
  });

  it('ошибка Supabase → исключение', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const client = { from: () => ({ select: () => ({ order }) }) } as unknown as SupabaseClient;
    await expect(listTrips(client)).rejects.toThrow();
  });
});

describe('createTrip', () => {
  it('вставляет { id, data } и возвращает документ', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as SupabaseClient;
    const doc = { id: 'trip_x', title: 'Токио' } as never;
    const res = await createTrip(client, doc);
    expect(insert).toHaveBeenCalledWith({ id: 'trip_x', data: doc });
    expect(res).toBe(doc);
  });

  it('ошибка вставки → исключение', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'rls' } });
    const client = { from: () => ({ insert }) } as unknown as SupabaseClient;
    await expect(createTrip(client, { id: 'a' } as never)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- trips`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `lib/trips.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TripDoc } from '@/lib/entities';

export type TripSummary = TripDoc & { id: string };

export async function listTrips(supabase: SupabaseClient): Promise<TripSummary[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('id,data,created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: { id: string; data: TripDoc }) => ({
    ...row.data,
    id: row.id,
  }));
}

export async function createTrip(supabase: SupabaseClient, doc: TripDoc): Promise<TripDoc> {
  // user_id проставляется БД по умолчанию из auth.uid() (см. миграцию).
  const { error } = await supabase.from('trips').insert({ id: doc.id, data: doc });
  if (error) throw error;
  return doc;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npm test -- trips`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/trips.ts lib/trips.test.ts
git commit -m "feat: listTrips/createTrip через Supabase

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Презентационные компоненты лендинга (Header, Hero, Steps)

**Files:**
- Create: `components/landing/SiteHeader.tsx` (+ `.module.css`), `Hero.tsx` (+ `.module.css`), `Steps.tsx` (+ `.module.css`)

- [ ] **Step 1: `components/landing/SiteHeader.tsx`**

```tsx
import styles from './SiteHeader.module.css';

export function SiteHeader({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>Trips<b>Plan</b></div>
      <nav className={styles.nav}>
        <a href="#how">Как это работает</a>
        <button type="button" className={styles.login} onClick={onLoginClick}>Войти</button>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: `components/landing/SiteHeader.module.css`**

```css
.bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: var(--navy); color: #fff; }
.logo { font-weight: 800; font-size: 18px; }
.logo b { color: var(--accent); }
.nav { display: flex; align-items: center; gap: 18px; font-size: 14px; color: #c7cde0; }
.login { background: transparent; border: 1px solid rgba(255,255,255,.4); color: #fff; border-radius: 8px; padding: 7px 16px; font-weight: 600; }
.login:hover { background: rgba(255,255,255,.1); }
@media (max-width: 560px) { .nav a { display: none; } }
```

- [ ] **Step 3: `components/landing/Hero.tsx`**

```tsx
import styles from './Hero.module.css';

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.hero}>
      <div className={styles.split}>
        <div>
          <h1 className={styles.title}>Маршрут путешествия — по дням и по часам</h1>
          <p className={styles.lead}>
            Введите перелёт и даты — TripsPlan построит календарь поездки. Наполняйте
            дни местами: вручную, по ссылкам из блогов и карт или с помощью ИИ. Всё на одной карте.
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>Бесплатно</span>
            <span className={styles.pill}>Синхронизация между устройствами</span>
            <span className={styles.pill}>Карта и расписание</span>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: `components/landing/Hero.module.css`**

```css
.hero { padding: 56px 32px; background: linear-gradient(160deg, #0f1b3d, #1c2c5e); }
.split { display: grid; grid-template-columns: 1.05fr .95fr; gap: 40px; align-items: center; max-width: 1080px; margin: 0 auto; }
.title { color: #fff; font-size: 36px; line-height: 1.12; margin: 0 0 16px; }
.lead { color: #c7cde0; font-size: 16px; line-height: 1.5; margin: 0 0 20px; }
.pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill { font-size: 12px; color: #dbe0f0; border: 1px solid rgba(255,255,255,.22); border-radius: 999px; padding: 6px 12px; }
@media (max-width: 860px) { .split { grid-template-columns: 1fr; gap: 28px; } .title { font-size: 28px; } }
```

- [ ] **Step 5: `components/landing/Steps.tsx`**

```tsx
import styles from './Steps.module.css';

const STEPS = [
  { ic: '✍️', title: 'Соберите сам', text: 'Добавляйте места и время руками, меняйте порядок перетаскиванием.' },
  { ic: '🔗', title: 'Киньте ссылку', text: 'Вставьте ссылку из блога или карт — место добавится в поездку.' },
  { ic: '🤖', title: 'Соберите через ИИ', text: 'ИИ раскидает места по дням с учётом географии и времени.' },
];

export function Steps() {
  return (
    <section id="how" className={styles.steps}>
      {STEPS.map((s) => (
        <div key={s.title} className={styles.step}>
          <div className={styles.ic}>{s.ic}</div>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 6: `components/landing/Steps.module.css`**

```css
.steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; padding: 32px; max-width: 1080px; margin: 0 auto; }
.step { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px; }
.ic { font-size: 24px; }
.step h3 { margin: 10px 0 4px; font-size: 15px; color: var(--navy); }
.step p { margin: 0; font-size: 13px; color: var(--muted); line-height: 1.45; }
@media (max-width: 760px) { .steps { grid-template-columns: 1fr; } }
```

- [ ] **Step 7: Сборка не падает**

Run: `npx tsc --noEmit`
Expected: без ошибок.

- [ ] **Step 8: Commit**

```bash
git add components/landing/SiteHeader.tsx components/landing/SiteHeader.module.css components/landing/Hero.tsx components/landing/Hero.module.css components/landing/Steps.tsx components/landing/Steps.module.css
git commit -m "feat: презентационные компоненты лендинга (Header, Hero, Steps)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: AuthCard (форма входа/регистрации) + тест

**Files:**
- Create: `components/landing/AuthCard.tsx` (+ `.module.css`), `components/landing/AuthCard.test.tsx`

- [ ] **Step 1: Написать тест поведения**

`components/landing/AuthCard.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthCard } from '@/components/landing/AuthCard';

describe('AuthCard', () => {
  it('показывает ошибки валидации при пустой отправке', async () => {
    const onSubmit = vi.fn();
    render(<AuthCard initialMode="signup" onSubmit={onSubmit} serverError="" busy={false} />);
    await userEvent.click(screen.getByRole('button', { name: /Начать планировать/i }));
    expect(screen.getByText('Введите email')).toBeInTheDocument();
    expect(screen.getByText('Введите пароль')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('вызывает onSubmit с данными при валидной отправке', async () => {
    const onSubmit = vi.fn();
    render(<AuthCard initialMode="signin" onSubmit={onSubmit} serverError="" busy={false} />);
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.ru');
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret1');
    await userEvent.click(screen.getByRole('button', { name: /^Войти$/i }));
    expect(onSubmit).toHaveBeenCalledWith('signin', 'a@b.ru', 'secret1');
  });

  it('показывает серверную ошибку', () => {
    render(<AuthCard initialMode="signin" onSubmit={vi.fn()} serverError="Неверный email или пароль" busy={false} />);
    expect(screen.getByText('Неверный email или пароль')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- AuthCard`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать `components/landing/AuthCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { validateCredentials, type CredentialErrors } from '@/lib/validation';
import styles from './AuthCard.module.css';

export type AuthMode = 'signup' | 'signin';

interface Props {
  initialMode: AuthMode;
  onSubmit: (mode: AuthMode, email: string, password: string) => void;
  serverError: string;
  busy: boolean;
}

export function AuthCard({ initialMode, onSubmit, serverError, busy }: Props) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<CredentialErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateCredentials(email, password);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(mode, email, password);
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit} noValidate>
      <div className={styles.tabs} role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'signup'}
          className={mode === 'signup' ? styles.tabOn : styles.tab}
          onClick={() => setMode('signup')}>Регистрация</button>
        <button type="button" role="tab" aria-selected={mode === 'signin'}
          className={mode === 'signin' ? styles.tabOn : styles.tab}
          onClick={() => setMode('signin')}>Вход</button>
      </div>

      <label className={styles.label} htmlFor="email">Email</label>
      <input id="email" type="email" className={styles.input} value={email}
        autoComplete="email" disabled={busy}
        onChange={(e) => setEmail(e.target.value)} />
      {errors.email && <div className={styles.err}>{errors.email}</div>}

      <label className={styles.label} htmlFor="password">Пароль</label>
      <input id="password" type="password" className={styles.input} value={password}
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} disabled={busy}
        onChange={(e) => setPassword(e.target.value)} />
      {errors.password && <div className={styles.err}>{errors.password}</div>}

      {serverError && <div className={styles.serverErr}>{serverError}</div>}

      <button type="submit" className={styles.cta} disabled={busy}>
        {busy ? 'Подождите…' : mode === 'signup' ? 'Начать планировать' : 'Войти'}
      </button>

      <p className={styles.fine}>
        Регистрируясь, вы создаёте личный аккаунт — поездки видны только вам.
      </p>
    </form>
  );
}
```

- [ ] **Step 4: `components/landing/AuthCard.module.css`**

```css
.card { background: #fff; border-radius: 14px; padding: 22px; box-shadow: 0 8px 28px rgba(0,0,0,.22); }
.tabs { display: flex; gap: 6px; background: #f1f3f9; border-radius: 10px; padding: 4px; margin-bottom: 16px; }
.tab, .tabOn { flex: 1; text-align: center; font-size: 13px; font-weight: 600; padding: 9px; border-radius: 7px; border: 0; background: transparent; color: var(--muted); }
.tabOn { background: #fff; color: var(--navy); box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.label { display: block; font-size: 12px; color: var(--navy); font-weight: 600; margin: 12px 0 4px; }
.input { width: 100%; border: 1px solid #d4d8e6; border-radius: 9px; padding: 11px 12px; font-size: 14px; background: #fafbff; }
.input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
.err { color: var(--accent); font-size: 12px; margin-top: 4px; }
.serverErr { color: #fff; background: var(--accent); border-radius: 8px; padding: 8px 10px; font-size: 13px; margin-top: 12px; }
.cta { width: 100%; background: var(--accent); color: #fff; border: 0; border-radius: 9px; padding: 13px; font-weight: 700; font-size: 14px; margin-top: 16px; }
.cta:disabled { opacity: .6; cursor: default; }
.fine { font-size: 11px; color: var(--muted); text-align: center; margin: 10px 0 0; }
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npm test -- AuthCard`
Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```bash
git add components/landing/AuthCard.tsx components/landing/AuthCard.module.css components/landing/AuthCard.test.tsx
git commit -m "feat: AuthCard — форма входа/регистрации с валидацией

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Страница лендинга `/` (связывание + авторизация)

**Files:**
- Modify/Replace: `app/page.tsx`
- Create: `app/page.module.css`

- [ ] **Step 1: Заменить `app/page.tsx` на клиентскую страницу-связку**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { Hero } from '@/components/landing/Hero';
import { Steps } from '@/components/landing/Steps';
import { AuthCard, type AuthMode } from '@/components/landing/AuthCard';
import { getSupabase } from '@/lib/supabase/client';
import { signUp, signIn } from '@/lib/auth';
import { mapAuthError } from '@/lib/authErrors';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleAuth(m: AuthMode, email: string, password: string) {
    setBusy(true);
    setServerError('');
    try {
      const supabase = getSupabase();
      if (m === 'signup') await signUp(supabase, email, password);
      else await signIn(supabase, email, password);
      router.replace('/app');
    } catch (e) {
      setServerError(mapAuthError(e as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <SiteHeader onLoginClick={() => setMode('signin')} />
      <Hero>
        <AuthCard
          key={mode}
          initialMode={mode}
          onSubmit={handleAuth}
          serverError={serverError}
          busy={busy}
        />
      </Hero>
      <Steps />
    </main>
  );
}
```

(Примечание: `key={mode}` пересоздаёт `AuthCard` при клике «Войти» в шапке, чтобы открыть нужную вкладку.)

- [ ] **Step 2: Удалить временную заглушку стилей, если была; собрать**

Run: `npm run build`
Expected: сборка успешна, `out/index.html` существует.

- [ ] **Step 3: Ручная проверка в dev (с ключами)**

Создать `.env.local` из `.env.local.example` с реальными ключами Supabase.
Run: `npm run dev` и открыть http://localhost:3000
Expected: лендинг отображается (шапка, hero с формой справа, три карточки снизу); форма переключает вкладки; пустая отправка показывает ошибки.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: страница лендинга / со связанной авторизацией

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Хук сессии + защищённые экраны (/app, /app/new)

**Files:**
- Create: `lib/useSession.ts`, `components/trips/TripsHeader.tsx` (+ `.module.css`), `components/trips/TripsGrid.tsx` (+ `.module.css`), `components/trips/NewTripForm.tsx` (+ `.module.css`), `components/trips/TripsGrid.test.tsx`
- Create: `app/app/page.tsx` (+ `app/app/page.module.css`), `app/app/new/page.tsx`

- [ ] **Step 1: Создать `lib/useSession.ts`**

```ts
'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

export type SessionState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; session: Session; email: string };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const s = data.session;
      setState(s ? { status: 'authed', session: s, email: s.user.email ?? '' } : { status: 'anon' });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setState(s ? { status: 'authed', session: s, email: s.user.email ?? '' } : { status: 'anon' });
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}
```

- [ ] **Step 2: Создать `components/trips/TripsHeader.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import styles from './TripsHeader.module.css';

export function TripsHeader({ email }: { email: string }) {
  const router = useRouter();
  async function handleLogout() {
    await signOut(getSupabase());
    router.replace('/');
  }
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>Trips<b>Plan</b></div>
      <div className={styles.right}>
        <span className={styles.email}>{email}</span>
        <button type="button" className={styles.logout} onClick={handleLogout}>Выйти</button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Создать `components/trips/TripsHeader.module.css`**

```css
.bar { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: var(--navy); color: #fff; }
.logo { font-weight: 800; font-size: 18px; }
.logo b { color: var(--accent); }
.right { display: flex; align-items: center; gap: 14px; }
.email { font-size: 13px; color: #c7cde0; }
.logout { background: transparent; border: 1px solid rgba(255,255,255,.4); color: #fff; border-radius: 8px; padding: 6px 14px; font-weight: 600; }
```

- [ ] **Step 4: Написать тест TripsGrid**

`components/trips/TripsGrid.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TripsGrid } from '@/components/trips/TripsGrid';

const trips = [
  { id: 't1', title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' },
] as never[];

describe('TripsGrid', () => {
  it('рисует карточки поездок и кнопку новой', () => {
    render(<TripsGrid trips={trips} onNew={vi.fn()} onOpen={vi.fn()} />);
    expect(screen.getByText('Сеул')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Новая поездка/i })).toBeInTheDocument();
  });

  it('клик по карточке вызывает onOpen с id', async () => {
    const onOpen = vi.fn();
    render(<TripsGrid trips={trips} onNew={vi.fn()} onOpen={onOpen} />);
    screen.getByText('Сеул').click();
    expect(onOpen).toHaveBeenCalledWith('t1');
  });
});
```

- [ ] **Step 5: Запустить — убедиться, что падает**

Run: `npm test -- TripsGrid`
Expected: FAIL (модуль не найден).

- [ ] **Step 6: Создать `components/trips/TripsGrid.tsx`**

```tsx
'use client';

import type { TripSummary } from '@/lib/trips';
import styles from './TripsGrid.module.css';

interface Props {
  trips: TripSummary[];
  onNew: () => void;
  onOpen: (id: string) => void;
}

export function TripsGrid({ trips, onNew, onOpen }: Props) {
  return (
    <div className={styles.grid}>
      {trips.map((t) => (
        <button key={t.id} type="button" className={styles.card} onClick={() => onOpen(t.id)}>
          <h3 className={styles.title}>{t.title}</h3>
          <p className={styles.meta}>{t.city}, {t.country}</p>
          <p className={styles.dates}>{t.startDate} — {t.endDate}</p>
        </button>
      ))}
      <button type="button" className={styles.newCard} onClick={onNew}>+ Новая поездка</button>
    </div>
  );
}
```

- [ ] **Step 7: Создать `components/trips/TripsGrid.module.css`**

```css
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; max-width: 980px; margin: 28px auto; padding: 0 24px; }
.card { text-align: left; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 18px; box-shadow: var(--shadow); }
.card:hover { border-color: var(--accent); }
.title { margin: 0 0 6px; font-size: 16px; color: var(--navy); }
.meta { margin: 0 0 4px; font-size: 13px; color: var(--muted); }
.dates { margin: 0; font-size: 12px; color: var(--muted); }
.newCard { display: flex; align-items: center; justify-content: center; min-height: 110px; border: 2px dashed #c7cde0; border-radius: 12px; background: transparent; color: var(--navy); font-weight: 700; font-size: 14px; }
.newCard:hover { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 8: Запустить — убедиться, что проходит**

Run: `npm test -- TripsGrid`
Expected: PASS.

- [ ] **Step 9: Создать `components/trips/NewTripForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { validateNewTrip, type NewTripErrors, type NewTripInput } from '@/lib/validation';
import styles from './NewTripForm.module.css';

interface Props {
  onCreate: (input: NewTripInput) => void;
  busy: boolean;
  serverError: string;
}

const EMPTY: NewTripInput = { title: '', country: '', city: '', startDate: '', endDate: '' };

export function NewTripForm({ onCreate, busy, serverError }: Props) {
  const [form, setForm] = useState<NewTripInput>(EMPTY);
  const [errors, setErrors] = useState<NewTripErrors>({});

  function set<K extends keyof NewTripInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateNewTrip(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onCreate(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.h1}>Новая поездка</h1>

      <label className={styles.label} htmlFor="title">Название</label>
      <input id="title" className={styles.input} value={form.title} disabled={busy}
        onChange={(e) => set('title', e.target.value)} />
      {errors.title && <div className={styles.err}>{errors.title}</div>}

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="country">Страна</label>
          <input id="country" className={styles.input} value={form.country} disabled={busy}
            onChange={(e) => set('country', e.target.value)} />
          {errors.country && <div className={styles.err}>{errors.country}</div>}
        </div>
        <div>
          <label className={styles.label} htmlFor="city">Город</label>
          <input id="city" className={styles.input} value={form.city} disabled={busy}
            onChange={(e) => set('city', e.target.value)} />
          {errors.city && <div className={styles.err}>{errors.city}</div>}
        </div>
      </div>

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="startDate">Дата начала</label>
          <input id="startDate" type="date" className={styles.input} value={form.startDate} disabled={busy}
            onChange={(e) => set('startDate', e.target.value)} />
          {errors.startDate && <div className={styles.err}>{errors.startDate}</div>}
        </div>
        <div>
          <label className={styles.label} htmlFor="endDate">Дата конца</label>
          <input id="endDate" type="date" className={styles.input} value={form.endDate} disabled={busy}
            onChange={(e) => set('endDate', e.target.value)} />
          {errors.endDate && <div className={styles.err}>{errors.endDate}</div>}
        </div>
      </div>

      {serverError && <div className={styles.serverErr}>{serverError}</div>}

      <button type="submit" className={styles.cta} disabled={busy}>
        {busy ? 'Создаём…' : 'Создать поездку'}
      </button>
    </form>
  );
}
```

- [ ] **Step 10: Создать `components/trips/NewTripForm.module.css`**

```css
.form { max-width: 540px; margin: 36px auto; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 28px; box-shadow: var(--shadow); }
.h1 { margin: 0 0 18px; font-size: 22px; color: var(--navy); }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.label { display: block; font-size: 12px; color: var(--navy); font-weight: 600; margin: 12px 0 4px; }
.input { width: 100%; border: 1px solid #d4d8e6; border-radius: 9px; padding: 11px 12px; font-size: 14px; background: #fafbff; }
.input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
.err { color: var(--accent); font-size: 12px; margin-top: 4px; }
.serverErr { color: #fff; background: var(--accent); border-radius: 8px; padding: 8px 10px; font-size: 13px; margin-top: 14px; }
.cta { width: 100%; background: var(--accent); color: #fff; border: 0; border-radius: 9px; padding: 13px; font-weight: 700; font-size: 14px; margin-top: 18px; }
.cta:disabled { opacity: .6; }
@media (max-width: 520px) { .row { grid-template-columns: 1fr; } }
```

- [ ] **Step 11: Создать `app/app/page.tsx` («Мои поездки» + развилка)**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { listTrips, type TripSummary } from '@/lib/trips';
import { TripsHeader } from '@/components/trips/TripsHeader';
import { TripsGrid } from '@/components/trips/TripsGrid';
import styles from './page.module.css';

export default function TripsPage() {
  const router = useRouter();
  const session = useSession();
  const [trips, setTrips] = useState<TripSummary[] | null>(null);

  useEffect(() => {
    if (session.status === 'anon') { router.replace('/'); return; }
    if (session.status !== 'authed') return;
    listTrips(getSupabase()).then((list) => {
      if (list.length === 0) router.replace('/app/new');
      else setTrips(list);
    });
  }, [session.status, router]);

  if (session.status !== 'authed' || trips === null) {
    return <div className={styles.loading}>Загрузка…</div>;
  }

  return (
    <main>
      <TripsHeader email={session.email} />
      <h1 className={styles.h1}>Мои поездки</h1>
      <TripsGrid
        trips={trips}
        onNew={() => router.push('/app/new')}
        onOpen={() => router.push('/app/new?soon=1')}
      />
    </main>
  );
}
```

(Примечание: открытие существующей поездки на Этапе 1 — заглушка; здесь временно ведём на `/app/new?soon=1`, на Этапе 2 заменим на маршрут планировщика. Если нужна явная страница-заглушка «Скоро» — добавить в Этапе 2.)

- [ ] **Step 12: Создать `app/app/page.module.css`**

```css
.h1 { max-width: 980px; margin: 24px auto 0; padding: 0 24px; font-size: 24px; color: var(--navy); }
.loading { padding: 80px; text-align: center; color: var(--muted); }
```

- [ ] **Step 13: Создать `app/app/new/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/useSession';
import { getSupabase } from '@/lib/supabase/client';
import { createTrip } from '@/lib/trips';
import { createTripDoc } from '@/lib/entities';
import { NewTripForm } from '@/components/trips/NewTripForm';
import { TripsHeader } from '@/components/trips/TripsHeader';
import type { NewTripInput } from '@/lib/validation';

export default function NewTripPage() {
  const router = useRouter();
  const session = useSession();
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (session.status === 'anon') router.replace('/');
  }, [session.status, router]);

  async function handleCreate(input: NewTripInput) {
    setBusy(true);
    setServerError('');
    try {
      const doc = createTripDoc(input);
      await createTrip(getSupabase(), doc);
      router.replace('/app');
    } catch {
      setServerError('Не удалось сохранить поездку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }

  if (session.status !== 'authed') return null;

  return (
    <main>
      <TripsHeader email={session.email} />
      <NewTripForm onCreate={handleCreate} busy={busy} serverError={serverError} />
    </main>
  );
}
```

- [ ] **Step 14: Прогнать все тесты и сборку**

Run: `npm test && npm run build`
Expected: все тесты PASS; сборка успешна; в `out/` есть `index.html`, `app/index.html`, `app/new/index.html`.

- [ ] **Step 15: Commit**

```bash
git add lib/useSession.ts components/trips app/app
git commit -m "feat: защищённые экраны — Мои поездки, развилка, создание поездки

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Деплой со сборкой + переключение (cutover)

**Files:**
- Create: `deploy/setup.next.sh`
- Modify: `deploy/update.sh`

> Выполнять ТОЛЬКО после ручной проверки Этапа 1 в dev и успешного `npm run build`. Эта задача меняет живой сервер.

- [ ] **Step 1: Обновить `deploy/update.sh` (добавить сборку)**

```bash
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
```

- [ ] **Step 2: Создать `deploy/setup.next.sh` (первичная настройка сервера под Next.js)**

```bash
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
```

- [ ] **Step 3: Commit (всё ещё в ветке nextjs-stage1)**

```bash
git add deploy/update.sh deploy/setup.next.sh
git commit -m "deploy: сборка Next.js на сервере + первичная настройка

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Слить ветку в main и переключить сервер (cutover — выполняет человек/агент по готовности)**

Порядок (важен, чтобы не уронить живой сайт):
1. `git checkout main && git merge --no-ff nextjs-stage1`
2. `git push origin main`
3. На сервере один раз: `ssh root@194.87.243.143 'curl -fsSL https://raw.githubusercontent.com/svakhterov-glitch/seoul-trip/main/deploy/setup.next.sh | bash'`
   (ставит Node, собирает, переключает nginx root на `out/`, после чего HTTPS уже настроен сертификатом из прошлой настройки — проверить `certbot` не требуется, конфиг 80→443 сохранён отдельным include либо повторно прогнать `certbot --nginx`).
4. Проверить: `curl -fsS -o /dev/null -w "%{http_code}\n" https://tripsplan.ru/` → `200`; открыть сайт, зарегистрироваться, создать поездку.

> Откат: вернуть `root` nginx на `/var/www/seoul-trip/legacy` (или прежний `seoul-trip`) и `git revert` merge. Старый ванильный сайт лежит в `legacy/`.

- [ ] **Step 5: Финальная проверка критериев готовности**

Пройти все 9 критериев из спека (раздел «Критерии готовности Этапа 1») на боевом домене.

---

## Самопроверка плана (выполнено автором)

- **Покрытие спека:** лендинг (Tasks 4,10,11,12), авторизация email+пароль (8,12), ошибки по-русски (5,11,12), развилка после входа (13), «Мои поездки» (13), создание поездки (7,9,13), валидация (6,11,13), статический экспорт + деплой (2,14), перенос в legacy/ (1). Все 9 критериев готовности имеют задачи.
- **Плейсхолдеры:** отсутствуют — в каждом шаге реальный код/команды.
- **Согласованность типов:** `NewTripInput`/`NewTripErrors` (lib/validation) используются в NewTripForm; `TripDoc` (lib/entities) → `createTripDoc` → `createTrip`; `TripSummary` (lib/trips) → TripsGrid/страница; `AuthMode`, `CredentialErrors` согласованы между AuthCard и validation; `getSupabase()` — единое имя во всех вызовах.
- **Открытые вопросы спека** (подтверждение email, восстановление пароля, seed Сеула) намеренно вне Этапа 1.
