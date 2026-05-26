import { type Category, type PlacePrice, getPlaceKind } from '@/lib/entities';
import styles from './badges.module.css';

export function CatBadge({ category }: { category: Category | null }) {
  if (!category) return null;
  return (
    <span className={styles.cat} style={{ background: category.color }}>{category.label}</span>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const k = getPlaceKind(kind);
  if (!k) return null;
  return <span className={styles.kind}>{k.emoji} {k.label}</span>;
}

export function PersonBadge({ name }: { name: string }) {
  if (!name) return null;
  return <span className={styles.author}>👤 {name}</span>;
}

const PRICE_LABEL: Record<string, string> = { free: 'Бесплатно', '1': '₽', '2': '₽₽', '3': '₽₽₽' };

export function PriceBadge({ price }: { price: PlacePrice }) {
  if (price === null || price === undefined) return null;
  const label = PRICE_LABEL[String(price)];
  if (!label) return null;
  return <span className={styles.price}>{label}</span>;
}
