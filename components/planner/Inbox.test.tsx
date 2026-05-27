import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox, type SearchState } from '@/components/planner/Inbox';
import type { InboxLink, Day } from '@/lib/entities';

const days: Day[] = [
  { number: 1, date: '7 июня', cat: 'start', title: 'Прилёт', sub: '' },
  { number: 2, date: '8 июня', cat: null, title: 'День 2', sub: '' },
];
const link = (over: Partial<InboxLink> = {}): InboxLink => ({
  id: 'l1', url: 'https://instagram.com/p/x', name: '', coords: null, desc: '', image: '', source: 'instagram', createdAt: '', ...over,
});

// Удобный рендер: все колбэки по умолчанию — заглушки, переопределяем нужные.
function renderInbox(props: Partial<Parameters<typeof Inbox>[0]> = {}) {
  return render(
    <Inbox
      links={[]} days={days}
      onAdd={vi.fn()} onRemoveLink={vi.fn()} onPlace={vi.fn()}
      onPickCandidate={vi.fn()} onAddRaw={vi.fn()} onDismissSearch={vi.fn()}
      {...props}
    />,
  );
}

describe('Inbox', () => {
  it('добавление: ввод текста + ＋ вызывает onAdd и чистит поле', async () => {
    const onAdd = vi.fn();
    renderInbox({ onAdd });
    const input = screen.getByLabelText('Название места или ссылка');
    await userEvent.type(input, 'Кёнбоккун');
    await userEvent.click(screen.getByRole('button', { name: 'Найти или добавить' }));
    expect(onAdd).toHaveBeenCalledWith('Кёнбоккун');
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('пустой ввод не добавляет (кнопка заблокирована)', () => {
    renderInbox();
    expect(screen.getByRole('button', { name: 'Найти или добавить' })).toBeDisabled();
  });

  it('пустой инбокс показывает подсказку', () => {
    renderInbox();
    expect(screen.getByText(/перенесёте в нужный день/i)).toBeInTheDocument();
  });

  it('«В день» открывает меню дней и выбор зовёт onPlace(linkId, dayNumber)', async () => {
    const onPlace = vi.fn();
    renderInbox({ links: [link({ name: 'Onion' })], onPlace });
    await userEvent.click(screen.getByRole('button', { name: /В день/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /День 2/i }));
    expect(onPlace).toHaveBeenCalledWith('l1', 2);
  });

  it('✕ вызывает onRemoveLink с id', async () => {
    const onRemoveLink = vi.fn();
    renderInbox({ links: [link({ name: 'Onion' })], onRemoveLink });
    await userEvent.click(screen.getByRole('button', { name: /Удалить Onion/i }));
    expect(onRemoveLink).toHaveBeenCalledWith('l1');
  });

  it('место без url рендерит имя текстом, а не ссылкой', () => {
    renderInbox({ links: [link({ name: 'Кафе', url: '', source: 'search' })] });
    expect(screen.queryByRole('link', { name: 'Кафе' })).toBeNull();
    expect(screen.getByText('Кафе')).toBeInTheDocument();
  });

  it('поиск: статус loading показывает «Ищу…»', () => {
    const search: SearchState = { query: 'дворец', status: 'loading', candidates: [] };
    renderInbox({ search });
    expect(screen.getByText(/Ищу «дворец»/i)).toBeInTheDocument();
  });

  it('поиск: список кандидатов, выбор зовёт onPickCandidate', async () => {
    const onPickCandidate = vi.fn();
    const search: SearchState = {
      query: 'дворец', status: 'done',
      candidates: [
        { name: 'Кёнбоккун', address: 'Сеул', desc: 'Дворец', coords: [37.5, 127.0] },
        { name: 'Чхандоккун', address: 'Сеул', desc: '', coords: [37.6, 127.1] },
      ],
    };
    renderInbox({ search, onPickCandidate });
    expect(screen.getByText('Кёнбоккун')).toBeInTheDocument();
    expect(screen.getByText('Чхандоккун')).toBeInTheDocument();
    // Кнопка строки добавления имеет aria-label, кандидатские — только текст «＋».
    const addBtns = screen.getAllByRole('button', { name: '＋' });
    expect(addBtns).toHaveLength(2);
    await userEvent.click(addBtns[0]);
    expect(onPickCandidate).toHaveBeenCalledWith(search.candidates[0]);
  });

  it('поиск без результатов: «Добавить без карты» зовёт onAddRaw', async () => {
    const onAddRaw = vi.fn();
    const search: SearchState = { query: 'хрхр', status: 'done', candidates: [] };
    renderInbox({ search, onAddRaw });
    expect(screen.getByText(/Ничего не нашлось/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Добавить без карты/i }));
    expect(onAddRaw).toHaveBeenCalled();
  });
});
