/* ============================================================
   ГЕНЕРАЦИЯ КАРКАСА ДНЕЙ
   Из дат перелёта строим пустые дни календаря. Используется
   при создании новой поездки (Этап 1). Для seed-поездки Сеула
   дни заданы вручную с авторскими заголовками.
   ============================================================ */

import { createDay } from "./entities.js";

const MONTHS_RU = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/* 'YYYY-MM-DD' + смещение в днях → 'YYYY-MM-DD' */
export function addDays(isoDate, offset) {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/* 'YYYY-MM-DD' → '8 июня' */
export function formatDateRu(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

/* число дней между двумя датами включительно */
export function daysBetween(startIso, endIso) {
  const a = new Date(startIso + "T00:00:00");
  const b = new Date(endIso + "T00:00:00");
  return Math.round((b - a) / 86400000) + 1;
}

/**
 * Построить пустой каркас дней между startDate и endDate.
 * Первый день помечается категорией 'start', последний — 'final'.
 */
export function buildDays(startDate, endDate) {
  const total = daysBetween(startDate, endDate);
  const days = [];
  for (let i = 0; i < total; i++) {
    const number = i + 1;
    const date = addDays(startDate, i);
    let cat = null;
    if (number === 1) cat = "start";
    else if (number === total) cat = "final";
    days.push(
      createDay({
        number,
        date: formatDateRu(date),
        cat,
        title: number === 1 ? "Прилёт" : number === total ? "Вылет" : `День ${number}`,
        sub: "",
      })
    );
  }
  return days;
}
