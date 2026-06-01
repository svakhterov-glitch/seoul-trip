// ============================================================
// EDGE-ФУНКЦИЯ: suggest-checklist
// Вход:  { name, city, country, kind }
// Выход: { items: string[] }  — 3–6 коротких пунктов чеклиста для места
//        (что посмотреть/не пропустить, что попробовать/купить именно тут).
// Haiku БЕЗ веб-поиска — быстро, дёшево, без лимитов токенов/мин.
//
// Деплой: supabase functions deploy suggest-checklist --no-verify-jwt
// Секрет: ANTHROPIC_API_KEY (без него items = [])
// ============================================================
import { json, preflight } from "../_shared/cors.ts";

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-haiku-4-5";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return json({ error: "no name" }, 400);
    if (!ANTHROPIC_KEY) return json({ items: [] });
    const city = String(body.city ?? "").trim();
    const country = String(body.country ?? "").trim();
    const kind = String(body.kind ?? "").trim();

    const where = [city, country].filter(Boolean).join(", ");
    const prompt =
      `Место: «${name}»${where ? ` (${where})` : ""}${kind ? `, тип: ${kind}` : ""}. ` +
      `Предложи 3–6 коротких пунктов чеклиста для путешественника ИМЕННО про это место: ` +
      `что здесь посмотреть/не пропустить, что попробовать или купить. По-русски, КОРОТКО ` +
      `(до ~6 слов на пункт), конкретно к этому месту (не общие советы). ` +
      `Верни ТОЛЬКО JSON-массив строк, без пояснений. Пример: ["...","...","..."]`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const d = await r.json();
    if (d?.error) return json({ error: d.error?.message || "anthropic error" }, 502);

    const text = (d?.content?.[0]?.text ?? "").trim();
    const m = text.match(/\[[\s\S]*\]/);
    let items: string[] = [];
    if (m) {
      try {
        const arr = JSON.parse(m[0]);
        if (Array.isArray(arr)) {
          items = arr
            .map((x: unknown) => (typeof x === "string" ? x.trim() : ""))
            .filter((s: string) => s)
            .slice(0, 6);
        }
      } catch { /* ignore */ }
    }
    return json({ items });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
