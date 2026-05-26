'use client';

import { buildSkyline, type SkylineBuilding } from '@/lib/skyline';
import styles from './CitySkyline.module.css';

const W = 48; // колонок
const H = 24; // строк

const FRONT = '#39295e'; // тёмно-фиолетовый силуэт переднего ряда
const BACK = '#7a68a8'; // светлее — дальний ряд (глубина)
const WINDOW = '#ffd98a'; // тёплый свет окон

function Sun() {
  // пиксельное солнце-«ромб» в правом верхнем углу
  return (
    <g opacity={0.95}>
      <rect x={35} y={2} width={9} height={9} fill="#fff1c1" opacity={0.35} />
      <rect x={37} y={3} width={5} height={5} fill="#fff4cf" />
      <rect x={36} y={4} width={7} height={3} fill="#fff4cf" />
      <rect x={38} y={2} width={3} height={7} fill="#fff4cf" />
    </g>
  );
}

function Building({ b }: { b: SkylineBuilding }) {
  const h = b.h * H;
  const y = H - h;
  const parts: React.ReactNode[] = [
    <rect key="body" x={b.x} y={y} width={b.w} height={h} fill={FRONT} />,
  ];
  if (b.roof === 'step' && b.w >= 3) {
    parts.push(<rect key="roof" x={b.x + 1} y={y - 1} width={b.w - 2} height={1} fill={FRONT} />);
  } else if (b.roof === 'antenna') {
    parts.push(<rect key="ant" x={b.x + Math.floor(b.w / 2)} y={Math.max(0, y - 2)} width={1} height={2} fill={FRONT} />);
  }
  // окна — детерминированный пиксельный узор
  for (let cx = b.x + 1; cx < b.x + b.w; cx += 2) {
    for (let cy = Math.ceil(y) + 1; cy < H - 1; cy += 2) {
      if ((cx + cy) % 3 === 0) {
        parts.push(<rect key={`w${cx}-${cy}`} x={cx} y={cy} width={0.8} height={0.8} fill={WINDOW} opacity={0.85} />);
      }
    }
  }
  return <g>{parts}</g>;
}

/** Процедурный пиксель-скайлайн города в весенних тонах. Фон обложки. */
export function CitySkyline({ city, className }: { city: string; className?: string }) {
  const front = buildSkyline(city, W);
  const back = buildSkyline(`${city}~back`, W);
  return (
    <svg
      className={`${styles.svg} ${className ?? ''}`}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyline-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe3c2" />
          <stop offset="45%" stopColor="#ff9ec4" />
          <stop offset="100%" stopColor="#c7a3e6" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#skyline-sky)" />
      <Sun />
      {back.map((b, i) => {
        const h = Math.min(b.h, 0.6) * H;
        return <rect key={`b${i}`} x={b.x} y={H - h} width={b.w} height={h} fill={BACK} opacity={0.65} />;
      })}
      {front.map((b, i) => (
        <Building key={`f${i}`} b={b} />
      ))}
    </svg>
  );
}
