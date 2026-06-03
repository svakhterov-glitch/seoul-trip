'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type TripDoc, type Hotel, placesForDay, lastDayNumber, getPlaceKind, type Coords } from '@/lib/entities';
import { addDays } from '@/lib/days';
import { dayColor } from '@/lib/dayColors';
import { kindColor } from '@/lib/kindColors';
import { type MediaItem, rubricMeta } from '@/lib/media';
import { suggestionColor, tagEmoji } from '@/lib/suggestionTags';
import styles from './TripMap.module.css';

/** Метка предложки на карте (слой «Предложка»). */
export interface SuggestionMarker {
  id: string;
  name: string;
  coords: Coords;
  kind: 'place' | 'shopping';
  url?: string;      // ссылка-источник (показывается в попапе метки)
  desc?: string;     // краткое описание (как у «Медиа»)
  tag?: string;      // категория предложки — задаёт СМАЙЛИК метки (и красный для «Важно»)
  fromUser?: string; // автор — задаёт ЦВЕТ метки (розовый Полина / синий Сережа)
  image?: string;    // фото места (показывается в попапе)
}

interface Props {
  trip: TripDoc;
  day: number;             // 0 = весь маршрут, -1 = «Медиа», -2 = «Предложка»; >=1 — день
  picking: boolean;        // режим выбора точки
  draftCoords: Coords | null;
  onMapClick: (coords: Coords) => void;
  onPlaceClick: (id: string) => void;
  media?: MediaItem[];          // слой «Медиа» — рисуется, если передан
  suggestions?: SuggestionMarker[]; // слой «Предложка» — рисуется, если передан
  highlightId?: string | null; // подсвеченная медиа-метка (синхрон с витриной)
  onMediaClick?: (id: string) => void;
  hotels?: Hotel[];        // отели с координатами — метки 🏨 (рисуются при day >= 0)
}

function pinIcon(label: string | number, color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="${styles.pin}" style="background:${color}"><span>${label}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30],
  });
}

function hotelIcon() {
  return L.divIcon({
    className: '',
    html: `<div class="${styles.hotelPin}"><span>🏨</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
  });
}

/** Отель виден в дне, если проживание покрывает его дату (или даты не заданы). */
function hotelOnDay(h: Hotel, iso: string): boolean {
  if (!h.checkIn && !h.checkOut) return true;
  if (h.checkIn && iso < h.checkIn) return false;
  if (h.checkOut && iso > h.checkOut) return false;
  return true;
}

function mediaIcon(item: MediaItem, on: boolean) {
  const color = rubricMeta(item.rubric).color;
  const emoji = getPlaceKind(item.segment)?.emoji ?? '📍';
  const cls = `${styles.mediaPin}${on ? ' ' + styles.mediaPinOn : ''}`;
  const size = on ? 40 : 30;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="background:${color}"><span>${emoji}</span></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2 - 2],
  });
}

function suggestionIcon(emoji: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div class="${styles.sugPin}" style="background:${color}"><span>${emoji}</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28],
  });
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function TripMap({ trip, day, picking, draftCoords, onMapClick, onPlaceClick, media, suggestions, highlightId, onMediaClick, hotels }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  // ключ последней авто-подгонки масштаба: подгоняем ТОЛЬКО при смене вида (дня),
  // а не при вкл/выкл слоёв или правке мест — иначе карта «прыгает».
  const fitKeyRef = useRef<number | null>(null);
  const clickCb = useRef(onMapClick);
  clickCb.current = onMapClick;
  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const placeCb = useRef(onPlaceClick);
  placeCb.current = onPlaceClick;
  const mediaCb = useRef(onMediaClick);
  mediaCb.current = onMediaClick;
  // подсветка медиа-метки: ref (для первичной отрисовки) + карта маркеров по id
  const highlightRef = useRef<string | null>(highlightId ?? null);
  highlightRef.current = highlightId ?? null;
  const mediaMarkers = useRef<Map<string, L.Marker>>(new Map());
  const mediaItemsRef = useRef<MediaItem[]>([]);

  // инициализация карты один раз
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([37.56, 126.99], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    draftLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (pickingRef.current) clickCb.current([e.latlng.lat, e.latlng.lng]);
    });
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // курсор в режиме выбора
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = picking ? 'crosshair' : '';
  }, [picking]);

  // черновая точка
  useEffect(() => {
    const layer = draftLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (draftCoords) {
      L.marker(draftCoords, {
        icon: L.divIcon({ className: '', html: `<div class="${styles.pin} ${styles.draft}"><span>+</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] }),
      }).addTo(layer);
    }
  }, [draftCoords]);

  // маркеры и маршрут
  useEffect(() => {
    const map = mapRef.current;
    const mLayer = markerLayer.current;
    const rLayer = routeLayer.current;
    if (!map || !mLayer || !rLayer) return;
    mLayer.clearLayers();
    rLayer.clearLayers();
    mediaMarkers.current.clear();
    mediaItemsRef.current = media ?? [];

    const bounds: Coords[] = [];

    // СЛОЙ МАРШРУТА (только day >= 0). Обзор: метка = номер дня, цвет = день.
    // Отдельный день: метка = порядок, цвет = ТИП места; маршрут — в цвете дня.
    const drawDay = (dn: number, singleDay: boolean) => {
      const order = placesForDay(trip, dn).filter((p) => p.coords);
      if (!order.length) return;
      const color = dayColor(dn);
      order.forEach((p, idx) => {
        const label = singleDay ? idx + 1 : dn;
        const m = L.marker(p.coords as Coords, { icon: pinIcon(label, singleDay ? kindColor(p.kind) : color) });
        const kindLabel = getPlaceKind(p.kind)?.label;
        m.bindPopup(`<b>${p.name}</b>${p.time ? ' · ' + p.time : ''}${kindLabel ? ' · ' + kindLabel : ''}${p.desc ? '<br>' + p.desc : ''}`);
        m.on('click', () => placeCb.current(p.id));
        m.addTo(mLayer);
        bounds.push(p.coords as Coords);
      });
      const pts = order.map((p) => p.coords as Coords);
      if (pts.length > 1) {
        L.polyline(pts, { color, weight: day === 0 ? 3.5 : 4, opacity: 0.75 }).addTo(rLayer);
      }
    };

    if (day >= 0) {
      if (day === 0) {
        const last = lastDayNumber(trip);
        for (let dn = 1; dn <= last; dn++) drawDay(dn, false);
      } else {
        drawDay(day, true);
      }
      // Отели: в обзоре — все; в отдельном дне — те, чьё проживание покрывает дату.
      const iso = day >= 1 ? addDays(trip.startDate, day - 1) : '';
      (hotels ?? []).forEach((h) => {
        if (!h.coords) return;
        if (day >= 1 && !hotelOnDay(h, iso)) return;
        const m = L.marker(h.coords, { icon: hotelIcon() });
        m.bindPopup(`<b>🏨 ${esc(h.name)}</b>`);
        m.addTo(mLayer);
        bounds.push(h.coords);
      });
    }

    // СЛОЙ «МЕДИА»: круглые метки (цвет = рубрика, эмодзи = сегмент). Рисуем, если переданы.
    (media ?? []).forEach((it) => {
      if (!it.coords) return;
      const on = highlightRef.current === it.id;
      const m = L.marker(it.coords, { icon: mediaIcon(it, on), zIndexOffset: on ? 1000 : 0 });
      m.bindPopup(`<b>${esc(it.name)}</b>${it.blurb ? '<br>' + esc(it.blurb) : ''}`);
      m.on('click', () => mediaCb.current?.(it.id));
      m.addTo(mLayer);
      mediaMarkers.current.set(it.id, m);
      bounds.push(it.coords);
    });

    // СЛОЙ «ПРЕДЛОЖКА»: метки входящих из Telegram. Рисуем, если переданы.
    (suggestions ?? []).forEach((s) => {
      if (!s.coords) return;
      const emoji = tagEmoji(s.tag || '') || (s.kind === 'shopping' ? '🛍' : '📍');
      const m = L.marker(s.coords, { icon: suggestionIcon(emoji, suggestionColor(s.tag || '', s.fromUser || '')) });
      const img = s.image ? `<img src="${esc(s.image)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>` : '';
      const desc = s.desc ? `<br>${esc(s.desc)}` : '';
      const link = s.url ? `<br><a href="${esc(s.url)}" target="_blank" rel="noreferrer">ссылка&nbsp;↗</a>` : '';
      m.bindPopup(`${img}<b>${esc(s.name)}</b>${desc}${link}`);
      m.addTo(mLayer);
      bounds.push(s.coords);
    });

    // Подгоняем масштаб только при СМЕНЕ ВИДА (день/режим), а не при переключении
    // слоёв или правке мест — чтобы карта не «прыгала».
    if (bounds.length && fitKeyRef.current !== day) {
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(L.latLngBounds(bounds).pad(0.18), { animate });
      fitKeyRef.current = day;
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [trip, day, media, suggestions, hotels]);

  // Подсветка медиа-метки при наведении/клике в витрине (без перерисовки слоя).
  useEffect(() => {
    if (!mediaItemsRef.current.length) return;
    mediaItemsRef.current.forEach((it) => {
      const m = mediaMarkers.current.get(it.id);
      if (!m) return;
      const on = highlightId === it.id;
      m.setIcon(mediaIcon(it, on));
      m.setZIndexOffset(on ? 1000 : 0);
    });
  }, [highlightId, day]);

  return <div ref={elRef} className={styles.map} aria-label="Карта поездки" />;
}
