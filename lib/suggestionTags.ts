/** Теги предложки и их цвета (для карты и интерфейса). '' = «Без тегов». */
export const SUGGESTION_TAGS = ['Полина', 'Сережа', 'Важно'];

/** Цвет тега без тега — фирменный фиолетовый предложки. */
export const TAG_DEFAULT_COLOR = '#7c5cff';

const TAG_COLORS: Record<string, string> = {
  'Полина': '#c026d3', // пурпурный
  'Сережа': '#2563eb', // синий
  'Важно': '#e8463c',  // красный (внимание)
};

/** Цвет тега; '' / неизвестный → дефолтный (фиолетовый предложки). */
export function tagColor(tag: string): string {
  return TAG_COLORS[tag] || TAG_DEFAULT_COLOR;
}
