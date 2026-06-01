import { describe, it, expect } from 'vitest';
import {
  createTripDoc, ensureTripDefaults,
  addShoppingItem, toggleShoppingItem, removeShoppingItem,
} from '@/lib/entities';

const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-11' };

describe('список покупок поездки', () => {
  it('новая поездка имеет пустой shopping', () => {
    expect(createTripDoc(base).shopping).toEqual([]);
  });

  it('addShoppingItem добавляет пункт с текстом/ссылкой/источником', () => {
    const t = addShoppingItem(createTripDoc(base), { text: 'Сыворотка Oliveyoung', url: 'https://oliveyoung.co.kr/x', source: 'tg' });
    expect(t.shopping).toHaveLength(1);
    expect(t.shopping[0]).toMatchObject({ text: 'Сыворотка Oliveyoung', url: 'https://oliveyoung.co.kr/x', done: false, source: 'tg' });
    expect(t.shopping[0].id).toBeTruthy();
  });

  it('пустой текст игнорируется', () => {
    const t = addShoppingItem(createTripDoc(base), { text: '   ' });
    expect(t.shopping).toHaveLength(0);
  });

  it('источник по умолчанию — manual, url по умолчанию — пустой', () => {
    const t = addShoppingItem(createTripDoc(base), { text: 'Маска' });
    expect(t.shopping[0].source).toBe('manual');
    expect(t.shopping[0].url).toBe('');
  });

  it('toggleShoppingItem переключает done', () => {
    let t = addShoppingItem(createTripDoc(base), { text: 'Маска' });
    const id = t.shopping[0].id;
    t = toggleShoppingItem(t, id);
    expect(t.shopping[0].done).toBe(true);
    t = toggleShoppingItem(t, id);
    expect(t.shopping[0].done).toBe(false);
  });

  it('removeShoppingItem удаляет пункт', () => {
    let t = addShoppingItem(createTripDoc(base), { text: 'Маска' });
    t = removeShoppingItem(t, t.shopping[0].id);
    expect(t.shopping).toHaveLength(0);
  });

  it('мутации иммутабельны (исходный документ не меняется)', () => {
    const t0 = createTripDoc(base);
    const t1 = addShoppingItem(t0, { text: 'Маска' });
    expect(t0.shopping).toHaveLength(0);
    expect(t1).not.toBe(t0);
  });

  it('ensureTripDefaults догенерирует shopping старым поездкам', () => {
    const legacy = { ...createTripDoc(base) } as Record<string, unknown>;
    delete legacy.shopping;
    const fixed = ensureTripDefaults(legacy as never);
    expect(Array.isArray(fixed.shopping)).toBe(true);
  });
});
