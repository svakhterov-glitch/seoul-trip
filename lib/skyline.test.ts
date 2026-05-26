import { describe, it, expect } from 'vitest';
import { hashString, buildSkyline } from '@/lib/skyline';

describe('hashString', () => {
  it('стабилен для одной строки', () => {
    expect(hashString('Сеул')).toBe(hashString('Сеул'));
  });
  it('различается для разных строк', () => {
    expect(hashString('Сеул')).not.toBe(hashString('Токио'));
  });
});

describe('buildSkyline', () => {
  it('детерминирован по названию города', () => {
    expect(buildSkyline('Сеул')).toEqual(buildSkyline('Сеул'));
  });
  it('разные города — разные силуэты', () => {
    expect(buildSkyline('Сеул')).not.toEqual(buildSkyline('Токио'));
  });
  it('заполняет ровно заданное число колонок', () => {
    const cols = 48;
    const b = buildSkyline('Сеул', cols);
    const total = b.reduce((s, x) => s + x.w, 0);
    expect(total).toBe(cols);
    expect(b[0].x).toBe(0);
  });
  it('высоты в диапазоне 0.3..1.0', () => {
    for (const x of buildSkyline('Пусан')) {
      expect(x.h).toBeGreaterThanOrEqual(0.3);
      expect(x.h).toBeLessThanOrEqual(1);
    }
  });
});
