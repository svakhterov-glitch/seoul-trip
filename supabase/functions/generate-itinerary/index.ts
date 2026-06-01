// ============================================================
// EDGE-ФУНКЦИЯ: generate-itinerary  (подход B — живой поиск + проверка)
//
// Вход: { city, country, startDate, endDate, days, pace, interests }
// Что делает:
//   1) Claude с инструментом web_search ищет места по РЕДАКЦИОННЫМ медиа и
//      узнаваемым тревел-блогерам (не выдумывает из головы);
//   2) по каждому месту проверяет АКТУАЛЬНОСТЬ (свежее упоминание, ещё работает)
//      и СЕЗОН под даты поездки (погода/уместность + сезонные события) —
//      пишет by/sourceUrl/sourceDate и seasonNote;
//   3) кластеризует по районам (близкие — в один день) и раскладывает по дням
//      под темп; дни прилёта (1) и вылета (last) — лёгкие;
//   4) сервер геокодит каждое место (Nominatim) → coords.
// Выход: { places: [{ dayNumber, name, district, kind, desc, price, by,
//          sourceUrl, sourceDate, seasonNote, coords }], source: "ai" }
//
// Деплой: supabase functions deploy generate-itinerary --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (обязательно)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
// Haiku: выше лимит входных токенов/мин (важно — веб-поиск раздувает контекст),
// дешевле и быстрее. Тот же ключ, что у resolve-link/search-places.
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";

const PACE_HINT: Record<string, string> = {
  relaxed: "2–3 места в день, без спешки, с запасом времени",
  moderate: "3–4 места в день плюс еда",
  packed: "5–6 мест в день, насыщенно",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  try {
    const body = await req.json();
    const city = String(body.city ?? "").trim();
    if (!city) return json({ error: "no city" }, 400);
    const country = String(body.country ?? "").trim();
    const startDate = String(body.startDate ?? "");
    const endDate = String(body.endDate ?? "");
    const days = Math.max(1, Math.min(30, Number(body.days) || 1));
    const pace = String(body.pace ?? "moderate");
    const interests: string[] = Array.isArray(body.interests) ? body.interests.map(String) : [];
    const restFirstDay = body.restFirstDay !== false; // по умолчанию — да
    const arrival = String(body.arrival ?? "");
    const departure = String(body.departure ?? "");
    const targetDay = Math.max(0, Math.min(days, Number(body.targetDay) || 0));
    const exclude: string[] = Array.isArray(body.exclude) ? body.exclude.map(String).slice(0, 100) : [];
    const dayContext = String(body.dayContext ?? "");

    const dates = startDate && endDate ? `${startDate} … ${endDate}` : "даты не заданы";
    const prompt = targetDay >= 1
      ? buildAddPrompt({ city, country, dates, targetDay, dayContext, exclude })
      : buildPrompt({ city, country, startDate, endDate, days, pace, interests, restFirstDay, arrival, departure });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        // max_uses держим низким: результаты веб-поиска возвращаются в модель на
        // каждом шаге и НАКАПЛИВАЮТ входные токены (лимит тарифа — 50k/мин).
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    if (d?.error) return json({ error: d.error?.message || "anthropic error" }, 502);

    const text = extractText(d);
    const parsed = parseJsonArray(text).filter((p) => p && typeof p.name === "string" && p.name.trim());

    // Геокодинг здесь НЕ делаем — он вынесен в отдельную функцию `geocode`.
    let places: any[];
    if (targetDay >= 1) {
      // Режим «добавить в день»: всё в targetDay, без повторов exclude, до 4 мест.
      const skip = new Set(exclude.map((s) => s.toLowerCase().trim()));
      places = parsed
        .filter((p) => !skip.has(String(p.name).toLowerCase().trim()))
        .slice(0, 4)
        .map((p) => ({ ...p, dayNumber: targetDay }));
    } else {
      // Пересборка: ограничиваем число мест ПО ДНЯМ (а не обрезкой хвоста —
      // иначе теряются последние дни). perDay — чтобы все дни влезли в потолок 40
      // (лимит geocode) и не превышали темп.
      const paceCap = pace === "packed" ? 6 : pace === "relaxed" ? 3 : 4;
      const perDay = Math.max(1, Math.min(paceCap, Math.floor(40 / days)));
      const valid = parsed.filter((p) => Number(p.dayNumber) >= 1 && Number(p.dayNumber) <= days);
      const byDay = new Map<number, any[]>();
      for (const p of valid) {
        const dn = Number(p.dayNumber);
        const arr = byDay.get(dn) ?? [];
        if (arr.length < perDay) { arr.push(p); byDay.set(dn, arr); }
      }
      places = [...byDay.entries()].sort((a, b) => a[0] - b[0]).flatMap(([, arr]) => arr);
    }

    return json({ places, source: "ai" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

interface PromptArgs {
  city: string; country: string; startDate: string; endDate: string;
  days: number; pace: string; interests: string[];
  restFirstDay: boolean; arrival: string; departure: string;
}

function buildPrompt(a: PromptArgs): string {
  const where = [a.city, a.country].filter(Boolean).join(", ");
  const dates = a.startDate && a.endDate ? `${a.startDate} … ${a.endDate}` : "даты не заданы";
  const paceHint = PACE_HINT[a.pace] ?? PACE_HINT.moderate;
  const interests = a.interests.length ? a.interests.join(", ") : "разные";
  return `Ты — тревел-редактор. Собери маршрут поездки по городу: ${where}.
Даты поездки: ${dates}. Дней в маршруте: ${a.days}. Темп: ${paceHint}. Интересы: ${interests}.

ЯЗЫК: поля name, desc, seasonNote, district — ПО-РУССКИ (это интерфейс на русском).
Поле geo — отдельный АНГЛИЙСКИЙ/латинизированный поисковый запрос для геокодера
(оригинальное/английское название места + город + страна, напр.
"Gyeongbokgung Palace, Seoul, South Korea"); кириллицу геокодер не находит.

ЖЁСТКИЕ ПРАВИЛА:
1) ИСТОЧНИКИ. Используй web_search и бери места ТОЛЬКО из редакционных медиа
   (Time Out, Visit Seoul, Michelin, Eater, CNN Travel, Condé Nast, гиды изданий)
   и узнаваемых тревел-блогеров с репутацией. НЕ выдумывай места из головы и НЕ
   бери из анонимных отзывов/форумов. У каждого места укажи "by" (издание/автор),
   "sourceUrl" (ссылка на материал) и "sourceDate" (примерная дата материала, ISO).
2) АКТУАЛЬНОСТЬ. Только места, которые сейчас работают и имеют СВЕЖЕЕ упоминание.
   Закрывшиеся/устаревшие — не включай.
3) СЕЗОН под даты поездки. Учитывай (а) погоду и уместность — не ставь длинные
   уличные маршруты в жару/мороз/дождь, балансируй улицу и помещения; (б) сезонные
   события — подсвечивай актуальное ИМЕННО в эти даты (цветение, листопад,
   фестивали) и не предлагай то, что вне сезона. В поле "seasonNote" — короткая
   пометка (≤80 симв.), чем место уместно/неуместно в эти даты ('' если нейтрально).
4) ГЕОГРАФИЯ. Один день ≈ один район/кластер: близкие места — в один день, без
   мотания через весь город и обратно. Укажи "district" (район) каждому месту.
5) ТЕМП и ДНИ. Держи темп: ${paceHint} — и НЕ больше этого числа в день.
   КРИТИЧНО: распредели места по ВСЕМ дням от 1 до ${a.days} включительно. КАЖДЫЙ
   день обязан содержать места — НИ ОДИН день не оставляй пустым и НЕ «сдваивай»
   места в начало поездки в ущерб последним дням.
   ${a.restFirstDay
      ? "День 1 — СПОКОЙНЫЙ (отдых после прилёта): 1–2 лёгких места рядом с центром/отелем, без насыщенного маршрута."
      : "День 1 (прилёт) — умеренный, ближе к центру."}
   День ${a.days} (вылет) — лёгкий, но НЕ пустой: ровно 1–2 места рядом с центром.
6) ВРЕМЯ. Проставь каждому месту "time" — час визита в формате "HH:MM" (например
   "10:30"), по порядку в течение дня, с разумными промежутками на дорогу и еду
   (обед ~13:00, ужин ~19:00).${a.arrival ? ` Прилёт: ${a.arrival} — в день прилёта НЕ ставь места раньше прилёта (дай ~2–3 ч на дорогу/заселение).` : ""}${a.departure ? ` Вылет: ${a.departure} — в день вылета НЕ ставь места после (дай ~3 ч на дорогу в аэропорт).` : ""}

ПОИСК: сделай НЕ БОЛЕЕ 2 веб-поисков. После них НЕ проси дополнительных поисков и
НЕ пиши фраз вроде «позволь собрать»/«нужны ещё поиски» — ОБЯЗАТЕЛЬНО сразу, в ЭТОМ
ЖЕ ответе, выведи полный итоговый JSON-массив по всем ${a.days} дням, опираясь на
найденное и свои знания о городе. Не выводить JSON нельзя.

ФОРМАТ ОТВЕТА: верни ТОЛЬКО JSON-массив. БЕЗ вступления, БЕЗ пояснений, БЕЗ
markdown-ограждений (никаких \`\`\`). Первый символ ответа — «[», последний — «]».
Каждый объект:
[{"dayNumber":1,"time":"10:30","name":"Дворец Кёнбоккун","geo":"Gyeongbokgung Palace, Seoul, South Korea","district":"Чонно-гу","kind":"food|museum|nature|sight|shop|fun|bar|other","desc":"1 фраза по-русски","price":"free"|1|2|3,"by":"Time Out Seoul","sourceUrl":"https://...","sourceDate":"2026-03-01","seasonNote":"в июне — зелень"}]`;
}

interface AddArgs {
  city: string; country: string; dates: string; targetDay: number;
  dayContext: string; exclude: string[];
}

function buildAddPrompt(a: AddArgs): string {
  const where = [a.city, a.country].filter(Boolean).join(", ");
  const ctx = a.dayContext ? `\nВ этом дне уже есть (тот же район держи рядом): ${a.dayContext}` : "";
  const skip = a.exclude.length ? `\nНЕ повторяй уже добавленные в поездку: ${a.exclude.slice(0, 60).join("; ")}.` : "";
  return `Ты — тревел-редактор. Добавь 2–4 НОВЫХ места в день ${a.targetDay} поездки по городу: ${where}.
Даты поездки: ${a.dates}.${ctx}${skip}

ПРАВИЛА:
- ИСТОЧНИКИ: web_search, ТОЛЬКО редакционные медиа (Time Out, Visit Seoul, Michelin,
  Eater, CNN Travel) и узнаваемые тревел-блогеры. Не выдумывай; только реальные места
  со свежим упоминанием. Укажи "by", "sourceUrl", "sourceDate".
- РЯДОМ: новые места — в том же районе/рядом с тем, что уже есть в дне (без мотания
  через весь город). Укажи "district".
- СЕЗОН под даты: погода/уместность + сезонные события; "seasonNote" (≤80 симв., '' если нейтрально).
- ВРЕМЯ: проставь "time" ("HH:MM"), логично вписав между существующими.
- ЯЗЫК: name, desc, seasonNote, district — ПО-РУССКИ. geo — английский запрос для
  геокодера (название + город + страна).

ПОИСК: не более 2 веб-поисков, затем СРАЗУ выведи итоговый JSON. Не проси ещё поисков,
не пиши вступлений.

Верни ТОЛЬКО JSON-массив (2–4 объекта), без markdown-ограждений. Каждый:
{"dayNumber":${a.targetDay},"time":"14:00","name":"Название по-русски","geo":"Name, ${a.city}, ${a.country || "South Korea"}","district":"район","kind":"food|museum|nature|sight|shop|fun|bar|other","desc":"1 фраза по-русски","price":"free"|1|2|3,"by":"Time Out Seoul","sourceUrl":"https://...","sourceDate":"2026-03","seasonNote":""}`;
}

// Собрать текстовый ответ из блоков (web_search возвращает смешанный content).
function extractText(d: any): string {
  const blocks = Array.isArray(d?.content) ? d.content : [];
  return blocks.filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("\n");
}

// Надёжный разбор: извлекаем КАЖДЫЙ объект верхнего уровня по балансировке
// скобок (с учётом строк/экранирования) и парсим по отдельности. Так одна
// кривая деталь в одном месте (неэкранированная кавычка, висячая запятая) не
// роняет весь маршрут — теряем максимум один объект, остальные выживают.
function parseJsonArray(text: string): any[] {
  const s = text.replace(/```(?:json)?/gi, "");
  const out: any[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const obj = tryParseObject(s.slice(start, i + 1));
        if (obj) out.push(obj);
        start = -1;
      }
    }
  }
  return out;
}

function tryParseObject(chunk: string): any | null {
  // ВАЖНО: НЕ срезать «//» — это съедает https:// в sourceUrl.
  const c = chunk
    .replace(/\/\*[\s\S]*?\*\//g, "")    // /* комментарии */
    .replace(/,\s*([}\]])/g, "$1");       // висячие запятые
  try {
    const o = JSON.parse(c);
    return (o && typeof o === "object" && !Array.isArray(o)) ? o : null;
  } catch {
    return null;
  }
}
