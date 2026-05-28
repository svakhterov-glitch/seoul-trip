import type { Coords } from '@/lib/entities';

/** Рубрика трендового места из медиа-подборок. */
export type MediaRubric = 'new' | 'best' | 'trending';

/** Место из доски «Медиа» (редакционные подборки города). */
export interface MediaItem {
  id: string;
  name: string;
  coords: Coords | null;   // null → в витрине есть, на карте нет
  segment: string;         // ключ PLACE_KINDS (food/museum/…)
  rubric: MediaRubric;
  blurb: string;           // редакторская выжимка
  image: string;           // '' если нет фото
  source: string;          // 'Time Out Seoul'
  sourceUrl: string;       // ссылка на материал ('' если нет)
  sourceDate: string;      // 'март 2026' / '2025' / ''
}

export interface RubricMeta { key: MediaRubric; label: string; color: string; }

/**
 * Палитра рубрик — дальтоник-безопасная (бирюзовый / золотой / оранжево-красный,
 * без проблемной зелёно-красной пары). Цвет — носитель «градуса», но рубрика
 * всегда дублируется текстом (label) в чипе и легенде.
 */
export const MEDIA_RUBRICS: RubricMeta[] = [
  { key: 'new', label: 'Новое', color: '#1f9e8f' },
  { key: 'best', label: 'Лучшее', color: '#d99a1b' },
  { key: 'trending', label: 'В тренде', color: '#e8602c' },
];

export function rubricMeta(key: string): RubricMeta {
  return MEDIA_RUBRICS.find((r) => r.key === key) ?? MEDIA_RUBRICS[2];
}
