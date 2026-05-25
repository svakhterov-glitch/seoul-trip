import { describe, it, expect } from 'vitest';
import { addDays, formatDateRu, formatDateRange, daysBetween, buildDays } from '@/lib/days';

describe('addDays', () => {
  it('прибавляет дни через границу месяца', () => {
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
  });
  it('нулевое смещение возвращает ту же дату', () => {
    expect(addDays('2026-06-07', 0)).toBe('2026-06-07');
  });
});

describe('formatDateRu', () => {
  it('форматирует день и месяц по-русски', () => {
    expect(formatDateRu('2026-06-08')).toBe('8 июня');
  });
});

describe('formatDateRange', () => {
  it('один месяц — компактно', () => {
    expect(formatDateRange('2026-06-07', '2026-06-15')).toBe('7–15 июня 2026');
  });
  it('разные месяцы — полно', () => {
    expect(formatDateRange('2026-06-28', '2026-07-03')).toBe('28 июня – 3 июля 2026');
  });
});

describe('daysBetween', () => {
  it('считает включительно', () => {
    expect(daysBetween('2026-06-07', '2026-06-15')).toBe(9);
  });
  it('одна и та же дата → 1', () => {
    expect(daysBetween('2026-06-07', '2026-06-07')).toBe(1);
  });
});

describe('buildDays', () => {
  it('строит дни с первым «Прилёт» и последним «Вылет»', () => {
    const days = buildDays('2026-06-07', '2026-06-09');
    expect(days).toHaveLength(3);
    expect(days[0]).toMatchObject({ number: 1, date: '7 июня', cat: 'start', title: 'Прилёт' });
    expect(days[1]).toMatchObject({ number: 2, date: '8 июня', cat: null, title: 'День 2' });
    expect(days[2]).toMatchObject({ number: 3, date: '9 июня', cat: 'final', title: 'Вылет' });
  });
  it('поездка из одного дня', () => {
    const days = buildDays('2026-06-07', '2026-06-07');
    expect(days).toHaveLength(1);
    expect(days[0]).toMatchObject({ number: 1, cat: 'start' });
  });
});
