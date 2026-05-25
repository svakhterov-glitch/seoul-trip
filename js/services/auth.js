/* ============================================================
   АВТОРИЗАЦИЯ (Supabase Auth через REST)
   Вход/регистрация по email+паролю, хранение сессии в localStorage,
   автообновление токена. Без SDK — обычный fetch. Токен отдаётся
   в SupabaseRepository для запросов под RLS.
   ============================================================ */

const KEY = "seoul-trip:auth";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
function clear() { localStorage.removeItem(KEY); }

function store(d) {
  save({
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    user: d.user,
    expires_at: Date.now() + (d.expires_in || 3600) * 1000,
  });
}

export function currentUser() { return load()?.user || null; }
export function isLoggedIn() { return !!load()?.access_token; }

export async function signIn(supabase, email, password) {
  const r = await fetch(`${supabase.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: supabase.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || "Не удалось войти");
  store(d);
  return d.user;
}

export async function signUp(supabase, email, password) {
  const r = await fetch(`${supabase.url}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: supabase.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || d.msg || "Не удалось зарегистрироваться");
  // если подтверждение email выключено — сразу приходит сессия
  if (d.access_token) store(d);
  return d; // d.access_token отсутствует → нужно подтвердить email
}

export async function signOut(supabase) {
  const s = load();
  if (s?.access_token) {
    try {
      await fetch(`${supabase.url}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: supabase.anonKey, Authorization: `Bearer ${s.access_token}` },
      });
    } catch { /* ignore */ }
  }
  clear();
}

/* действующий токен (с автообновлением, если истекает) */
export async function getAccessToken(supabase) {
  const s = load();
  if (!s) return null;
  if (Date.now() < (s.expires_at || 0) - 60000) return s.access_token;
  try {
    const r = await fetch(`${supabase.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { apikey: supabase.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    const d = await r.json();
    if (r.ok && d.access_token) { store(d); return d.access_token; }
  } catch { /* ignore */ }
  return s.access_token; // запасной вариант (может быть просрочен)
}
