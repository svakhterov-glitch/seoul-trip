// ============================================================
// EDGE-ФУНКЦИЯ: search-places
// Принимает { query, city, country } → ищет места по названию в пределах
// города. С ключом ANTHROPIC_API_KEY: Claude (Haiku) предлагает кандидатов
// (чистое название + описание + гео-запрос), геокодер (Nominatim) уточняет
// координаты. Без ключа — простой поиск Nominatim по «запрос, город».
// Возвращает { candidates: [{ name, address, desc, coords:[lat,lng] }] }.
//
// Деплой: supabase functions deploy search-places --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (необязательно — без него работает базовый поиск)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX = 5; // не больше кандидатов (бережём лимит геокодера 1 запрос/сек)

interface Candidate { name: string; address: string; desc: string; coords: [number, number]; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { query, city, country } = await req.json();
    const q = (query ?? "").toString().trim();
    if (!q) return json({ error: "no query" }, 400);
    const where = [city, country].filter(Boolean).join(", ");

    let candidates: Candidate[] = [];

    // 1. ИИ предлагает конкретные места (понимает «лучшее кафе в Хондэ» и опечатки)
    if (ANTHROPIC_KEY) {
      const ideas = await suggestPlaces(q, city ?? "", country ?? "");
      candidates = await geocodeIdeas(ideas, where);
    }

    // 2. Фолбэк/добор: прямой поиск по геокодеру «запрос, город»
    if (candidates.length === 0) {
      candidates = await nominatimSearch(`${q}, ${where}`);
    }

    return json({ candidates: dedupe(candidates).slice(0, MAX) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// ---- ИИ: список кандидатов по запросу ----------------------------------

interface Idea { name: string; desc: string; geo: string; }

async function suggestPlaces(query: string, city: string, country: string): Promise<Idea[]> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{
          role: "user",
          content:
            `Пользователь ищет место для путешествия в городе ${city || "?"}${country ? ", " + country : ""}. ` +
            `Запрос: «${query}». Верни ТОЛЬКО JSON-массив до ${MAX} наиболее подходящих РЕАЛЬНЫХ мест ` +
            `(если запрос — конкретное место, верни его одно; если общий, напр. «кафе в Хондэ» — несколько вариантов). ` +
            `Каждый элемент: {"name": "короткое название места по-русски", ` +
            `"desc": "1 предложение по-русски: чем интересно", ` +
            `"geo": "запрос для геокодера: официальное название на английском или местном языке + город, БЕЗ слов вроде «кафе/дворец»"}. ` +
            `Только места в пределах города ${city || ""}. Если ничего не подходит — верни [].`,
        }],
      }),
    });
    const d = await r.json();
    const raw = (d?.content?.[0]?.text ?? "").trim();
    const m = raw.match(/\[[\s\S]*\]/);
    if (!m) return [];
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x: Record<string, unknown>): Idea => ({
        name: typeof x.name === "string" ? x.name.trim().slice(0, 120) : "",
        desc: typeof x.desc === "string" ? x.desc.trim().slice(0, 400) : "",
        geo: typeof x.geo === "string" ? x.geo.trim().slice(0, 160) : "",
      }))
      .filter((i: Idea) => i.name && i.geo)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

// Геокодим каждую идею по очереди (бережём лимит Nominatim ~1 запрос/сек).
async function geocodeIdeas(ideas: Idea[], where: string): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const idea of ideas) {
    const g = await geocode(idea.geo) ?? await geocode(`${idea.name}, ${where}`);
    if (g) out.push({ name: idea.name, address: g.address, desc: idea.desc, coords: g.coords });
    await sleep(300);
  }
  return out;
}

// ---- Геокодер (Nominatim) ----------------------------------------------

async function geocode(q: string): Promise<{ coords: [number, number]; address: string } | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tripsplan/1.0 (tripsplan.ru)" } },
    );
    const d = await r.json();
    if (Array.isArray(d) && d.length) {
      return { coords: [+d[0].lat, +d[0].lon], address: d[0].display_name ?? "" };
    }
  } catch { /* ignore */ }
  return null;
}

// Прямой поиск по геокодеру — несколько результатов (фолбэк без ИИ).
async function nominatimSearch(q: string): Promise<Candidate[]> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&namedetails=1&limit=${MAX}&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "tripsplan/1.0 (tripsplan.ru)" } },
    );
    const d = await r.json();
    if (!Array.isArray(d)) return [];
    return d.map((row: Record<string, any>): Candidate => {
      const display = (row.display_name as string) ?? "";
      const name = (row.namedetails?.name as string) || display.split(",")[0] || "";
      return { name: name.trim(), address: display, desc: "", coords: [+row.lat, +row.lon] };
    }).filter((c: Candidate) => c.name);
  } catch {
    return [];
  }
}

// Убрать дубли по округлённым координатам (ИИ-идея + фолбэк могут совпасть).
function dedupe(list: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of list) {
    const key = `${c.coords[0].toFixed(4)},${c.coords[1].toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
