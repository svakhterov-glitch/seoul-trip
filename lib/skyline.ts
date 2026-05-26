/**
 * Детерминированный генератор пиксель-скайлайна по строке (названию города).
 * Один и тот же город всегда даёт один и тот же силуэт — чтобы обложка была
 * узнаваемой и стабильной между перезагрузками.
 */

export interface SkylineBuilding {
  x: number; // левый край в колонках сетки
  w: number; // ширина в колонках
  h: number; // высота, доля 0..1 от высоты полосы
  roof: 'flat' | 'step' | 'antenna';
}

/** FNV-1a — стабильный хэш строки в uint32. */
export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — компактный детерминированный PRNG из uint32-сида. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ROOFS: SkylineBuilding['roof'][] = ['flat', 'flat', 'step', 'antenna'];

/**
 * Силуэт города: ряд зданий слева направо, заполняющий `columns` колонок.
 * Высоты и крыши детерминированы названием города.
 */
export function buildSkyline(city: string, columns = 48): SkylineBuilding[] {
  const rng = mulberry32(hashString(city || 'city'));
  const buildings: SkylineBuilding[] = [];
  let x = 0;
  while (x < columns) {
    const w = Math.min(2 + Math.floor(rng() * 4), columns - x); // 2..5 колонок
    const h = 0.3 + rng() * 0.7; // 0.3..1.0
    const roof = ROOFS[Math.floor(rng() * ROOFS.length)];
    buildings.push({ x, w, h, roof });
    x += w;
  }
  return buildings;
}
