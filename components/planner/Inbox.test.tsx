import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox } from '@/components/planner/Inbox';
import type { InboxLink, Day } from '@/lib/entities';

const days: Day[] = [
  { number: 1, date: '7 июня', cat: 'start', title: 'Прилёт', sub: '' },
  { number: 2, date: '8 июня', cat: null, title: 'День 2', sub: '' },
];
const link = (over: Partial<InboxLink> = {}): InboxLink => ({
  id: 'l1', url: 'https://instagram.com/p/x', name: '', coords: null, source: 'instagram', createdAt: '', ...over,
});

describe('Inbox', () => {
  it('добавление: ввод URL + ＋ вызывает onAddLink и чистит поле', async () => {
    const onAddLink = vi.fn();
    render(<Inbox links={[]} days={days} onAddLink={onAddLink} onRemoveLink={vi.fn()} onPlace={vi.fn()} />);
    const input = screen.getByLabelText('Ссылка на место');
    await userEvent.type(input, 'https://maps.google.com/?q=37.5,127');
    await userEvent.click(screen.getByRole('button', { name: 'Добавить ссылку' }));
    expect(onAddLink).toHaveBeenCalledWith('https://maps.google.com/?q=37.5,127');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('пустой ввод не добавляет (кнопка заблокирована)', () => {
    const onAddLink = vi.fn();
    render(<Inbox links={[]} days={days} onAddLink={onAddLink} onRemoveLink={vi.fn()} onPlace={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Добавить ссылку' })).toBeDisabled();
  });

  it('пустой инбокс показывает подсказку', () => {
    render(<Inbox links={[]} days={days} onAddLink={vi.fn()} onRemoveLink={vi.fn()} onPlace={vi.fn()} />);
    expect(screen.getByText(/не разобранными/i)).toBeInTheDocument();
  });

  it('«В день» открывает меню дней и выбор зовёт onPlace(linkId, dayNumber)', async () => {
    const onPlace = vi.fn();
    render(<Inbox links={[link({ name: 'Onion' })]} days={days} onAddLink={vi.fn()} onRemoveLink={vi.fn()} onPlace={onPlace} />);
    await userEvent.click(screen.getByRole('button', { name: /В день/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /День 2/i }));
    expect(onPlace).toHaveBeenCalledWith('l1', 2);
  });

  it('✕ вызывает onRemoveLink с id', async () => {
    const onRemoveLink = vi.fn();
    render(<Inbox links={[link({ name: 'Onion' })]} days={days} onAddLink={vi.fn()} onRemoveLink={onRemoveLink} onPlace={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /Удалить ссылку Onion/i }));
    expect(onRemoveLink).toHaveBeenCalledWith('l1');
  });
});
