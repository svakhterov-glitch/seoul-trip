export interface CredentialErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateCredentials(email: string, password: string): CredentialErrors {
  const errors: CredentialErrors = {};
  if (!email.trim()) errors.email = 'Введите email';
  else if (!EMAIL_RE.test(email)) errors.email = 'Проверьте формат email';
  if (!password) errors.password = 'Введите пароль';
  else if (password.length < 6) errors.password = 'Пароль должен быть не короче 6 символов';
  return errors;
}

export interface NewTripInput {
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

export type NewTripErrors = Partial<Record<keyof NewTripInput, string>>;

export function validateNewTrip(input: NewTripInput): NewTripErrors {
  const errors: NewTripErrors = {};
  if (!input.title.trim()) errors.title = 'Введите название поездки';
  if (!input.country.trim()) errors.country = 'Укажите страну';
  if (!input.city.trim()) errors.city = 'Укажите город';
  if (!input.startDate) errors.startDate = 'Укажите дату начала';
  if (!input.endDate) errors.endDate = 'Укажите дату конца';
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = 'Дата конца не раньше начала поездки';
  }
  return errors;
}
