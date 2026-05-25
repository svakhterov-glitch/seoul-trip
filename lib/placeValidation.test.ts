import { describe, it, expect } from 'vitest';
import { validatePlace } from '@/lib/placeValidation';

describe('validatePlace', () => {
  it('пустое название → ошибка', () => {
    expect(validatePlace({ name: '', coords: [37, 127], time: '', desc: '', price: null, image: '' }).name).toBeTruthy();
  });
  it('нет точки на карте → ошибка', () => {
    expect(validatePlace({ name: 'Кафе', coords: null, time: '', desc: '', price: null, image: '' }).coords).toBeTruthy();
  });
  it('валидно → нет ошибок', () => {
    expect(validatePlace({ name: 'Кафе', coords: [37, 127], time: '', desc: '', price: null, image: '' })).toEqual({});
  });
});
