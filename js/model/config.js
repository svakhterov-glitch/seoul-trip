/* ============================================================
   КОНФИГ ПРЕЗЕНТАЦИИ (не данные, а оформление категорий)
   Категории дней и их привязка к CSS-переменным цветов.
   ============================================================ */

export const CATS = {
  start: { label: "Старт",   cls: "cat-start" },
  tour:  { label: "Туризм",  cls: "cat-tour"  },
  dist:  { label: "Районы",  cls: "cat-dist"  },
  shop:  { label: "Шоппинг", cls: "cat-shop"  },
  trend: { label: "Тренды",  cls: "cat-trend" },
  final: { label: "Финал",   cls: "cat-start" },
};

/* какая CSS-переменная задаёт цвет категории */
export const catVar = {
  start: "--c-start", tour: "--c-tour", dist: "--c-dist",
  shop: "--c-shop",   trend: "--c-trend", final: "--c-start",
};

/* прочитать цвет категории из CSS-переменной */
export function catColor(catKey) {
  const v = catVar[catKey];
  if (!v) return "";
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}
