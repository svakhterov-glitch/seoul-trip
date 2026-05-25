import type { Category, PlacePrice } from '@/lib/entities';
import styles from './badges.module.css';

export function CatBadge({ category }: { category: Category | null }) {
  if (!category) return null;
  return (
    <span className={styles.cat} style={{ background: category.color }}>{category.label}</span>
  );
}

const PRICE_LABEL: Record<string, string> = { free: 'Бесплатно', '1': '₽', '2': '₽₽', '3': '₽₽₽' };

export function PriceBadge({ price }: { price: PlacePrice }) {
  if (price === null || price === undefined) return null;
  const label = PRICE_LABEL[String(price)];
  if (!label) return null;
  return <span className={styles.price}>{label}</span>;
}
