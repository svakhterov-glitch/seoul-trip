export interface Category {
  key: string;
  label: string;
  color: string;
}

// Стартовый набор категорий (порт из legacy js/model/config.js).
export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'start', label: 'Прилёт/отъезд', color: '#6b7385' },
  { key: 'tour', label: 'Экскурсии', color: '#2f6fd6' },
  { key: 'dist', label: 'Прогулки', color: '#159a93' },
  { key: 'shop', label: 'Шопинг', color: '#d98a1b' },
  { key: 'trend', label: 'Тренды', color: '#9a55c9' },
];

export interface TripDoc {
  id: string;
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
  lead: string;
  note: string;
  currency: string;
  categories: Category[];
  days: unknown[];
  places: unknown[];
  inbox: unknown[];
}

export interface CreateTripInput {
  title: string;
  country: string;
  city: string;
  startDate: string;
  endDate: string;
}

function newId(): string {
  return `trip_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function createTripDoc(input: CreateTripInput): TripDoc {
  return {
    id: newId(),
    title: input.title.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    startDate: input.startDate,
    endDate: input.endDate,
    lead: '',
    note: '',
    currency: 'RUB',
    categories: DEFAULT_CATEGORIES,
    days: [],
    places: [],
    inbox: [],
  };
}
