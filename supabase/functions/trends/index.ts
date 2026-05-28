// ============================================================
// EDGE-ФУНКЦИЯ: trends (доска «Медиа»)
// Принимает { city, country } → возвращает { items: [...] } трендовых мест
// города из редакционных подборок. С ключом ANTHROPIC_API_KEY: Claude (Haiku)
// предлагает места (название + сегмент + рубрика + выжимка + источник + гео),
// геокодер (Nominatim) уточняет координаты. Без ключа — пустой список.
//
// Сейчас «тренд» = знания модели (со ссылкой на известные медиа). Позже сюда
// встанет реальный сбор из RSS редакционных рубрик (PLAN.md §8) — фронт не
// поменяется (тот же формат items).
//
// Деплой: supabase functions deploy trends --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (без него items = [])
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";
const MAX = 12;

const SEGMENTS = ["food", "museum", "nature", "sight", "shop", "fun", "bar", "hotel", "transport", "other"];
const RUBRICS = ["new", "best", "trending"];

interface Item {
  name: string; segment: string; rubric: string; blurb: string;
  source: string; sourceUrl: string; sourceDate: string;
  coords: [number, number] | null; address: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { city, country } = await req.json();
    const c = (city ?? "").toString().trim();
    if (!c) return json({ error: "no city" }, 400);
    if (!ANTHROPIC_KEY) return json({ items: [] });

    const ideas = await suggestTrending(c, (country ?? "").toString().trim());
    const where = [c, country].filter(Boolean).join(", ");
    const items = await geocodeAll(ideas, where);
    return json({ items: items.slice(0, MAX) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

interface Idea extends Omit<Item, "coords" | "address"> { geo: string; }

async function suggestTrending(city: string, country: string): Promise<Idea[]> {
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
        max_tokens: 1800,
        messages: [{
          role: "user",
          content:
            `Подбери трендовые места города ${city}${country ? ", " + country : ""} — то, что попадает в ` +
            `редакционные подборки гидов (Time Out, Visit Seoul, DiningCode, Eater, CNN Travel и т.п.): ` +
            `модные кафе, новые открытия, лучшие смотровые, шопинг, бары. Верни ТОЛЬКО JSON-массив до ${MAX} ` +
            `элементов. Каждый: {"name":"короткое название по-русски","segment":"один из: ${SEGMENTS.join(",")}",` +
            `"rubric":"один из: new (новое открытие) | best (лучшее по версии гидов) | trending (сейчас на хайпе)",` +
            `"blurb":"1 предложение по-русски: чем интересно туристу","source":"название издания (напр. Time Out Seoul)",` +
            `"sourceDate":"год или месяц-год, напр. 2025","geo":"для геокодера: официальное название на английском/местном + город, БЕЗ слов кафе/дворец"}. ` +
            `Разнообразь сегменты и рубрики. Только реальные места в ${city}.`,
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
        name: str(x.name, 120),
        segment: SEGMENTS.includes(str(x.segment, 20)) ? str(x.segment, 20) : "other",
        rubric: RUBRICS.includes(str(x.rubric, 20)) ? str(x.rubric, 20) : "trending",
        blurb: str(x.blurb, 400),
        source: str(x.source, 80),
        sourceUrl: str(x.sourceUrl, 300),
        sourceDate: str(x.sourceDate, 40),
        geo: str(x.geo, 160),
      }))
      .filter((i: Idea) => i.name && i.geo)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

// Геокодим по очереди (бережём лимит Nominatim ~1 запрос/сек).
async function geocodeAll(ideas: Idea[], where: string): Promise<Item[]> {
  const out: Item[] = [];
  for (const idea of ideas) {
    const g = await geocode(idea.geo) ?? await geocode(`${idea.name}, ${where}`);
    const { geo: _geo, ...rest } = idea;
    out.push({ ...rest, coords: g?.coords ?? null, address: g?.address ?? "" });
    await sleep(300);
  }
  return out;
}

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

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
