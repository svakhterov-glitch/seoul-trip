// ============================================================
// EDGE-ФУНКЦИЯ: trends (доска «Медиа»)
// Принимает { city, country, exclude?: string[] } → { items: [...] } трендовых
// мест города из редакционных подборок. Claude (Haiku) + web_search ищет места
// в редакционных медиа и у тревел-блогеров, возвращает название + сегмент +
// рубрику + выжимку + источник + английский гео-запрос. Координаты НЕ ставит —
// геокодинг на клиенте (функция geocode), иначе не уложиться в лимит времени.
// `exclude` — имена уже показанных мест (чтобы «обновить» приносило новые).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const city = String(body.city ?? "").trim();
    if (!city) return json({ error: "no city" }, 400);
    if (!ANTHROPIC_KEY) return json({ items: [] });
    const country = String(body.country ?? "").trim();
    const exclude: string[] = Array.isArray(body.exclude) ? body.exclude.map(String).slice(0, 80) : [];

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }],
        messages: [{ role: "user", content: buildPrompt(city, country, exclude) }],
      }),
    });
    const d = await r.json();
    if (d?.error) return json({ error: d.error?.message || "anthropic error" }, 502);

    const excludeSet = new Set(exclude.map((s) => s.toLowerCase().trim()));
    const items = parseObjects(extractText(d))
      .map(normalize)
      .filter((i): i is Item => i !== null && !excludeSet.has(i.name.toLowerCase()))
      .slice(0, MAX);
    return json({ items });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

interface Item {
  name: string; geo: string; segment: string; rubric: string; blurb: string;
  source: string; sourceUrl: string; sourceDate: string;
}

function buildPrompt(city: string, country: string, exclude: string[]): string {
  const where = [city, country].filter(Boolean).join(", ");
  const skip = exclude.length
    ? `\nНЕ повторяй уже показанные места: ${exclude.slice(0, 60).join("; ")}. Дай ДРУГИЕ.`
    : "";
  return `Ты — тревел-редактор. Найди трендовые места города ${where}, используя web_search.
Бери ТОЛЬКО из редакционных медиа (Time Out, Visit Seoul, Michelin, Eater, CNN Travel,
Condé Nast, DiningCode) и узнаваемых тревел-блогеров: модные кафе, новые открытия,
лучшие смотровые, шопинг, бары. Не выдумывай; только реальные места со свежим упоминанием.${skip}

ЯЗЫК: name, blurb — ПО-РУССКИ. geo — английский/латинизированный запрос для геокодера
(официальное название + город + страна, напр. "Onion Anguk, Seoul, South Korea").

ПОИСК: не более 2 веб-поисков, затем СРАЗУ выведи итоговый JSON. Не проси ещё поисков,
не пиши вступлений.

Верни ТОЛЬКО JSON-массив до ${MAX} объектов, без markdown-ограждений. Каждый:
{"name":"короткое название по-русски","geo":"Onion Anguk, Seoul, South Korea","segment":"один из: ${SEGMENTS.join(",")}","rubric":"new|best|trending","blurb":"1 фраза по-русски — чем интересно","source":"Time Out Seoul","sourceUrl":"https://...","sourceDate":"2026-03"}`;
}

function normalize(x: Record<string, unknown>): Item | null {
  const name = str(x.name, 120);
  const geo = str(x.geo, 160);
  if (!name) return null;
  const segment = str(x.segment, 20);
  const rubric = str(x.rubric, 20);
  return {
    name,
    geo: geo || name,
    segment: SEGMENTS.includes(segment) ? segment : "other",
    rubric: RUBRICS.includes(rubric) ? rubric : "trending",
    blurb: str(x.blurb, 400),
    source: str(x.source, 80),
    sourceUrl: str(x.sourceUrl, 300),
    sourceDate: str(x.sourceDate, 40),
  };
}

// Текст из блоков (web_search возвращает смешанный content).
function extractText(d: any): string {
  const blocks = Array.isArray(d?.content) ? d.content : [];
  return blocks.filter((b: any) => b?.type === "text" && typeof b.text === "string").map((b: any) => b.text).join("\n");
}

// По-объектный разбор (устойчив к битой детали; НЕ срезаем // — это https://).
function parseObjects(text: string): Record<string, unknown>[] {
  const s = text.replace(/```(?:json)?/gi, "");
  const out: Record<string, unknown>[] = [];
  let depth = 0, start = -1, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === "{") { if (depth === 0) start = i; depth++; }
    else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        const o = tryParse(s.slice(start, i + 1));
        if (o) out.push(o);
        start = -1;
      }
    }
  }
  return out;
}

function tryParse(chunk: string): Record<string, unknown> | null {
  try {
    const o = JSON.parse(chunk.replace(/\/\*[\s\S]*?\*\//g, "").replace(/,\s*([}\]])/g, "$1"));
    return (o && typeof o === "object" && !Array.isArray(o)) ? o : null;
  } catch { return null; }
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
