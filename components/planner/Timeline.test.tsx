import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '@/components/planner/Timeline';
import { createTripDoc, addPlaceToTrip } from '@/lib/entities';

function rect(top: number, height: number): DOMRect {
  return { top, height, bottom: top + height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} } as DOMRect;
}

// jsdom не прокидывает clientY через PointerEvent — используем MouseEvent (clientY
// в конструкторе работает) с типом pointer*, дописывая pointerId/pointerType.
function firePointer(el: Element, type: string, init: { pointerId: number; clientY?: number; button?: number }) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, button: init.button ?? 0, clientY: init.clientY ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: init.pointerId });
  Object.defineProperty(ev, 'pointerType', { value: 'mouse' });
  act(() => { el.dispatchEvent(ev); });
}

function tripWithPlace() {
  const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
  return addPlaceToTrip(base, 1, { name: 'Дворец Кёнбоккун', coords: [37.5, 127], time: '10:00', desc: 'Главный дворец', price: 1, image: '' });
}

describe('Timeline', () => {
  it('рисует место выбранного дня', () => {
    render(<Timeline trip={tripWithPlace()} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    expect(screen.getByText('Дворец Кёнбоккун')).toBeInTheDocument();
    expect(screen.getByText('Главный дворец')).toBeInTheDocument();
  });

  it('кнопка «Добавить место» вызывает onAddPlace с номером дня', async () => {
    const onAddPlace = vi.fn();
    render(<Timeline trip={tripWithPlace()} day={1} onAddPlace={onAddPlace} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    await userEvent.click(screen.getAllByRole('button', { name: /Добавить место/i })[0]);
    expect(onAddPlace).toHaveBeenCalledWith(1);
  });

  it('кнопка удалить вызывает onDeletePlace с id', async () => {
    const onDeletePlace = vi.fn();
    const trip = tripWithPlace();
    render(<Timeline trip={trip} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={onDeletePlace} onSelectPlace={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Удалить Дворец Кёнбоккун/i }));
    expect(onDeletePlace).toHaveBeenCalledWith(trip.places[0].id);
  });

  it('пустой день показывает подсказку', () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    render(<Timeline trip={base} day={2} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    expect(screen.getByText(/пока ничего не запланировано/i)).toBeInTheDocument();
  });

  it('редактирование дня: меняет категорию и вызывает onSaveDay', async () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const onSaveDay = vi.fn();
    render(<Timeline trip={base} day={2} categories={base.categories}
      onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} onSaveDay={onSaveDay} />);
    await userEvent.click(screen.getByRole('button', { name: /Изменить день/i }));
    await userEvent.selectOptions(screen.getByLabelText('Категория дня'), 'dist');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSaveDay).toHaveBeenCalledWith(2, expect.objectContaining({ cat: 'dist' }));
  });

  it('ручка переноса: стрелка вниз вызывает onMovePlace на следующую позицию', async () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    let trip = addPlaceToTrip(base, 1, { name: 'Первое', coords: [37, 127], time: '', desc: '', price: null, image: '' });
    trip = addPlaceToTrip(trip, 1, { name: 'Второе', coords: [37, 127], time: '', desc: '', price: null, image: '' });
    const onMovePlace = vi.fn();
    render(<Timeline trip={trip} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} onMovePlace={onMovePlace} />);
    const grip = screen.getByRole('button', { name: /Переместить «Первое»/i });
    grip.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onMovePlace).toHaveBeenCalledWith(trip.places[0].id, 1, 1);
  });

  it('перетаскивание мышью (pointer): тянем первое место вниз → onMovePlace(id,1,1)', () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    let trip = addPlaceToTrip(base, 1, { name: 'Первое', coords: [37, 127], time: '', desc: '', price: null, image: '' });
    trip = addPlaceToTrip(trip, 1, { name: 'Второе', coords: [37, 127], time: '', desc: '', price: null, image: '' });
    const onMovePlace = vi.fn();
    const { container } = render(<Timeline trip={trip} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} onMovePlace={onMovePlace} />);
    // Подменяем геометрию: секция 0..200, карточка A mid=75, карточка B mid=135.
    (container.querySelector('[data-day-sec="1"]') as HTMLElement).getBoundingClientRect = () => rect(0, 200);
    const cards = container.querySelectorAll<HTMLElement>('[data-card]');
    cards[0].getBoundingClientRect = () => rect(50, 50);
    cards[1].getBoundingClientRect = () => rect(110, 50);

    const grip = screen.getByRole('button', { name: /Переместить «Первое»/i });
    firePointer(grip, 'pointerdown', { pointerId: 1, button: 0 });
    firePointer(grip, 'pointermove', { pointerId: 1, clientY: 140 }); // ниже середины «Второго»
    firePointer(grip, 'pointerup', { pointerId: 1, clientY: 140 });
    expect(onMovePlace).toHaveBeenCalledWith(trip.places[0].id, 1, 1);
  });

  it('клик по ручке без движения ничего не переносит', () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const trip = addPlaceToTrip(base, 1, { name: 'Одно', coords: [37, 127], time: '', desc: '', price: null, image: '' });
    const onMovePlace = vi.fn();
    render(<Timeline trip={trip} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} onMovePlace={onMovePlace} />);
    const grip = screen.getByRole('button', { name: /Переместить «Одно»/i });
    firePointer(grip, 'pointerdown', { pointerId: 1, button: 0 });
    firePointer(grip, 'pointerup', { pointerId: 1 });
    expect(onMovePlace).not.toHaveBeenCalled();
  });

  it('без onMovePlace ручек переноса нет', () => {
    render(<Timeline trip={tripWithPlace()} day={1} onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Переместить/i })).not.toBeInTheDocument();
  });

  it('создание своей категории при редактировании дня', async () => {
    const base = createTripDoc({ title: 'X', country: 'Y', city: 'Z', startDate: '2026-06-07', endDate: '2026-06-09' });
    const onSaveDay = vi.fn();
    render(<Timeline trip={base} day={2} categories={base.categories}
      onAddPlace={vi.fn()} onEditPlace={vi.fn()} onDeletePlace={vi.fn()} onSelectPlace={vi.fn()} onSaveDay={onSaveDay} />);
    await userEvent.click(screen.getByRole('button', { name: /Изменить день/i }));
    await userEvent.selectOptions(screen.getByLabelText('Категория дня'), '__new__');
    await userEvent.type(screen.getByLabelText('Название категории'), 'Гастротур');
    await userEvent.click(screen.getByRole('button', { name: /Сохранить/i }));
    expect(onSaveDay).toHaveBeenCalledWith(2, expect.objectContaining({ newCategory: expect.objectContaining({ label: 'Гастротур' }) }));
  });
});
