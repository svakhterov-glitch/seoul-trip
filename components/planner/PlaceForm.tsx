'use client';

import { useState } from 'react';
import type { PlaceInput, PlacePrice, Coords } from '@/lib/entities';
import { validatePlace, type PlaceErrors } from '@/lib/placeValidation';
import styles from './PlaceForm.module.css';

interface Props {
  coords: Coords | null;            // текущая точка (задаётся картой в родителе)
  onSubmit: (input: PlaceInput) => void;
  onCancel: () => void;
  onPickCoords: () => void;         // включить режим выбора точки на карте
  busy: boolean;
  initial?: PlaceInput;             // для редактирования
}

const PRICES: { value: PlacePrice; label: string }[] = [
  { value: null, label: '—' },
  { value: 'free', label: 'Бесплатно' },
  { value: 1, label: '₽' },
  { value: 2, label: '₽₽' },
  { value: 3, label: '₽₽₽' },
];

export function PlaceForm({ coords, onSubmit, onCancel, onPickCoords, busy, initial }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [desc, setDesc] = useState(initial?.desc ?? '');
  const [price, setPrice] = useState<PlacePrice>(initial?.price ?? null);
  const [image, setImage] = useState(initial?.image ?? '');
  const [errors, setErrors] = useState<PlaceErrors>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input: PlaceInput = { name, coords, time, desc, price, image };
    const found = validatePlace(input);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(input);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.h2}>{initial ? 'Изменить место' : 'Новое место'}</h2>

      <label className={styles.label} htmlFor="pf-name">Название</label>
      <input id="pf-name" className={styles.input} value={name} disabled={busy}
        onChange={(e) => setName(e.target.value)} />
      {errors.name && <div className={styles.err}>{errors.name}</div>}

      <div className={styles.coordRow}>
        <button type="button" className={styles.pick} onClick={onPickCoords} disabled={busy}>
          📍 Указать точку на карте
        </button>
        <span className={styles.coordVal}>{coords ? `${coords[0].toFixed(4)}, ${coords[1].toFixed(4)}` : 'точка не задана'}</span>
      </div>
      {errors.coords && <div className={styles.err}>{errors.coords}</div>}

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="pf-time">Время</label>
          <input id="pf-time" type="time" className={styles.input} value={time} disabled={busy}
            onChange={(e) => setTime(e.target.value)} />
        </div>
        <div>
          <label className={styles.label} htmlFor="pf-price">Цена</label>
          <select id="pf-price" className={styles.input} value={price === null ? '' : String(price)} disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              setPrice(v === '' ? null : v === 'free' ? 'free' : (Number(v) as PlacePrice));
            }}>
            {PRICES.map((p) => <option key={String(p.value)} value={p.value === null ? '' : String(p.value)}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <label className={styles.label} htmlFor="pf-desc">Описание</label>
      <textarea id="pf-desc" className={styles.textarea} value={desc} disabled={busy}
        onChange={(e) => setDesc(e.target.value)} rows={3} />

      <label className={styles.label} htmlFor="pf-image">Фото (ссылка)</label>
      <input id="pf-image" className={styles.input} value={image} disabled={busy} placeholder="https://…"
        onChange={(e) => setImage(e.target.value)} />

      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onCancel} disabled={busy}>Отмена</button>
        <button type="submit" className={styles.save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
      </div>
    </form>
  );
}
