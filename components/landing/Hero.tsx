import styles from './Hero.module.css';

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.hero}>
      <div className={styles.split}>
        <div>
          <h1 className={styles.title}>Маршрут путешествия — по дням и по часам</h1>
          <p className={styles.lead}>
            Введите перелёт и даты — TripsPlan построит календарь поездки. Наполняйте
            дни местами: вручную, по ссылкам из блогов и карт или с помощью ИИ. Всё на одной карте.
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>Бесплатно</span>
            <span className={styles.pill}>Синхронизация между устройствами</span>
            <span className={styles.pill}>Карта и расписание</span>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
