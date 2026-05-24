/* ============================================================
   UI-ПОМОЩНИКИ
   Маленькие чистые функции построения разметки: бейджи, ссылки.
   Не хранят состояние, используются и картой, и расписанием.
   ============================================================ */

import { CATS } from "../model/config.js";
import { lastDayNumber } from "../model/entities.js";

export function kakaoLink(p) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(p.name)},${p.coords[0]},${p.coords[1]}`;
}

export function priceBadge(price) {
  if (price === "free") return '<span class="badge price-free">Бесплатно</span>';
  if (price === 1) return '<span class="badge price-1">₩ недорого</span>';
  if (price === 2) return '<span class="badge price-2">₩₩ средний</span>';
  if (price === 3) return '<span class="badge price-3">₩₩₩ выше среднего</span>';
  return "";
}

export function byBadge(by) {
  if (by === "Сергей") return '<span class="badge by-sergey">🧭 нашёл Сергей</span>';
  if (by === "Полина") return '<span class="badge by-polina">🧭 нашла Полина</span>';
  return '<span class="badge by-both">🧭 вместе</span>';
}

export function catBadge(catKey) {
  if (!catKey || !CATS[catKey]) return "";
  return `<span class="badge ${CATS[catKey].cls}">${CATS[catKey].label}</span>`;
}

export function dayLabel(trip, p) {
  if (p.dayNumber === 0) return "База · отель";
  if (p.dayNumber === lastDayNumber(trip)) return "Вылет";
  return "День " + p.dayNumber;
}
