// ============================================================
// EDGE-ФУНКЦИЯ: generate-itinerary
// Принимает { city, days, interests, pace } → Claude генерирует
// места и раскидывает по дням. Возвращает { places: [...] } в
// формате, совпадающем с моделью фронтенда (dayNumber, name, desc…).
// Координаты — best-effort геокодинг (Nominatim) с троттлингом.
//
// Деплой: supabase functions deploy generate-itinerary --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (обязательно)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (!ANTHROPIC_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);
  try {
    const { city, days = 5, interests = [], pace = "moderate" } = await req.json();
    if (!city) return json({ error: "no city" }, 400);

    const prompt = `Спланируй маршрут путешествия по городу: ${city}.
Дней: ${days}. Интересы: ${interests.join(", ") || "разные"}. Темп: ${pace}.
Верни СТРОГО JSON-массив мест без пояснений, по 3–4 места на день, в формате:
[{"dayNumber":1,"name":"...","desc":"короткое описание","price":1,"history":"факт или пусто"}]
price: "free"|1|2|3. Учитывай географию (близкие места — в один день) и опыт путешественников.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    const text = d?.content?.[0]?.text ?? "[]";
    const places = parseJsonArray(text);

    // best-effort координаты (с троттлингом, чтобы не упереться в лимиты Nominatim)
    for (const p of places.slice(0, 24)) {
      const g = await geocode(`${p.name}, ${city}`);
      if (g) p.coords = g;
      await sleep(250);
    }

    return json({ places, source: "ai" });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function parseJsonArray(text: string): any[] {
  try {
    const m = text.match(/\[[\s\S]*\]/);
    return m ? JSON.parse(m[0]) : [];
  } catch {
    return [];
  }
}

async function geocode(q: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "seoul-trip/1.0" } });
    const d = await r.json();
    if (Array.isArray(d) && d.length) return [+d[0].lat, +d[0].lon];
  } catch { /* ignore */ }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
