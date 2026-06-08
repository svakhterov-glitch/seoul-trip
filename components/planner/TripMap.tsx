'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type TripDoc, type Hotel, placesForDay, lastDayNumber, getPlaceKind, type Coords } from '@/lib/entities';
import { addDays } from '@/lib/days';
import { buildLegs, legKey, fetchWalkRoutes } from '@/lib/walkRoute';
import { dayColor } from '@/lib/dayColors';
import { kindColor } from '@/lib/kindColors';
import { type MediaItem, rubricMeta } from '@/lib/media';
import { type MichelinItem, distinctionMeta, starCount } from '@/lib/michelin';
import { suggestionColor, tagEmoji } from '@/lib/suggestionTags';
import { catchtableUrl, placeMapLinks } from '@/lib/mapLinks';
import styles from './TripMap.module.css';

// Кеш пеших линий по улицам: ключ перегона → геометрия (или null = не построилось).
// Модульный (живёт между перерисовками и сменами дня) — один перегон не запрашиваем
// дважды. Перегоны-«поездки» (длинные) сюда не попадают — их рисуем пунктиром сразу.
const walkCache = new Map<string, Coords[] | null>();

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
  michelin?: MichelinItem[];    // слой «Мишлен» — рисуется, если передан
  suggestions?: SuggestionMarker[]; // слой «Предложка» — рисуется, если передан
  highlightId?: string | null; // подсвеченная метка медиа/мишлен (синхрон с витриной)
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

function michelinIcon(item: MichelinItem, on: boolean) {
  const color = distinctionMeta(item.distinction).color;
  const n = starCount(item.distinction);
  const label = n > 0 ? '★'.repeat(n) : '🍴';
  const cls = `${styles.mediaPin}${on ? ' ' + styles.mediaPinOn : ''}`;
  const size = on ? 40 : 30;
  return L.divIcon({
    className: '',
    html: `<div class="${cls}" style="background:${color}"><span style="font-size:${n === 3 ? 9 : n ? 11 : 15}px">${label}</span></div>`,
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

export function TripMap({ trip, day, picking, draftCoords, onMapClick, onPlaceClick, media, michelin, suggestions, highlightId, onMediaClick, hotels }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  // ключ последней авто-подгонки масштаба: подгоняем ТОЛЬКО при смене вида (дня),
  // а не при вкл/выкл слоёв или правке мест — иначе карта «прыгает».
  const fitKeyRef = useRef<number | null>(null);
  // Бамп после прихода пеших линий с роутера — перерисовать слой уже с геометрией.
  const [routeTick, setRouteTick] = useState(0);
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
  const michelinMarkers = useRef<Map<string, L.Marker>>(new Map());
  const michelinItemsRef = useRef<MichelinItem[]>([]);

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
    // Перегоны, для которых нужен пеший путь, но его ещё нет в кеше — запросим
    // после отрисовки (одним вызовом), результат закешируем и перерисуем слой.
    const toFetch: [Coords, Coords][] = [];

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
      if (pts.length < 2) return;

      if (!singleDay) {
        // Обзор всего маршрута — прямые отрезки (без пешей детализации).
        L.polyline(pts, { color, weight: 3.5, opacity: 0.75 }).addTo(rLayer);
        return;
      }

      // Отдельный день: пеший путь по улицам; длинные перегоны (метро/такси) —
      // пунктиром по прямой. Пока линия не построена — временно прямая (без скачков).
      for (const leg of buildLegs(pts)) {
        if (!leg.walk) {
          L.polyline([leg.from, leg.to], { color, weight: 3, opacity: 0.6, dashArray: '2 9' }).addTo(rLayer);
          continue;
        }
        const key = legKey(leg.from, leg.to);
        if (walkCache.has(key)) {
          const geom = walkCache.get(key);
          const line = geom && geom.length > 1 ? geom : [leg.from, leg.to];
          L.polyline(line, { color, weight: 4, opacity: 0.8 }).addTo(rLayer);
        } else {
          L.polyline([leg.from, leg.to], { color, weight: 4, opacity: 0.8 }).addTo(rLayer);
          toFetch.push([leg.from, leg.to]);
        }
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

    // Догружаем пешие линии для новых перегонов и перерисовываем слой, когда придут.
    if (toFetch.length) {
      const uniq = Array.from(new Map(toFetch.map((l) => [legKey(l[0], l[1]), l])).values());
      fetchWalkRoutes(uniq).then((geoms) => {
        let changed = false;
        uniq.forEach((l, i) => {
          const key = legKey(l[0], l[1]);
          if (!walkCache.has(key)) {
            walkCache.set(key, geoms[i]); // null тоже кешируем — не дёргать роутер повторно
            changed = true;
          }
        });
        if (changed) setRouteTick((t) => t + 1);
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

    // СЛОЙ «МИШЛЕН»: метки ресторанов гида (цвет = отличие, звёзды/🍴). Рисуем, если переданы.
    michelinMarkers.current.clear();
    michelinItemsRef.current = michelin ?? [];
    (michelin ?? []).forEach((it) => {
      if (!it.coords) return;
      const on = highlightRef.current === it.id;
      const m = L.marker(it.coords, { icon: michelinIcon(it, on), zIndexOffset: on ? 1000 : 0 });
      const meta = distinctionMeta(it.distinction);
      const sub = [meta.label, it.cuisine, it.price].filter(Boolean).join(' · ');
      const naver = placeMapLinks(it.name, it.coords, it.geo).naver;
      m.bindPopup(`<b>${esc(it.name)}</b><br>${esc(sub)}<br><a href="${esc(naver)}" target="_blank" rel="noreferrer">Naver&nbsp;Map&nbsp;↗</a>`);
      m.on('click', () => mediaCb.current?.(it.id));
      m.addTo(mLayer);
      michelinMarkers.current.set(it.id, m);
      bounds.push(it.coords);
    });

    // СЛОЙ «ПРЕДЛОЖКА»: метки входящих из Telegram. Рисуем, если переданы.
    (suggestions ?? []).forEach((s) => {
      if (!s.coords) return;
      const emoji = tagEmoji(s.tag || '') || (s.kind === 'shopping' ? '🛍' : '📍');
      const m = L.marker(s.coords, { icon: suggestionIcon(emoji, suggestionColor(s.tag || '', s.fromUser || '')) });
      const img = s.image ? `<img src="${esc(s.image)}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px;margin-bottom:6px"/>` : '';
      const desc = s.desc ? `<br>${esc(s.desc)}` : '';
      const g = s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer">Google&nbsp;↗</a>` : '';
      const ct = `<a href="${esc(catchtableUrl(s.name))}" target="_blank" rel="noreferrer">Catchtable&nbsp;↗</a>`;
      const links = `<br>${[g, ct].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;')}`;
      m.bindPopup(`${img}<b>${esc(s.name)}</b>${desc}${links}`);
      m.addTo(mLayer);
      bounds.push(s.coords);
    });

    // Подгоняем масштаб только при СМЕНЕ ВИДА (день/режим), а не при переключении
    // слоёв или правке мест — чтобы карта не «прыгала».
    if (bounds.length && fitKeyRef.current !== day) {
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // maxZoom держит масштаб в одном диапазоне между днями: день из 1–2 близких
      // точек иначе зумится почти «в улицу» и карта визуально «скачет по размеру».
      map.fitBounds(L.latLngBounds(bounds).pad(0.18), { animate, maxZoom: 14 });
      fitKeyRef.current = day;
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [trip, day, media, michelin, suggestions, hotels, routeTick]);

  // Подсветка метки медиа/мишлен при наведении/клике в витрине (без перерисовки слоя).
  useEffect(() => {
    mediaItemsRef.current.forEach((it) => {
      const m = mediaMarkers.current.get(it.id);
      if (!m) return;
      const on = highlightId === it.id;
      m.setIcon(mediaIcon(it, on));
      m.setZIndexOffset(on ? 1000 : 0);
    });
    michelinItemsRef.current.forEach((it) => {
      const m = michelinMarkers.current.get(it.id);
      if (!m) return;
      const on = highlightId === it.id;
      m.setIcon(michelinIcon(it, on));
      m.setZIndexOffset(on ? 1000 : 0);
    });
  }, [highlightId, day]);

  return <div ref={elRef} className={styles.map} aria-label="Карта поездки" />;
}
