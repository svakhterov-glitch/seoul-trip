/* ============================================================
   КЛИЕНТ ДЛЯ EDGE-ФУНКЦИИ resolve-link
   Просит сервер развернуть и «прочитать» ссылку: понять место,
   геокодировать. Возвращает { name, coords, sourceUrl } или null.
   Если бэкенд не настроен/недоступен — вызывающая сторона
   откатывается на фронтовый разбор (parseLink + geocode).
   ============================================================ */

export async function resolveLinkViaBackend(functionsUrl, url) {
  try {
    const r = await fetch(`${functionsUrl}/resolve-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.error) return null;
    return { name: d.name || "", coords: d.coords || null, sourceUrl: d.sourceUrl || url };
  } catch {
    return null;
  }
}
