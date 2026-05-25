import { describe, it, expect } from 'vitest';
import { validateCredentials, validateNewTrip } from '@/lib/validation';

describe('validateCredentials', () => {
  it('пустые поля', () => {
    const e = validateCredentials('', '');
    expect(e.email).toBe('Введите email');
    expect(e.password).toBe('Введите пароль');
  });
  it('кривой email', () => {
    expect(validateCredentials('abc', 'secret1').email).toBe('Проверьте формат email');
  });
  it('короткий пароль', () => {
    expect(validateCredentials('a@b.ru', '123').password)
      .toBe('Пароль должен быть не короче 6 символов');
  });
  it('валидные данные → нет ошибок', () => {
    expect(validateCredentials('a@b.ru', 'secret1')).toEqual({});
  });
});

describe('validateNewTrip', () => {
  const ok = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-15' };
  it('валидно → нет ошибок', () => {
    expect(validateNewTrip(ok)).toEqual({});
  });
  it('обязательные поля', () => {
    const e = validateNewTrip({ title: '', country: '', city: '', startDate: '', endDate: '' });
    expect(e.title).toBeTruthy();
    expect(e.country).toBeTruthy();
    expect(e.city).toBeTruthy();
    expect(e.startDate).toBeTruthy();
    expect(e.endDate).toBeTruthy();
  });
  it('дата конца раньше начала', () => {
    expect(validateNewTrip({ ...ok, endDate: '2026-06-01' }).endDate)
      .toBe('Дата конца не раньше начала поездки');
  });
});
