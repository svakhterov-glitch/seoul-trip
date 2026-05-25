import styles from './SiteHeader.module.css';

export function SiteHeader({ onLoginClick }: { onLoginClick: () => void }) {
  return (
    <header className={styles.bar}>
      <div className={styles.logo}>Trips<b>Plan</b></div>
      <nav className={styles.nav}>
        <a href="#how">Как это работает</a>
        <button type="button" className={styles.login} onClick={onLoginClick}>Войти</button>
      </nav>
    </header>
  );
}
