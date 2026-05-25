import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TripsPlan — планировщик путешествий',
  description:
    'Введите перелёт и даты — TripsPlan построит календарь поездки. Наполняйте дни местами вручную, по ссылкам или с помощью ИИ.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
