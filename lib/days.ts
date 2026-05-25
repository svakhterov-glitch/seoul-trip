import { createDay, type Day } from '@/lib/entities';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** Разобрать 'YYYY-MM-DD' в Date в UTC (без влияния часового пояса). */
function parseUtc(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** 'YYYY-MM-DD' + смещение в днях → 'YYYY-MM-DD' */
export function addDays(isoDate: string, offset: number): string {
  const d = parseUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' → '8 июня' */
export function formatDateRu(isoDate: string): string {
  const d = parseUtc(isoDate);
  return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]}`;
}

/** '2026-06-07'+'2026-06-15' → '7–15 июня 2026' (умно по месяцам/годам) */
export function formatDateRange(startIso: string, endIso: string): string {
  const a = parseUtc(startIso);
  const b = parseUtc(endIso);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  if (sameMonth) {
    return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_RU[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  }
  const left = `${a.getUTCDate()} ${MONTHS_RU[a.getUTCMonth()]}`;
  const right = `${b.getUTCDate()} ${MONTHS_RU[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
  return `${left} – ${right}`;
}

/** число дней между датами включительно */
export function daysBetween(startIso: string, endIso: string): number {
  const a = parseUtc(startIso);
  const b = parseUtc(endIso);
  return Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
}

/** Пустой каркас дней: первый — 'start'/«Прилёт», последний — 'final'/«Вылет». */
export function buildDays(startDate: string, endDate: string): Day[] {
  const total = daysBetween(startDate, endDate);
  const days: Day[] = [];
  for (let i = 0; i < total; i++) {
    const number = i + 1;
    const date = addDays(startDate, i);
    let cat: string | null = null;
    if (number === 1) cat = 'start';
    else if (number === total) cat = 'final';
    days.push(
      createDay({
        number,
        date: formatDateRu(date),
        cat,
        title: number === 1 ? 'Прилёт' : number === total ? 'Вылет' : `День ${number}`,
      }),
    );
  }
  return days;
}
