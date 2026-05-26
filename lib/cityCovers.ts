/**
 * Реестр картинок-обложек по городам. Картинки делает владелец продукта под
 * каждый город и кладёт в `public/covers/`. Ключ — нормализованное название
 * города. Если города нет в реестре и у поездки не задана своя обложка —
 * показывается процедурный скайлайн (запасной вариант).
 */
const CITY_COVERS: Record<string, string> = {
  // пример: 'сеул': '/covers/seoul.jpg',
};

/** Нормализованный ключ города (без регистра и крайних пробелов). */
export function coverKey(city: string): string {
  return city.trim().toLowerCase();
}

/** Путь к обложке города или '' если для города картинки нет. */
export function cityCover(city: string): string {
  return CITY_COVERS[coverKey(city)] ?? '';
}
