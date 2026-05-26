'use client';

import { useState } from 'react';
import type { Day, Category } from '@/lib/entities';
import styles from './DayForm.module.css';

export interface DaySave {
  title: string;
  cat: string | null;
  newCategory?: { label: string; color: string };
}

interface Props {
  day: Day;
  categories: Category[];
  busy: boolean;
  onSave: (patch: DaySave) => void;
  onCancel: () => void;
}

const NEW = '__new__';

export function DayForm({ day, categories, busy, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(day.title);
  const [sel, setSel] = useState<string>(day.cat ?? '');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#2f6fd6');
  const [err, setErr] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sel === NEW) {
      const label = newLabel.trim();
      if (!label) { setErr('Введите название категории'); return; }
      onSave({ title: title.trim(), cat: null, newCategory: { label, color: newColor } });
    } else {
      onSave({ title: title.trim(), cat: sel || null });
    }
  }

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <label className={styles.label} htmlFor="df-title">Название дня</label>
      <input id="df-title" className={styles.input} value={title} disabled={busy}
        onChange={(e) => setTitle(e.target.value)} />

      <label className={styles.label} htmlFor="df-cat">Категория дня</label>
      <select id="df-cat" className={styles.input} value={sel} disabled={busy}
        onChange={(e) => { setSel(e.target.value); setErr(''); }}>
        <option value="">— без категории —</option>
        {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        <option value={NEW}>+ Новая категория</option>
      </select>

      {sel === NEW && (
        <div className={styles.newCat}>
          <input className={styles.input} aria-label="Название категории" placeholder="Например, Гастротур"
            value={newLabel} disabled={busy} onChange={(e) => { setNewLabel(e.target.value); setErr(''); }} />
          <input type="color" className={styles.color} aria-label="Цвет категории"
            value={newColor} disabled={busy} onChange={(e) => setNewColor(e.target.value)} />
        </div>
      )}
      {err && <div className={styles.err}>{err}</div>}

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>Отмена</button>
        <button type="submit" className={styles.save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
    </form>
  );
}
