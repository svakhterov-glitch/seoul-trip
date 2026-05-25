import type { PlaceInput } from '@/lib/entities';

export type PlaceErrors = Partial<Record<'name' | 'coords', string>>;

export function validatePlace(input: PlaceInput): PlaceErrors {
  const errors: PlaceErrors = {};
  if (!input.name.trim()) errors.name = 'Введите название места';
  if (!input.coords) errors.coords = 'Укажите точку на карте';
  return errors;
}
