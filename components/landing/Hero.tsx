import styles from './Hero.module.css';

export function Hero({ children }: { children: React.ReactNode }) {
  return (
    <section className={styles.hero}>
      <div className={styles.split}>
        <div>
          <h1 className={styles.title}>Вся поездка — в одном маршруте, а не в десяти вкладках</h1>
          <p className={styles.lead}>
            Укажите перелёт и даты — и получите готовый календарь по дням. Кидайте ссылки
            из блогов и карт, ищите места по названию, а сборку маршрута доверьте ИИ.
            Всё — на одной карте.
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>Бесплатно</span>
            <span className={styles.pill}>С любого устройства</span>
            <span className={styles.pill}>Маршрут на карте</span>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}
