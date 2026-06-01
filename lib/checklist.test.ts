import { describe, it, expect } from 'vitest';
import {
  createTripDoc, addPlaceToTrip, addChecklistItem, toggleChecklistItem, removeChecklistItem,
} from '@/lib/entities';

const base = { title: 'Сеул', country: 'Корея', city: 'Сеул', startDate: '2026-06-07', endDate: '2026-06-11' };

function tripWithPlace() {
  let t = createTripDoc(base);
  t = addPlaceToTrip(t, 2, { name: 'Рынок', coords: null, time: '', desc: '', price: null, image: '' });
  return { trip: t, id: t.places[0].id };
}

describe('чеклист места', () => {
  it('новое место — пустой чеклист', () => {
    const { trip } = tripWithPlace();
    expect(trip.places[0].checklist).toEqual([]);
  });

  it('addChecklistItem добавляет пункт (не done), пустой текст игнорит', () => {
    let { trip, id } = tripWithPlace();
    trip = addChecklistItem(trip, id, '  купить ким  ');
    trip = addChecklistItem(trip, id, '   ');
    const cl = trip.places[0].checklist;
    expect(cl).toHaveLength(1);
    expect(cl[0]).toMatchObject({ text: 'купить ким', done: false });
    expect(cl[0].id).toBeTruthy();
  });

  it('toggleChecklistItem переключает done туда-обратно', () => {
    let { trip, id } = tripWithPlace();
    trip = addChecklistItem(trip, id, 'попробовать суп');
    const itemId = trip.places[0].checklist[0].id;
    trip = toggleChecklistItem(trip, id, itemId);
    expect(trip.places[0].checklist[0].done).toBe(true);
    trip = toggleChecklistItem(trip, id, itemId);
    expect(trip.places[0].checklist[0].done).toBe(false);
  });

  it('removeChecklistItem удаляет пункт', () => {
    let { trip, id } = tripWithPlace();
    trip = addChecklistItem(trip, id, 'a');
    trip = addChecklistItem(trip, id, 'b');
    const firstId = trip.places[0].checklist[0].id;
    trip = removeChecklistItem(trip, id, firstId);
    expect(trip.places[0].checklist.map((i) => i.text)).toEqual(['b']);
  });

  it('операции с неизвестным place/item не падают', () => {
    const { trip } = tripWithPlace();
    expect(addChecklistItem(trip, 'nope', 'x').places[0].checklist).toEqual([]);
    expect(() => toggleChecklistItem(trip, 'nope', 'no')).not.toThrow();
  });
});
