'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type TripDoc, getCategory, placesForDay, allDayPlaces, lastDayNumber, type Coords } from '@/lib/entities';
import styles from './TripMap.module.css';

interface Props {
  trip: TripDoc;
  day: number;             // 0 = весь маршрут
  picking: boolean;        // режим выбора точки
  draftCoords: Coords | null;
  onMapClick: (coords: Coords) => void;
  onPlaceClick: (id: string) => void;
}

function pinIcon(label: string | number) {
  return L.divIcon({
    className: '',
    html: `<div class="${styles.pin}"><span>${label}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30],
  });
}

export function TripMap({ trip, day, picking, draftCoords, onMapClick, onPlaceClick }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const draftLayer = useRef<L.LayerGroup | null>(null);
  const clickCb = useRef(onMapClick);
  clickCb.current = onMapClick;
  const pickingRef = useRef(picking);
  pickingRef.current = picking;
  const placeCb = useRef(onPlaceClick);
  placeCb.current = onPlaceClick;

  // инициализация карты один раз
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { scrollWheelZoom: true }).setView([37.56, 126.99], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    const order = placesForDay(trip, day).filter((p) => p.coords);
    const shown = (day === 0 ? allDayPlaces(trip) : placesForDay(trip, day)).filter((p) => p.coords);

    shown.forEach((p) => {
      const label = day === 0 ? (p.dayNumber ?? '') : order.indexOf(p) + 1;
      const m = L.marker(p.coords as Coords, { icon: pinIcon(label) });
      m.bindPopup(`<b>${p.name}</b>${p.time ? ' · ' + p.time : ''}${p.desc ? '<br>' + p.desc : ''}`);
      m.on('click', () => placeCb.current(p.id));
      m.addTo(mLayer);
    });

    const last = lastDayNumber(trip);
    if (day === 0) {
      const pts = trip.places.filter((p) => (p.dayNumber ?? 0) >= 1 && (p.dayNumber ?? 0) < last && p.coords).map((p) => p.coords as Coords);
      if (pts.length > 1) L.polyline(pts, { color: '#0f1b3d', weight: 3, opacity: 0.5, dashArray: '7 9' }).addTo(rLayer);
    } else {
      const pts = order.map((p) => p.coords as Coords);
      if (pts.length > 1) {
        const col = getCategory(trip, trip.days.find((d) => d.number === day)?.cat ?? null)?.color;
        L.polyline(pts, { color: col || '#0f1b3d', weight: 4, opacity: 0.75 }).addTo(rLayer);
      }
    }

    const bounds = shown.map((p) => p.coords as Coords);
    if (bounds.length) {
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map.fitBounds(L.latLngBounds(bounds).pad(0.18), { animate });
    }
    setTimeout(() => map.invalidateSize(), 0);
  }, [trip, day]);

  return <div ref={elRef} className={styles.map} aria-label="Карта поездки" />;
}
