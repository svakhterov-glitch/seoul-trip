import styles from './Steps.module.css';

const STEPS = [
  { ic: '✍️', title: 'Соберите сами', text: 'Добавляйте места и время вручную, меняйте порядок перетаскиванием.' },
  { ic: '🔗', title: 'Киньте ссылку', text: 'Ссылка из блога или с карты — место само попадёт в поездку с фото и описанием.' },
  { ic: '🤖', title: 'Доверьте ИИ', text: 'ИИ разложит места по дням с учётом географии и времени.' },
];

export function Steps() {
  return (
    <section id="how" className={styles.steps}>
      {STEPS.map((s) => (
        <div key={s.title} className={styles.step}>
          <div className={styles.ic}>{s.ic}</div>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </div>
      ))}
    </section>
  );
}
