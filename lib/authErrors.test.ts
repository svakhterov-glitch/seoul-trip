import { describe, it, expect } from 'vitest';
import { mapAuthError } from '@/lib/authErrors';

describe('mapAuthError', () => {
  it('неверные учётные данные', () => {
    expect(mapAuthError({ message: 'Invalid login credentials' }))
      .toBe('Неверный email или пароль');
  });
  it('email уже зарегистрирован', () => {
    expect(mapAuthError({ message: 'User already registered' }))
      .toBe('Этот email уже зарегистрирован — войдите');
  });
  it('слишком короткий пароль', () => {
    expect(mapAuthError({ message: 'Password should be at least 6 characters' }))
      .toBe('Пароль должен быть не короче 6 символов');
  });
  it('неизвестная ошибка → общий текст', () => {
    expect(mapAuthError({ message: 'some weird error' }))
      .toBe('Что-то пошло не так. Попробуйте ещё раз');
  });
  it('null → пустая строка', () => {
    expect(mapAuthError(null)).toBe('');
  });
});
