import styles from './Steps.module.css';

const STEPS = [
  { ic: '✍️', title: 'Соберите сам', text: 'Добавляйте места и время руками, меняйте порядок перетаскиванием.' },
  { ic: '🔗', title: 'Киньте ссылку', text: 'Вставьте ссылку из блога или карт — место добавится в поездку.' },
  { ic: '🤖', title: 'Соберите через ИИ', text: 'ИИ раскидает места по дням с учётом географии и времени.' },
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
