import { describe, it, expect } from 'vitest';
import { createTripDoc, DEFAULT_CATEGORIES } from '@/lib/entities';

describe('createTripDoc', () => {
  const input = { title: ' Сеул ', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' };

  it('тримит название и заполняет поля', () => {
    const t = createTripDoc(input);
    expect(t.title).toBe('Сеул');
    expect(t.country).toBe('Корея');
    expect(t.city).toBe('Сеул');
    expect(t.startDate).toBe('2026-06-07');
    expect(t.endDate).toBe('2026-06-15');
  });

  it('даёт непустой строковый id с префиксом trip_', () => {
    const t = createTripDoc(input);
    expect(typeof t.id).toBe('string');
    expect(t.id.startsWith('trip_')).toBe(true);
  });

  it('инициализирует пустые коллекции и дефолтные категории', () => {
    const t = createTripDoc(input);
    expect(t.days).toEqual([]);
    expect(t.places).toEqual([]);
    expect(t.inbox).toEqual([]);
    expect(t.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('генерирует разные id', () => {
    expect(createTripDoc(input).id).not.toBe(createTripDoc(input).id);
  });
});
