/* ============================================================
   КАРТА (Leaflet)
   Изолирует всю работу с картой. createMap() возвращает api,
   которым пользуется app.js: update() перерисовывает маркеры и
   маршрут под выбранный день, flyToPlace() центрирует на точке.
   ============================================================ */

import {
  getDay, getCategory, placesForDay, allDayPlaces, lastDayNumber,
} from "../model/entities.js";
import { kakaoLink, priceBadge, byBadge, catBadge, dayLabel } from "./helpers.js";

function makeIcon(trip, p, label) {
  const isHotel = p.type === "hotel";
  const isAir = p.type === "airport";
  const cls = isHotel ? "hotel" : (isAir ? "airport" : "");
  const txt = isHotel ? "🏨" : (isAir ? "✈" : label);
  const size = (isHotel || isAir) ? 40 : 34;
  return L.divIcon({
    className: "",
    html: `<div class="pin ${cls}"><span>${txt}</span></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size], popupAnchor: [0, -size + 4],
  });
}

function popupHtml(trip, p) {
  const day = getDay(trip, p.dayNumber);
  const cat = day ? day.cat : null;
  return `
    <div class="pop-photo${p.image ? " pop-photo-img" : ""}">${p.image
      ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
      : p.photo}</div>
    <div class="pop-body">
      <div class="pop-day">${dayLabel(trip, p)}${p.time ? " · " + p.time : ""}</div>
      <div class="pop-name">${p.name}</div>
      <div class="pop-desc">${p.desc}</div>
      <div class="badges">${catBadge(trip, cat)}${priceBadge(p.price, trip.currency)}${byBadge(p.by)}</div>
      <a class="kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener">🗺 Открыть в Kakao Map</a>
    </div>`;
}

export function createMap(elId) {
  const map = L.map(elId, { scrollWheelZoom: true }).setView([37.56, 126.99], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const markerLayer = L.layerGroup().addTo(map);
  const routeLayer = L.layerGroup().addTo(map);
  const draftLayer = L.layerGroup().addTo(map); // временная точка при добавлении
  let curMarkers = {}; // placeId -> marker
  let clickHandler = null;

  /* режим выбора точки на карте: fn(latlng) | null */
  function setClickHandler(fn) {
    clickHandler = fn;
    const el = map.getContainer();
    el.style.cursor = fn ? "crosshair" : "";
    if (!fn) draftLayer.clearLayers();
  }
  map.on("click", (e) => {
    if (clickHandler) clickHandler([e.latlng.lat, e.latlng.lng]);
  });

  /* показать/убрать временную точку-черновик */
  function showDraft(coords) {
    draftLayer.clearLayers();
    if (!coords) return;
    L.marker(coords, {
      icon: L.divIcon({
        className: "",
        html: `<div class="pin draft"><span>+</span></div>`,
        iconSize: [34, 34], iconAnchor: [17, 34],
      }),
    }).addTo(draftLayer);
  }

  function update(trip, day, onPlaceClick) {
    markerLayer.clearLayers();
    routeLayer.clearLayers();
    curMarkers = {};

    const hotel = trip.places.find((p) => p.dayNumber === 0);

    /* какие места показываем */
    let shown;
    if (day === 0) {
      shown = allDayPlaces(trip).slice();
      if (hotel) shown.unshift(hotel);
    } else {
      shown = placesForDay(trip, day);
      if (hotel) shown = [hotel, ...shown];
    }
    // на карту попадают только места с координатами (свободные окна и
    // места без точки пропускаем)
    shown = shown.filter((p) => p.coords);

    /* маркеры */
    const order = placesForDay(trip, day).filter((p) => p.coords);
    shown.forEach((p) => {
      const label = day === 0 ? p.dayNumber : order.indexOf(p) + 1;
      const m = L.marker(p.coords, { icon: makeIcon(trip, p, label) });
      m.bindPopup(popupHtml(trip, p));
      m.on("click", () => onPlaceClick && onPlaceClick(p.id));
      m.addTo(markerLayer);
      curMarkers[p.id] = m;
    });

    /* линия маршрута */
    const last = lastDayNumber(trip);
    if (day === 0) {
      const pts = trip.places
        .filter((p) => p.dayNumber >= 1 && p.dayNumber < last && p.coords)
        .map((p) => p.coords);
      if (pts.length > 1)
        L.polyline(pts, { color: "#0f1b3d", weight: 3, opacity: 0.5, dashArray: "7 9" }).addTo(routeLayer);
    } else {
      const pts = order.map((p) => p.coords);
      if (pts.length > 1) {
        const dayMeta = getDay(trip, day);
        const col = getCategory(trip, dayMeta && dayMeta.cat)?.color;
        L.polyline(pts, { color: col || "#0f1b3d", weight: 4, opacity: 0.75 }).addTo(routeLayer);
      }
    }

    /* подгон границ (без анимации при «меньше движения») */
    const bounds = shown.map((p) => p.coords);
    const animate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.18), { animate });
  }

  function flyToPlace(place, openPopup = true, animate = true) {
    if (animate) map.flyTo(place.coords, 15, { duration: 0.7 });
    else map.setView(place.coords, 15, { animate: false });
    if (openPopup && curMarkers[place.id]) curMarkers[place.id].openPopup();
  }

  return { map, update, flyToPlace, setClickHandler, showDraft };
}
