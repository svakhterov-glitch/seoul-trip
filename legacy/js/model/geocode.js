/* ============================================================
   ГЕОКОДИНГ ПО НАЗВАНИЮ (OpenStreetMap Nominatim)
   Превращает название места в координаты прямо из браузера, без
   ключа. Используется, чтобы «найти место на карте» по названию
   из ссылки или из поля формы.

   Ограничение: публичный Nominatim — для небольшого объёма
   запросов. Серьёзный геокодинг/чтение страниц приедет с бэкендом.
   ============================================================ */

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

/**
 * @param {string} query — название (можно с городом: «Кафе, Сеул»)
 * @returns {Promise<{coords:[number,number], displayName:string}|null>}
 */
export async function geocode(query) {
  const q = (query || "").trim();
  if (!q) return null;
  const url = `${ENDPOINT}?format=json&limit=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;
    const r = data[0];
    return { coords: [+r.lat, +r.lon], displayName: r.display_name || q };
  } catch {
    return null;
  }
}
