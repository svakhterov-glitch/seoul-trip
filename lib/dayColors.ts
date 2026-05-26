/** Палитра для подсветки дней на карте: насыщенные различимые цвета. */
export const DAY_PALETTE = [
  '#e8463c', '#2f6fd6', '#159a93', '#d98a1b',
  '#9a55c9', '#e36aa0', '#3fa34d', '#0f8b8d',
];

/** Цвет дня: 0 (обзор «весь маршрут») — тёмно-синий; 1..N — циклично из палитры. */
export function dayColor(dayNumber: number): string {
  if (dayNumber < 1) return '#0f1b3d';
  return DAY_PALETTE[(dayNumber - 1) % DAY_PALETTE.length];
}
