import { describe, it, expect } from 'vitest';
import {
  createTripDoc, DEFAULT_CATEGORIES, createPlace, getPlaceKind, PLACE_KINDS,
  ensureDays, ensureTripDefaults, updateTripMeta, placesForDay, getDay, lastDayNumber,
  addPlaceToTrip, updatePlaceInTrip, removePlaceFromTrip, movePlace, updateDay, addCategory, getCategory,
  addInboxLink, removeInboxLink, addPlaceFromInbox,
} from '@/lib/entities';

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
    expect(t.places).toEqual([]);
    expect(t.inbox).toEqual([]);
    expect(t.categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('генерирует каркас дней из дат (включительно)', () => {
    const t = createTripDoc(input);
    expect(t.days).toHaveLength(9);
    expect(t.days[0].number).toBe(1);
  });

  it('генерирует разные id', () => {
    expect(createTripDoc(input).id).not.toBe(createTripDoc(input).id);
  });
});

describe('ensureDays', () => {
  it('догенерирует дни, если их нет', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const empty = { ...t, days: [] };
    const fixed = ensureDays(empty);
    expect(fixed.days).toHaveLength(3);
  });
  it('не трогает поездку с днями', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(ensureDays(t)).toBe(t);
  });
});

describe('createTripDoc — спутники', () => {
  it('новая поездка имеет пустой список спутников', () => {
    const t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    expect(t.companions).toEqual([]);
  });
});

describe('ensureTripDefaults', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('проставляет companions старой поездке без этого поля', () => {
    const t = make();
    const old = { ...t } as Record<string, unknown>;
    delete old.companions;
    const fixed = ensureTripDefaults(old as never);
    expect(fixed.companions).toEqual([]);
  });
  it('догенерирует дни, если их нет', () => {
    const fixed = ensureTripDefaults({ ...make(), days: [] });
    expect(fixed.days).toHaveLength(3);
  });
  it('не трогает уже корректную поездку', () => {
    const t = make();
    expect(ensureTripDefaults(t)).toBe(t);
  });
});

describe('updateTripMeta', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('меняет название, описание и спутников, не трогая остального', () => {
    const t = make();
    const next = updateTripMeta(t, { title: 'Сеул', lead: 'Весна', companions: ['Аня'] });
    expect(next).toMatchObject({ title: 'Сеул', lead: 'Весна', companions: ['Аня'] });
    expect(next.city).toBe(t.city);
    expect(t.title).toBe('X'); // исходник не мутирован
  });
});

describe('мутации мест (иммутабельно)', () => {
  const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('addPlaceToTrip добавляет место в конец дня с order', () => {
    const t1 = addPlaceToTrip(base, 2, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const t2 = addPlaceToTrip(t1, 2, { name: 'Парк', coords: [37.6, 127.1], time: '', desc: '', price: null, image: '' });
    const day2 = placesForDay(t2, 2);
    expect(day2.map((p) => p.name)).toEqual(['Кафе', 'Парк']);
    expect(day2[0].order).toBe(0);
    expect(day2[1].order).toBe(1);
    expect(base.places).toHaveLength(0); // исходник не мутирован
  });

  it('updatePlaceInTrip меняет поля места', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = updatePlaceInTrip(t1, id, { name: 'Кофейня', time: '10:00' });
    expect(placesForDay(t2, 1)[0]).toMatchObject({ name: 'Кофейня', time: '10:00' });
  });

  it('removePlaceFromTrip удаляет место', () => {
    const t1 = addPlaceToTrip(base, 1, { name: 'Кафе', coords: [37.5, 127], time: '', desc: '', price: null, image: '' });
    const id = placesForDay(t1, 1)[0].id;
    const t2 = removePlaceFromTrip(t1, id);
    expect(placesForDay(t2, 1)).toHaveLength(0);
  });
});

describe('movePlace', () => {
  // День 1 c тремя местами A,B,C (order 0,1,2)
  function withThree() {
    let t = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    for (const name of ['A', 'B', 'C']) {
      t = addPlaceToTrip(t, 1, { name, coords: [37, 127], time: '', desc: '', price: null, image: '' });
    }
    return t;
  }
  const ids = (t: ReturnType<typeof withThree>, day: number) => placesForDay(t, day).map((p) => p.name);

  it('меняет порядок внутри дня (C в начало)', () => {
    const t = withThree();
    const cId = placesForDay(t, 1)[2].id;
    const r = movePlace(t, cId, 1, 0);
    expect(ids(r, 1)).toEqual(['C', 'A', 'B']);
    expect(placesForDay(r, 1).map((p) => p.order)).toEqual([0, 1, 2]);
  });

  it('меняет порядок внутри дня (A в конец)', () => {
    const t = withThree();
    const aId = placesForDay(t, 1)[0].id;
    const r = movePlace(t, aId, 1, 2);
    expect(ids(r, 1)).toEqual(['B', 'C', 'A']);
  });

  it('переносит место в другой день и перенумеровывает оба дня', () => {
    const t = withThree();
    const bId = placesForDay(t, 1)[1].id;
    const r = movePlace(t, bId, 2, 0);
    expect(ids(r, 1)).toEqual(['A', 'C']);
    expect(placesForDay(r, 1).map((p) => p.order)).toEqual([0, 1]);
    expect(ids(r, 2)).toEqual(['B']);
    expect(placesForDay(r, 2)[0]).toMatchObject({ dayNumber: 2, order: 0 });
  });

  it('клампит индекс за пределами дня', () => {
    const t = withThree();
    const aId = placesForDay(t, 1)[0].id;
    expect(ids(movePlace(t, aId, 1, 99), 1)).toEqual(['B', 'C', 'A']);
  });

  it('не мутирует исходник и игнорирует неизвестный id', () => {
    const t = withThree();
    expect(movePlace(t, 'нет-такого', 1, 0)).toBe(t);
    movePlace(t, placeId(t), 2, 0);
    expect(ids(t, 1)).toEqual(['A', 'B', 'C']);
  });
  function placeId(t: ReturnType<typeof withThree>) { return placesForDay(t, 1)[0].id; }
});

describe('инбокс ссылок', () => {
  const base = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });

  it('createPlace по умолчанию sourceUrl пустой', () => {
    expect(createPlace().sourceUrl).toBe('');
  });

  it('addInboxLink разбирает map-ссылку и кладёт в начало', () => {
    let t = addInboxLink(base(), 'https://www.instagram.com/p/Cabc/');
    t = addInboxLink(t, 'https://www.google.com/maps/place/Onion/@37.5,127.0');
    expect(t.inbox).toHaveLength(2);
    expect(t.inbox[0]).toMatchObject({ name: 'Onion', coords: [37.5, 127.0], source: 'google' }); // свежая сверху
    expect(t.inbox[1]).toMatchObject({ source: 'instagram', coords: null });
    expect(t.inbox[0].id).not.toBe(t.inbox[1].id);
  });

  it('addInboxLink игнорирует пустой URL', () => {
    expect(addInboxLink(base(), '   ').inbox).toHaveLength(0);
  });

  it('removeInboxLink удаляет ссылку', () => {
    const t = addInboxLink(base(), 'https://someblog.com/x');
    const id = t.inbox[0].id;
    expect(removeInboxLink(t, id).inbox).toHaveLength(0);
  });

  it('addPlaceFromInbox создаёт место с sourceUrl и убирает ссылку', () => {
    const t = addInboxLink(base(), 'https://www.google.com/maps/place/Onion/@37.5,127.0');
    const link = t.inbox[0];
    const r = addPlaceFromInbox(t, link.id, 2, { name: 'Onion', coords: [37.5, 127.0], time: '', desc: '', price: null, image: '' });
    expect(r.inbox).toHaveLength(0);
    const place = placesForDay(r, 2)[0];
    expect(place).toMatchObject({ name: 'Onion', dayNumber: 2, order: 0, source: 'link', sourceUrl: link.url });
  });

  it('addPlaceFromInbox с неизвестным id ничего не меняет', () => {
    const t = addInboxLink(base(), 'https://someblog.com/x');
    expect(addPlaceFromInbox(t, 'нет', 1, { name: 'A', coords: [1, 2], time: '', desc: '', price: null, image: '' })).toBe(t);
  });

  it('ensureTripDefaults чинит inbox-не-массив', () => {
    const broken = { ...base(), inbox: undefined as unknown as [] };
    expect(Array.isArray(ensureTripDefaults(broken).inbox)).toBe(true);
  });
});

describe('createPlace — новые поля', () => {
  it('по умолчанию by/kind/note пустые', () => {
    const p = createPlace({ name: 'X' });
    expect(p.by).toBe('');
    expect(p.kind).toBe('');
    expect(p.note).toBe('');
  });
  it('сохраняет переданные by/kind/note', () => {
    const p = createPlace({ name: 'X', by: 'Аня', kind: 'museum', note: 'must see' });
    expect(p).toMatchObject({ by: 'Аня', kind: 'museum', note: 'must see' });
  });
});

describe('getPlaceKind', () => {
  it('находит формат по ключу', () => {
    expect(getPlaceKind('museum')?.label).toBe('Музей/галерея');
  });
  it('неизвестный ключ → null', () => {
    expect(getPlaceKind('zzz')).toBeNull();
  });
  it('набор форматов непустой', () => {
    expect(PLACE_KINDS.length).toBeGreaterThan(0);
  });
});

describe('updateDay', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
  it('меняет название и категорию дня иммутабельно', () => {
    const t = make();
    const next = updateDay(t, 2, { title: 'Прогулка', cat: 'dist' });
    expect(getDay(next, 2)).toMatchObject({ title: 'Прогулка', cat: 'dist' });
    expect(getDay(t, 2)?.title).toBe('День 2'); // исходник не мутирован
  });
});

describe('addCategory', () => {
  const make = () => createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
  it('добавляет категорию и возвращает её ключ', () => {
    const t = make();
    const before = t.categories.length;
    const { trip: next, key } = addCategory(t, { label: 'Гастротур', color: '#ff8800' });
    expect(next.categories.length).toBe(before + 1);
    expect(getCategory(next, key)).toMatchObject({ label: 'Гастротур', color: '#ff8800' });
    expect(t.categories.length).toBe(before); // исходник не мутирован
  });
});

describe('помощники чтения', () => {
  const t = addPlaceToTrip(
    createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' }),
    2, { name: 'A', coords: [37, 127], time: '', desc: '', price: null, image: '' });
  it('getDay по номеру', () => { expect(getDay(t, 2)?.number).toBe(2); });
  it('lastDayNumber', () => { expect(lastDayNumber(t)).toBe(3); });
});
