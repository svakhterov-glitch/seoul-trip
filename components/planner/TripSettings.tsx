'use client';

import { useState } from 'react';
import { type Flight, type Hotel, createHotel } from '@/lib/entities';
import styles from './TripSettings.module.css';

interface Props {
  startDate: string;
  endDate: string;
  flights: Flight[];
  hotels: Hotel[];
  busy?: boolean;
  onSave: (flights: Flight[], hotels: Hotel[]) => void;
  onClearItinerary: () => void;
  onClose: () => void;
}

/** Пустой перелёт заданного направления с предзаполненной датой. */
function emptyFlight(direction: 'out' | 'back', date: string): Flight {
  return { direction, airport: '', date, time: '', flightNo: '' };
}

/** Есть ли в перелёте хоть какие-то данные (иначе не сохраняем). */
function flightFilled(f: Flight): boolean {
  return !!(f.airport.trim() || f.time.trim() || f.flightNo.trim());
}

export function TripSettings({ startDate, endDate, flights, hotels, busy = false, onSave, onClearItinerary, onClose }: Props) {
  const [out, setOut] = useState<Flight>(flights.find((f) => f.direction === 'out') ?? emptyFlight('out', startDate));
  const [back, setBack] = useState<Flight>(flights.find((f) => f.direction === 'back') ?? emptyFlight('back', endDate));
  const [list, setList] = useState<Hotel[]>(hotels.length ? hotels : []);

  function patchHotel(id: string, patch: Partial<Hotel>) {
    setList((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }
  function addHotel() {
    setList((hs) => [...hs, createHotel({ checkIn: hs.length ? '' : startDate, checkOut: hs.length ? '' : endDate })]);
  }
  function removeHotel(id: string) {
    setList((hs) => hs.filter((h) => h.id !== id));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const f: Flight[] = [];
    if (flightFilled(out)) f.push({ ...out, airport: out.airport.trim(), flightNo: out.flightNo.trim() });
    if (flightFilled(back)) f.push({ ...back, airport: back.airport.trim(), flightNo: back.flightNo.trim() });
    const h = list.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim() }));
    onSave(f, h);
    onClose();
  }

  function clearRoute() {
    if (confirm('Очистить весь маршрут? Все добавленные места будут удалены. Перелёт и отели останутся.')) {
      onClearItinerary();
      onClose();
    }
  }

  function flightFields(label: string, f: Flight, set: (f: Flight) => void) {
    return (
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{label}</legend>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.lbl}>Аэропорт</span>
            <input className={styles.input} value={f.airport} disabled={busy} placeholder="ICN Инчхон"
              onChange={(e) => set({ ...f, airport: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.lbl}>Рейс</span>
            <input className={styles.input} value={f.flightNo} disabled={busy} placeholder="SU 250"
              onChange={(e) => set({ ...f, flightNo: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.lbl}>Дата</span>
            <input type="date" className={styles.input} value={f.date} disabled={busy}
              onChange={(e) => set({ ...f, date: e.target.value })} />
          </label>
          <label className={styles.field}>
            <span className={styles.lbl}>Время</span>
            <input type="time" className={styles.input} value={f.time} disabled={busy}
              onChange={(e) => set({ ...f, time: e.target.value })} />
          </label>
        </div>
      </fieldset>
    );
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Настройки поездки">
      <div className={styles.modal}>
        <div className={styles.top}>
          <h2 className={styles.h}>Настройки поездки</h2>
          <button type="button" className={styles.x} onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        <form className={styles.body} onSubmit={submit} noValidate>
          <h3 className={styles.section}>✈️ Перелёт</h3>
          {flightFields('Прилёт (туда)', out, setOut)}
          {flightFields('Вылет (обратно)', back, setBack)}

          <h3 className={styles.section}>🏨 Проживание</h3>
          {list.length === 0 && <p className={styles.empty}>Отели не добавлены.</p>}
          {list.map((h, i) => (
            <fieldset key={h.id} className={styles.fieldset}>
              <legend className={styles.legend}>Отель {i + 1}
                <button type="button" className={styles.removeHotel} onClick={() => removeHotel(h.id)} disabled={busy}>удалить</button>
              </legend>
              <label className={styles.field}>
                <span className={styles.lbl}>Название</span>
                <input className={styles.input} value={h.name} disabled={busy} placeholder="Lotte Hotel Seoul"
                  onChange={(e) => patchHotel(h.id, { name: e.target.value })} />
              </label>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span className={styles.lbl}>Заезд</span>
                  <input type="date" className={styles.input} value={h.checkIn} disabled={busy}
                    onChange={(e) => patchHotel(h.id, { checkIn: e.target.value })} />
                </label>
                <label className={styles.field}>
                  <span className={styles.lbl}>Выезд</span>
                  <input type="date" className={styles.input} value={h.checkOut} disabled={busy}
                    onChange={(e) => patchHotel(h.id, { checkOut: e.target.value })} />
                </label>
              </div>
            </fieldset>
          ))}
          <button type="button" className={styles.addHotel} onClick={addHotel} disabled={busy}>＋ Добавить отель</button>

          <h3 className={styles.section}>⚠️ Опасная зона</h3>
          <button type="button" className={styles.clear} onClick={clearRoute} disabled={busy}>
            Очистить маршрут (удалить все места)
          </button>

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose} disabled={busy}>Отмена</button>
            <button type="submit" className={styles.save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
