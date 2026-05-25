'use client';

import { useState } from 'react';
import { validateNewTrip, type NewTripErrors, type NewTripInput } from '@/lib/validation';
import styles from './NewTripForm.module.css';

interface Props {
  onCreate: (input: NewTripInput) => void;
  busy: boolean;
  serverError: string;
}

const EMPTY: NewTripInput = { title: '', country: '', city: '', startDate: '', endDate: '' };

export function NewTripForm({ onCreate, busy, serverError }: Props) {
  const [form, setForm] = useState<NewTripInput>(EMPTY);
  const [errors, setErrors] = useState<NewTripErrors>({});

  function set<K extends keyof NewTripInput>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validateNewTrip(form);
    setErrors(found);
    if (Object.keys(found).length === 0) onCreate(form);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.h1}>Новая поездка</h1>

      <label className={styles.label} htmlFor="title">Название</label>
      <input id="title" className={styles.input} value={form.title} disabled={busy}
        onChange={(e) => set('title', e.target.value)} />
      {errors.title && <div className={styles.err}>{errors.title}</div>}

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="country">Страна</label>
          <input id="country" className={styles.input} value={form.country} disabled={busy}
            onChange={(e) => set('country', e.target.value)} />
          {errors.country && <div className={styles.err}>{errors.country}</div>}
        </div>
        <div>
          <label className={styles.label} htmlFor="city">Город</label>
          <input id="city" className={styles.input} value={form.city} disabled={busy}
            onChange={(e) => set('city', e.target.value)} />
          {errors.city && <div className={styles.err}>{errors.city}</div>}
        </div>
      </div>

      <div className={styles.row}>
        <div>
          <label className={styles.label} htmlFor="startDate">Дата начала</label>
          <input id="startDate" type="date" className={styles.input} value={form.startDate} disabled={busy}
            onChange={(e) => set('startDate', e.target.value)} />
          {errors.startDate && <div className={styles.err}>{errors.startDate}</div>}
        </div>
        <div>
          <label className={styles.label} htmlFor="endDate">Дата конца</label>
          <input id="endDate" type="date" className={styles.input} value={form.endDate} disabled={busy}
            onChange={(e) => set('endDate', e.target.value)} />
          {errors.endDate && <div className={styles.err}>{errors.endDate}</div>}
        </div>
      </div>

      {serverError && <div className={styles.serverErr}>{serverError}</div>}

      <button type="submit" className={styles.cta} disabled={busy}>
        {busy ? 'Создаём…' : 'Создать поездку'}
      </button>
    </form>
  );
}
