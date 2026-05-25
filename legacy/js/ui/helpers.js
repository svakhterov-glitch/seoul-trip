/* ============================================================
   UI-ПОМОЩНИКИ
   Маленькие чистые функции построения разметки: бейджи, ссылки.
   Не хранят состояние, используются и картой, и расписанием.
   ============================================================ */

import { lastDayNumber, getCategory } from "../model/entities.js";

export function kakaoLink(p) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.coords[0]},${p.coords[1]}`;
}

export function priceBadge(price, currency = "₩") {
  const c = currency || "₩";
  if (price === "free") return '<span class="badge price-free">Бесплатно</span>';
  if (price === 1) return `<span class="badge price-1">${c} недорого</span>`;
  if (price === 2) return `<span class="badge price-2">${c}${c} средний</span>`;
  if (price === 3) return `<span class="badge price-3">${c}${c}${c} выше среднего</span>`;
  return "";
}

export function byBadge(by) {
  if (!by || by === "Вместе" || by === "Оба") return '<span class="badge by-both">🧭 вместе</span>';
  return `<span class="badge by-person">🧭 ${by}</span>`;
}

export function catBadge(trip, catKey) {
  const c = getCategory(trip, catKey);
  if (!c) return "";
  return `<span class="badge badge-cat" style="background:${c.color};border-color:${c.color}">${c.label}</span>`;
}

export function dayLabel(trip, p) {
  if (p.dayNumber === 0) return "База · отель";
  if (p.dayNumber === lastDayNumber(trip)) return "Вылет";
  return "День " + p.dayNumber;
}
