// Теги предложки = КАТЕГОРИЯ места (смайлик), а ЦВЕТ метки на карте = автор
// (розовый — Полина, синий — Сережа). «Важно» — особый тег: красный, без
// смайлика, перекрывает цвет автора. '' = «без категории».

/** Категории предложки (значение тега). «Важно» — особая, без смайлика. */
export const SUGGESTION_TAGS = ['Еда', 'Природа', 'Красота', 'Мода', 'Достопримечательности', 'Важно'];

const TAG_EMOJI: Record<string, string> = {
  'Еда': '🍽',
  'Природа': '🌿',
  'Красота': '💄',
  'Мода': '👗',
  'Достопримечательности': '🏛',
  'Важно': '', // без смайлика — выделяется красным цветом
};

/** Смайлик категории ('' для «Важно» и для пустой категории). */
export function tagEmoji(tag: string): string {
  return TAG_EMOJI[tag] ?? '';
}

// Цвета: авторы и «Важно».
const COLOR_POLINA = '#ec4899';  // розовый
const COLOR_SEREZHA = '#2563eb'; // синий
const COLOR_VAZHNO = '#e8463c';  // красный (внимание)
const COLOR_DEFAULT = '#7c5cff'; // фиолетовый — автор не распознан

/** Кто автор по подписи from_user: 'polina' | 'serezha' | ''. Терпим к латинице. */
function authorKey(fromUser: string): string {
  const s = (fromUser || '').toLowerCase();
  if (s.includes('полин') || s.includes('polin')) return 'polina';
  if (s.includes('сереж') || s.includes('серг') || s.includes('serez') || s.includes('serg')) return 'serezha';
  return '';
}

/** Цвет метки на карте: «Важно» → красный; иначе по автору (розовый/синий). */
export function suggestionColor(tag: string, fromUser: string): string {
  if (tag === 'Важно') return COLOR_VAZHNO;
  const a = authorKey(fromUser);
  if (a === 'polina') return COLOR_POLINA;
  if (a === 'serezha') return COLOR_SEREZHA;
  return COLOR_DEFAULT;
}
