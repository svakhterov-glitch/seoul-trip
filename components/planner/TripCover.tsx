'use client';

import { useState } from 'react';
import { cleanCompanions } from '@/lib/tripMeta';
import { cityCover } from '@/lib/cityCovers';
import { CitySkyline } from './CitySkyline';
import styles from './TripCover.module.css';

export interface TripCoverSave {
  title: string;
  lead: string;
  companions: string[];
  coverImage: string;
}

interface Props {
  city: string;
  title: string;
  lead: string;
  companions: string[];
  coverImage: string;
  dateRange: string;
  busy: boolean;
  onSave: (patch: TripCoverSave) => void;
}

/** Картинка-обложка (своя или городская) с откатом на процедурный скайлайн. */
function CoverArt({ image, city }: { image: string; city: string }) {
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={styles.photo} src={image} alt="" onError={() => setFailed(true)} />;
  }
  return <CitySkyline city={city} />;
}

export function TripCover({ city, title, lead, companions, coverImage, dateRange, busy, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [fTitle, setFTitle] = useState(title);
  const [fLead, setFLead] = useState(lead);
  const [fComps, setFComps] = useState<string[]>(companions);
  const [fCover, setFCover] = useState(coverImage);
  const [newComp, setNewComp] = useState('');
  const [err, setErr] = useState('');

  const displayImage = coverImage || cityCover(city);

  function open() {
    setFTitle(title);
    setFLead(lead);
    setFComps(companions);
    setFCover(coverImage);
    setNewComp('');
    setErr('');
    setEditing(true);
  }

  function addComp() {
    const v = newComp.trim();
    if (!v) return;
    setFComps((c) => cleanCompanions([...c, v]));
    setNewComp('');
  }

  function removeComp(name: string) {
    setFComps((c) => c.filter((x) => x !== name));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = fTitle.trim();
    if (!t) { setErr('Введите название поездки'); return; }
    onSave({ title: t, lead: fLead.trim(), companions: cleanCompanions(fComps), coverImage: fCover.trim() });
    setEditing(false);
  }

  return (
    <section className={styles.cover}>
      <div className={styles.art} aria-hidden="true">
        <CoverArt image={displayImage} city={city} />
        <div className={styles.scrim} />
      </div>

      <div className={styles.content}>
        <div className={styles.cityName}>{city.toUpperCase()}</div>

        {!editing ? (
          <>
            <button type="button" className={styles.editBtn} onClick={open} aria-label="Редактировать обложку">
              ✏️ Редактировать
            </button>
            <h1 className={styles.title}>{title || 'Без названия'}</h1>
            <div className={styles.dates}>{dateRange}</div>
            {lead && <p className={styles.lead}>{lead}</p>}
            {companions.length > 0 && (
              <div className={styles.people}>
                <span className={styles.peopleLabel}>Едут:</span>
                {companions.map((name) => (
                  <span key={name} className={styles.chip}>{name}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <form className={styles.form} onSubmit={submit} noValidate>
            <label className={styles.label} htmlFor="cover-title">Название поездки</label>
            <input id="cover-title" className={styles.input} value={fTitle} disabled={busy}
              onChange={(e) => setFTitle(e.target.value)} />
            {err && <div className={styles.err}>{err}</div>}

            <label className={styles.label} htmlFor="cover-lead">Описание</label>
            <textarea id="cover-lead" className={styles.textarea} rows={2} value={fLead} disabled={busy}
              onChange={(e) => setFLead(e.target.value)} />

            <label className={styles.label} htmlFor="cover-image">Картинка-обложка (ссылка)</label>
            <input id="cover-image" className={styles.input} value={fCover} disabled={busy} placeholder="https://… или /covers/seoul.jpg"
              onChange={(e) => setFCover(e.target.value)} />

            <span className={styles.label}>Кто едет</span>
            <div className={styles.editChips}>
              {fComps.map((name) => (
                <span key={name} className={styles.chipEdit}>
                  {name}
                  <button type="button" className={styles.chipX} aria-label={`Удалить спутника ${name}`}
                    onClick={() => removeComp(name)}>×</button>
                </span>
              ))}
              {fComps.length === 0 && <span className={styles.chipsEmpty}>пока никого</span>}
            </div>
            <div className={styles.addRow}>
              <input className={styles.input} aria-label="Добавить спутника" placeholder="Имя" value={newComp} disabled={busy}
                onChange={(e) => setNewComp(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addComp(); } }} />
              <button type="button" className={styles.addBtn} onClick={addComp} disabled={busy}>Добавить</button>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancel} onClick={() => setEditing(false)} disabled={busy}>Отмена</button>
              <button type="submit" className={styles.save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
