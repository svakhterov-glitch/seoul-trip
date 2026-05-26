import { describe, it, expect } from 'vitest';
import { coverKey, cityCover } from '@/lib/cityCovers';

describe('coverKey', () => {
  it('убирает регистр и крайние пробелы', () => {
    expect(coverKey('  Сеул ')).toBe('сеул');
  });
});

describe('cityCover', () => {
  it('неизвестный город → пустая строка', () => {
    expect(cityCover('Город-которого-нет')).toBe('');
  });
  it('Сеул → картинка города (без учёта регистра/языка)', () => {
    expect(cityCover('Сеул')).toBe('/covers/seoul.png');
    expect(cityCover(' SEOUL ')).toBe('/covers/seoul.png');
  });
});
