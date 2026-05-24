// ============================================================
// EDGE-ФУНКЦИЯ: resolve-link
// Принимает { url } → разворачивает короткие ссылки (goo.gl и т.п.),
// читает страницу (на сервере нет CORS), достаёт название места,
// при наличии ключа уточняет его через Claude, геокодит координаты.
// Возвращает { name, coords, displayName, sourceUrl }.
//
// Деплой: supabase functions deploy resolve-link --no-verify-jwt
// Секреты: ANTHROPIC_API_KEY (необязательно — без него работает базовый разбор)
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const { url } = await req.json();
    if (!url) return json({ error: "no url" }, 400);

    // 1. развернуть редиректы (короткие ссылки) — fetch следует за ними
    const res = await fetch(url, { redirect: "follow", headers: { "User-Agent": "seoul-trip/1.0" } });
    const finalUrl = res.url || url;
    const html = await res.text();

    // 2. координаты и имя из самого URL (Google/Kakao Maps)
    let coords = coordsFromUrl(finalUrl) ?? coordsFromUrl(url);
    let name = nameFromUrl(finalUrl) ?? "";

    // 3. имя из страницы (og:title / <title>), если из URL не вышло
    if (!name) name = titleFromHtml(html);

    // 4. уточнить «о каком месте речь» через Claude (если есть ключ)
    if (ANTHROPIC_KEY && (html || name)) {
      const refined = await refinePlaceName(name, html);
      if (refined) name = refined;
    }

    // 5. геокодинг координат по названию, если их нет
    let displayName = "";
    if (!coords && name) {
      const g = await geocode(name);
      if (g) { coords = g.coords; displayName = g.displayName; }
    }

    return json({ name: name || "", coords: coords ?? null, displayName, sourceUrl: finalUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function coordsFromUrl(u: string): [number, number] | null {
  let m = u.match(/link\/map\/[^,]+,(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return [+m[1], +m[2]];
  m = u.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || u.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/)
    || u.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
  return m ? [+m[1], +m[2]] : null;
}

function nameFromUrl(u: string): string {
  const m = u.match(/\/place\/([^/@]+)/);
  return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
}

function titleFromHtml(html: string): string {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og) return decodeEntities(og[1]).trim();
  const t = html.match(/<title>([^<]+)<\/title>/i);
  return t ? decodeEntities(t[1]).trim() : "";
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

async function geocode(q: string) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": "seoul-trip/1.0" } });
    const d = await r.json();
    if (Array.isArray(d) && d.length) return { coords: [+d[0].lat, +d[0].lon] as [number, number], displayName: d[0].display_name };
  } catch { /* ignore */ }
  return null;
}

// Claude: из заголовка/фрагмента страницы вытащить чистое название места
async function refinePlaceName(title: string, html: string): Promise<string> {
  try {
    const text = (title + "\n" + html.replace(/<[^>]+>/g, " ")).slice(0, 4000);
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 64,
        messages: [{
          role: "user",
          content: `Вот заголовок и текст веб-страницы про место для путешествия. Верни ТОЛЬКО короткое название конкретного места (кафе/достопримечательность/район) и город, без кавычек и пояснений. Если места нет — верни пустую строку.\n\n${text}`,
        }],
      }),
    });
    const d = await r.json();
    return (d?.content?.[0]?.text ?? "").trim().slice(0, 120);
  } catch {
    return "";
  }
}
