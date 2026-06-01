// ============================================================
// EDGE-ФУНКЦИЯ: telegram-webhook  (Telegram-предложка)
//
// Принимает апдейты Telegram (бот в группе). Что делает:
//   1) проверяет секрет вебхука (заголовок X-Telegram-Bot-Api-Secret-Token);
//   2) «/connect <код>» — привязывает chat_id группы к поездке (tg_links);
//   3) обычное сообщение СО ССЫЛКОЙ → разбирает ссылку (зовёт resolve-link),
//      классифицирует место|покупка по домену, пишет в tg_suggestions;
//   4) отвечает в группу коротким подтверждением.
//
// Пишет в БД сервис-ролью (минует RLS). Деплой:
//   supabase functions deploy telegram-webhook --no-verify-jwt
// Секреты: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET
//   (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY — инжектятся).
// ============================================================

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const AI_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
// Бакет Storage для фото из сообщений (создаётся миграцией, public).
const PHOTO_BUCKET = "tg-photos";
// Ключевые слова покупок — фолбэк-классификация текста без ссылки (если ИИ недоступен).
const SHOP_WORDS = ["бад", "крем", "маска", "сыворотк", "желе", "косметик", "уход",
  "шампун", "купить", "товар", "набор", "тонер", "эссенц", "патчи", "витамин", "духи", "парфюм"];

// Домены интернет-магазинов → пункт попадает в «Покупки» (иначе «Места»).
const SHOP_DOMAINS = [
  "oliveyoung.", "coupang.", "gmarket.", "musinsa.", "smartstore.naver.",
  "kream.", "11st.", "ssg.com", "gsshop.", "wconcept.", "aliexpress.",
  "amazon.", "stylenanda.", "29cm.", "ablem",
];

Deno.serve(async (req) => {
  // Telegram всегда POST. Всегда отвечаем 200 (иначе Telegram заштормит ретраями).
  if (req.method !== "POST") return new Response("ok");
  // Защита вебхука секретом (Telegram шлёт его в заголовке).
  if (WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }
  try {
    const update = await req.json();
    await handleUpdate(update);
  } catch (e) {
    console.error("telegram-webhook error:", e);
  }
  return new Response("ok");
});

async function handleUpdate(update: any): Promise<void> {
  const msg = update?.message ?? update?.channel_post;
  if (!msg) return;
  const chatId = String(msg.chat?.id ?? "");
  if (!chatId) return;
  const text: string = (msg.text ?? msg.caption ?? "").toString();
  const fromUser: string = (msg.from?.first_name ?? msg.from?.username ?? "").toString();

  // 1) Команда /connect <код> — привязка чата к поездке.
  const cmd = parseCommand(text);
  if (cmd?.name === "connect") {
    await handleConnect(chatId, cmd.arg, msg.message_id);
    return;
  }
  if (cmd?.name === "start") {
    await reply(chatId, "Привет! Я собираю ссылки из этого чата в предложку поездки.\nЧтобы подключить группу — пришлите: /connect КОД (код возьмите в приложении).", msg.message_id);
    return;
  }

  // 2) Чат должен быть подключён к поездке.
  const tripId = await tripForChat(chatId);
  if (!tripId) return; // не подключено — молчим (без спама)

  const added: string[] = [];

  // 3a) Сообщения СО ССЫЛКОЙ — разбираем каждую (resolve-link + домен).
  const urls = extractUrls(text, msg.entities ?? msg.caption_entities ?? []);
  if (urls.length > 0) {
    for (const url of urls.slice(0, 5)) {
      const kind = classify(url);
      const info = await resolveLink(url);
      await insertSuggestion({
        trip_id: tripId, chat_id: chatId, kind, url,
        name: info.name || url, description: info.desc, image: info.image,
        coords: info.coords, from_user: fromUser, raw_text: text.slice(0, 500),
      });
      added.push(`${kind === "shopping" ? "🛍" : "📍"} ${info.name || url}`);
    }
  } else {
    // 3b) БЕЗ ссылки: берём только фото или пересланное (не болтовню чата).
    const photoId = largestPhotoId(msg);
    const forwarded = isForwarded(msg);
    if ((!photoId && !forwarded) || !text.trim()) return;
    const ex = await aiExtract(text);                 // {kind, name, description}
    const image = photoId ? await uploadPhoto(photoId) : "";
    await insertSuggestion({
      trip_id: tripId, chat_id: chatId, kind: ex.kind, url: "",
      name: ex.name, description: ex.description, image, coords: null,
      from_user: fromUser, raw_text: text.slice(0, 500),
    });
    added.push(`${ex.kind === "shopping" ? "🛍" : "📍"} ${ex.name}`);
  }

  if (added.length) {
    await reply(chatId, `Добавил в предложку:\n${added.join("\n")}`, msg.message_id);
  }
}

// Самое крупное фото из сообщения (последний размер в массиве) или null.
function largestPhotoId(msg: any): string | null {
  const ph = msg?.photo;
  if (Array.isArray(ph) && ph.length) return ph[ph.length - 1]?.file_id ?? null;
  return null;
}

// Сообщение переслано? (новое поле forward_origin или старые forward_*).
function isForwarded(msg: any): boolean {
  return !!(msg?.forward_origin || msg?.forward_from || msg?.forward_from_chat || msg?.forward_sender_name);
}

// Классификация + чистое имя/описание для текста БЕЗ ссылки — через Haiku (без
// веб-поиска: быстро/дёшево). Фолбэк по ключевым словам, если ИИ недоступен.
async function aiExtract(text: string): Promise<{ kind: "place" | "shopping"; name: string; description: string }> {
  const firstLine = (text.split("\n").map((s) => s.trim()).filter(Boolean)[0] || "Из Telegram").slice(0, 80);
  const fallback = (): { kind: "place" | "shopping"; name: string; description: string } => ({
    kind: SHOP_WORDS.some((w) => text.toLowerCase().includes(w)) ? "shopping" : "place",
    name: firstLine, description: text.slice(0, 300),
  });
  if (!ANTHROPIC_KEY || !text.trim()) return fallback();
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 300,
        messages: [{
          role: "user",
          content: `Сообщение из чата путешественников — про МЕСТО (куда сходить) или ТОВАР (что купить).
Верни ТОЛЬКО JSON, без пояснений: {"kind":"place|shopping","name":"...","description":"..."}.
- kind: "shopping" если это товар/покупка (косметика, БАД, одежда, гаджет, еда на вынос), иначе "place".
- name: короткое РЕАЛЬНОЕ название места/товара (имя собственное не переводи), по-русски допустимо пояснение.
- description: 1 короткая фраза по-русски.
Сообщение:
"""${text.slice(0, 800)}"""`,
        }],
      }),
    });
    if (!r.ok) return fallback();
    const d = await r.json();
    const txt = (Array.isArray(d?.content) ? d.content : []).filter((b: any) => b?.type === "text").map((b: any) => b.text).join("");
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return fallback();
    const o = JSON.parse(m[0]);
    const kind = o?.kind === "shopping" ? "shopping" : "place";
    const name = (typeof o?.name === "string" && o.name.trim()) ? o.name.trim().slice(0, 120) : firstLine;
    const description = typeof o?.description === "string" ? o.description.trim().slice(0, 300) : text.slice(0, 300);
    return { kind, name, description };
  } catch {
    return fallback();
  }
}

// Скачать фото из Telegram и залить в публичный бакет Storage → public URL ('' при ошибке).
async function uploadPhoto(fileId: string): Promise<string> {
  if (!BOT_TOKEN) return "";
  try {
    const fr = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const fd = await fr.json();
    const path = fd?.result?.file_path;
    if (!path) return "";
    const bin = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${path}`);
    if (!bin.ok) return "";
    const bytes = new Uint8Array(await bin.arrayBuffer());
    const name = `${crypto.randomUUID()}.jpg`;
    const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${name}`, {
      method: "POST",
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "image/jpeg" },
      body: bytes,
    });
    if (!up.ok) return "";
    return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${name}`;
  } catch {
    return "";
  }
}

// ---- Команды ----------------------------------------------------------------

function parseCommand(text: string): { name: string; arg: string } | null {
  const t = (text || "").trim();
  if (!t.startsWith("/")) return null;
  const parts = t.split(/\s+/);
  const name = parts[0].slice(1).split("@")[0].toLowerCase(); // /connect@Bot → connect
  return { name, arg: parts.slice(1).join(" ").trim() };
}

async function handleConnect(chatId: string, code: string, replyTo: number): Promise<void> {
  const c = (code || "").trim();
  if (!c) { await reply(chatId, "Укажите код: /connect КОД (код — в приложении, кнопка «Подключить Telegram»).", replyTo); return; }
  // Ищем непривязанную (или эту же) ссылку с таким кодом.
  const rows = await pgGet(`tg_links?code=eq.${encodeURIComponent(c)}&select=id,trip_id,chat_id`);
  if (!rows.length) { await reply(chatId, "Код не найден. Проверьте код в приложении.", replyTo); return; }
  const row = rows[0];
  if (row.chat_id && row.chat_id !== chatId) {
    await reply(chatId, "Этот код уже использован для другого чата.", replyTo); return;
  }
  await pgPatch(`tg_links?id=eq.${row.id}`, { chat_id: chatId });
  await reply(chatId, "✅ Группа подключена. Кидайте сюда ссылки — они появятся в предложке поездки.", replyTo);
}

// ---- Классификация и разбор -------------------------------------------------

function classify(url: string): "place" | "shopping" {
  const u = url.toLowerCase();
  return SHOP_DOMAINS.some((d) => u.includes(d)) ? "shopping" : "place";
}

interface LinkInfo { name: string; desc: string; image: string; coords: number[] | null; }

// Переиспользуем задеплоенную функцию resolve-link (имя/координаты/фото/описание).
async function resolveLink(url: string): Promise<LinkInfo> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/resolve-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
      body: JSON.stringify({ url }),
    });
    if (!r.ok) return { name: "", desc: "", image: "", coords: null };
    const d = await r.json();
    const coords = Array.isArray(d?.coords) && d.coords.length === 2
      && typeof d.coords[0] === "number" && typeof d.coords[1] === "number" ? d.coords : null;
    return {
      name: typeof d?.name === "string" ? d.name : "",
      desc: typeof d?.description === "string" ? d.description : (typeof d?.desc === "string" ? d.desc : ""),
      image: typeof d?.image === "string" ? d.image : "",
      coords,
    };
  } catch {
    return { name: "", desc: "", image: "", coords: null };
  }
}

// Вытащить URL: из entities (url / text_link) и регуляркой по тексту.
function extractUrls(text: string, entities: any[]): string[] {
  const out = new Set<string>();
  for (const e of entities) {
    if (e?.type === "text_link" && typeof e.url === "string") out.add(e.url);
    else if (e?.type === "url" && typeof e.offset === "number" && typeof e.length === "number") {
      out.add(toUtf16Slice(text, e.offset, e.length));
    }
  }
  const re = /https?:\/\/[^\s)]+/gi;
  for (const m of text.matchAll(re)) out.add(m[0].replace(/[.,;]+$/, ""));
  return [...out].filter((u) => /^https?:\/\//i.test(u));
}

// Telegram offset/length — в UTF-16 code units; в JS строки и так UTF-16.
function toUtf16Slice(text: string, offset: number, length: number): string {
  return Array.from(text).slice(offset, offset + length).join("");
}

// ---- Доступ к БД (PostgREST, сервис-роль — минует RLS) ----------------------

async function pgGet(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return r.ok ? await r.json() : [];
}

async function pgPatch(path: string, body: unknown): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(body),
  });
}

async function insertSuggestion(row: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/tg_suggestions`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
}

async function tripForChat(chatId: string): Promise<string | null> {
  const rows = await pgGet(`tg_links?chat_id=eq.${encodeURIComponent(chatId)}&select=trip_id&limit=1`);
  return rows.length ? String(rows[0].trip_id) : null;
}

// ---- Ответ в Telegram -------------------------------------------------------

async function reply(chatId: string, text: string, replyTo?: number): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text,
        reply_to_message_id: replyTo,
        disable_web_page_preview: true,
      }),
    });
  } catch { /* не критично */ }
}
