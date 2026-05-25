export interface AuthErrorLike {
  message?: string;
  status?: number;
}

export function mapAuthError(error: AuthErrorLike | null | undefined): string {
  if (!error) return '';
  const m = (error.message || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Этот email уже зарегистрирован — войдите';
  }
  if (m.includes('password should be at least')) {
    return 'Пароль должен быть не короче 6 символов';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return 'Проверьте формат email';
  }
  return 'Что-то пошло не так. Попробуйте ещё раз';
}
