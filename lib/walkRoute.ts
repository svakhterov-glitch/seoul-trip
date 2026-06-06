import { getSupabase } from '@/lib/supabase/client';
import { haversineKm } from '@/lib/geocode';
import type { Coords } from '@/lib/entities';

/**
 * Перегоны длиннее этого (по прямой, км) считаем поездкой на метро/такси и рисуем
 * пунктиром, а пеший путь по улицам строим только для коротких — иначе вышла бы
 * длинная дуга по тротуарам через полгорода, как будто идём пешком 5 км.
 */
export const WALK_MAX_KM = 2.0;

/** Перегон проходим пешком? (расстояние по прямой ≤ порога). */
export function isWalkable(a: Coords, b: Coords, maxKm: number = WALK_MAX_KM): boolean {
  return haversineKm(a, b) <= maxKm;
}

/** Стабильный ключ перегона для кеша (округление до ~1 м). */
export function legKey(a: Coords, b: Coords): string {
  const r = (n: number) => n.toFixed(5);
  return `${r(a[0])},${r(a[1])}>${r(b[0])},${r(b[1])}`;
}

/** Перегон между двумя соседними точками дня. */
export interface Leg {
  from: Coords;
  to: Coords;
  walk: boolean; // true — рисуем пеший путь; false — пунктир (поездка)
}

/** Разбить упорядоченные точки дня на перегоны с пометкой «пешком/поездка». */
export function buildLegs(points: Coords[], maxKm: number = WALK_MAX_KM): Leg[] {
  const legs: Leg[] = [];
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    legs.push({ from, to, walk: isWalkable(from, to, maxKm) });
  }
  return legs;
}

/**
 * Пешие линии по улицам для перегонов через edge-функцию `route` (OSRM foot).
 * Возвращает массив геометрий в том же порядке (null — если не построилось).
 * Любая ошибка → массив из null: карта тихо откатится к прямой линии.
 */
export async function fetchWalkRoutes(legs: [Coords, Coords][]): Promise<(Coords[] | null)[]> {
  if (legs.length === 0) return [];
  try {
    const { data, error } = await getSupabase().functions.invoke('route', { body: { legs } });
    if (error || !data || (data as { error?: string }).error) return legs.map(() => null);
    const list = (data as { geometries?: unknown }).geometries;
    if (!Array.isArray(list)) return legs.map(() => null);
    return legs.map((_, i) => toGeometry(list[i]));
  } catch {
    return legs.map(() => null);
  }
}

/** Привести значение к ломаной [[lat,lng],...] (или null, если не валидно). */
function toGeometry(v: unknown): Coords[] | null {
  if (!Array.isArray(v) || v.length < 2) return null;
  const out: Coords[] = [];
  for (const p of v) {
    if (Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number') {
      out.push([p[0], p[1]] as Coords);
    }
  }
  return out.length >= 2 ? out : null;
}
