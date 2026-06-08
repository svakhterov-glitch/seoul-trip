import type { Coords } from '@/lib/entities';

/** Отличие ресторана в гиде Michelin (звёзды / Bib Gourmand / Selected). */
export type MichelinDistinction = 'star3' | 'star2' | 'star1' | 'bib' | 'plate';

/** Заведение из доски «Мишлен» (выборка ресторанов гида по городу). */
export interface MichelinItem {
  id: string;
  name: string;
  coords: Coords | null;   // null → в списке есть, на карте нет (не нашёлся геокодером)
  cuisine: string;         // кухня, как в гиде ('Korean Contemporary', 'Sushi'…)
  distinction: MichelinDistinction;
  price: string;           // ценовой ориентир ₩…₩₩₩₩ (точных сумм в списке нет; '' если нет)
  geo: string;             // англ. запрос (имя + город + страна) — для Naver и геокодера
}

export interface DistinctionMeta { key: MichelinDistinction; label: string; short: string; color: string; }

/**
 * Палитра отличий: красная гамма Michelin для звёзд (3→2→1 от тёмного к яркому),
 * золотой — Bib Gourmand, серый — Selected. Цвет дублируется текстом (label/short).
 */
export const MICHELIN_DISTINCTIONS: DistinctionMeta[] = [
  { key: 'star3', label: '3 звезды', short: '★★★', color: '#a01018' },
  { key: 'star2', label: '2 звезды', short: '★★', color: '#c8102e' },
  { key: 'star1', label: '1 звезда', short: '★', color: '#e0202e' },
  { key: 'bib', label: 'Bib Gourmand', short: 'Bib', color: '#d99a1b' },
  { key: 'plate', label: 'Selected', short: '◍', color: '#5b6470' },
];

export function distinctionMeta(key: string): DistinctionMeta {
  return MICHELIN_DISTINCTIONS.find((d) => d.key === key) ?? MICHELIN_DISTINCTIONS[4];
}

/** Звёзд в отличии (0 для Bib/Selected) — для сортировки и фильтра «только со звёздами». */
export function starCount(d: MichelinDistinction): number {
  return d === 'star3' ? 3 : d === 'star2' ? 2 : d === 'star1' ? 1 : 0;
}

/** Ранг отличия для сортировки списка (звёзды → Bib → Selected). */
export function distinctionRank(d: MichelinDistinction): number {
  const order: MichelinDistinction[] = ['star3', 'star2', 'star1', 'bib', 'plate'];
  return order.indexOf(d);
}

/**
 * Ценовой ориентир по тиру Michelin — в списочном виде гида точных сумм нет, поэтому
 * приближаем бэндом ₩…₩₩₩₩: звёзды дороже, Bib Gourmand — бюджетно.
 */
export function priceBand(d: MichelinDistinction): string {
  switch (d) {
    case 'star3':
    case 'star2':
      return '₩₩₩₩';
    case 'star1':
      return '₩₩₩';
    case 'plate':
      return '₩₩';
    case 'bib':
      return '₩';
  }
}
