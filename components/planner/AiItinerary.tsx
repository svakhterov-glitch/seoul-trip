'use client';

import { useState } from 'react';
import { PLACE_KINDS } from '@/lib/entities';
import { type ItineraryPace } from '@/lib/generateItinerary';
import styles from './AiItinerary.module.css';

interface Props {
  busy?: boolean;        // идёт сохранение
  generating?: boolean;  // идёт сборка на сервере
  onGenerate: (pace: ItineraryPace, interests: string[], restFirstDay: boolean) => void;
}

const PACES: { key: ItineraryPace; label: string; hint: string }[] = [
  { key: 'relaxed', label: 'Расслабленный', hint: '2–3 места в день' },
  { key: 'moderate', label: 'Средний', hint: '3–4 места + еда' },
  { key: 'packed', label: 'Насыщенный', hint: '5–6 мест в день' },
];

// Интересы — подмножество PLACE_KINDS, по которым удобно фильтровать подбор.
const INTEREST_KEYS = ['food', 'museum', 'nature', 'sight', 'shop', 'fun', 'bar'];

export function AiItinerary({ busy = false, generating = false, onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [pace, setPace] = useState<ItineraryPace>('moderate');
  const [interests, setInterests] = useState<string[]>([]);
  const [restFirstDay, setRestFirstDay] = useState(true);

  function toggle(key: string) {
    setInterests((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  }

  const disabled = busy || generating;

  return (
    <section className={styles.wrap} aria-label="Собрать маршрут с ИИ">
      <button type="button" className={styles.head} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={styles.title}>Собрать маршрут</span>
        <span className={styles.sub}>
          {generating ? 'собираю маршрут…' : 'по опыту медиа и путешественников, с проверкой на сезон'}
        </span>
        <span className={styles.chev} aria-hidden>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className={styles.body}>
          <div className={styles.group}>
            <div className={styles.groupLabel}>Темп дня</div>
            <div className={styles.paces} role="radiogroup" aria-label="Темп дня">
              {PACES.map((p) => (
                <button key={p.key} type="button" role="radio" aria-checked={pace === p.key}
                  className={pace === p.key ? styles.paceOn : styles.pace}
                  onClick={() => setPace(p.key)} disabled={disabled}>
                  <span className={styles.paceName}>{p.label}</span>
                  <span className={styles.paceHint}>{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.group}>
            <div className={styles.groupLabel}>Интересы <span className={styles.opt}>(необязательно)</span></div>
            <div className={styles.chips}>
              {INTEREST_KEYS.map((key) => {
                const k = PLACE_KINDS.find((x) => x.key === key);
                if (!k) return null;
                const on = interests.includes(key);
                return (
                  <button key={key} type="button" aria-pressed={on}
                    className={on ? styles.chipOn : styles.chip}
                    onClick={() => toggle(key)} disabled={disabled}>
                    {k.emoji} {k.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className={styles.rest}>
            <input type="checkbox" checked={restFirstDay} disabled={disabled}
              onChange={(e) => setRestFirstDay(e.target.checked)} />
            <span>Первый день — спокойный (отдых после прилёта, без насыщенного маршрута)</span>
          </label>

          <button type="button" className={styles.go}
            onClick={() => onGenerate(pace, interests, restFirstDay)} disabled={disabled}>
            {generating ? 'Собираю маршрут…' : 'Собрать маршрут'}
          </button>
          <p className={styles.note}>
            ИИ ищет места в редакционных медиа и у тревел-блогеров, проверяет их актуальность
            и сезон под твои даты, группирует по районам и раскладывает по дням. Это занимает
            до пары минут. Уже разложенные тобой места останутся на месте.
          </p>
        </div>
      )}
    </section>
  );
}
