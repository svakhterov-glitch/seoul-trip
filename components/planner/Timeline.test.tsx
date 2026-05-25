import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '@/components/planner/Timeline';
import { createTripDoc, addPlaceToTrip } from '@/lib/entities';

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
});
