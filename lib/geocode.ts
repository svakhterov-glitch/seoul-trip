import { getSupabase } from '@/lib/supabase/client';
import type { Coords } from '@/lib/entities';

/** Привести значение к координатам [lat,lng] или null. */
export function toCoords(v: unknown): Coords | null {
  return Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'
    ? [v[0], v[1]] as Coords
    : null;
}

/**
 * Геокодинг списка запросов через edge-функцию `geocode` (Nominatim, троттлинг).
 * Возвращает массив координат в том же порядке (null там, где не нашлось).
 * Любая ошибка → массив из null. Браузер сам Nominatim не зовёт (нет CORS).
 */
export async function geocodeQueries(queries: string[]): Promise<(Coords | null)[]> {
  if (queries.length === 0) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('geocode', { body: { queries } });
    if (error || !data || (data as { error?: string }).error) return queries.map(() => null);
    const list = (data as { coords?: unknown }).coords;
    if (!Array.isArray(list)) return queries.map(() => null);
    return queries.map((_, i) => toCoords(list[i]));
  } catch {
    return queries.map(() => null);
  }
}

/** Расстояние между точками в км (гаверсинус). */
export function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Координаты центра города поездки (для проверки «место в стране/городе»). */
export async function cityCenter(city: string, country: string): Promise<Coords | null> {
  const q = [city, country].filter(Boolean).join(', ');
  if (!q) return null;
  const [c] = await geocodeQueries([q]);
  return c ?? null;
}

/** Радиус «своего региона» от центра города (км). Корея ~500 км — 700 с запасом
 *  ловит всю страну и отсекает чужие континенты (левые точки геокодера). */
export const REGION_RADIUS_KM = 700;

/** Точка в пределах региона города? (если центр неизвестен — считаем, что да). */
export function inRegion(coords: Coords | null, center: Coords | null, maxKm = REGION_RADIUS_KM): boolean {
  if (!coords) return false;
  if (!center) return true;
  return haversineKm(coords, center) <= maxKm;
}
