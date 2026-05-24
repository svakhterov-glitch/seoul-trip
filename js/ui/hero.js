/* ============================================================
   ШАПКА (HERO)
   Рисует заголовок, подзаголовок, чипы и карточки рейсов из
   данных поездки. Раньше всё было захардкожено в index.html —
   теперь меняется при переключении/создании поездки.
   ============================================================ */

import { formatDateRange } from "../model/days.js";
import { tripPeople } from "../model/entities.js";

/* склонение: 1 день, 2 дня, 5 дней */
function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

/* обратный отсчёт / статус поездки по датам */
function countdown(trip) {
  if (!trip.startDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(trip.startDate + "T00:00:00");
  const end = trip.endDate ? new Date(trip.endDate + "T00:00:00") : start;
  const diff = Math.round((start - today) / 86400000);
  if (diff > 0) return { num: diff, label: plural(diff, "день до старта", "дня до старта", "дней до старта"), accent: true };
  if (today <= end) return { num: "🟢", label: "поездка идёт", accent: true };
  return { num: "✓", label: "поездка завершилась", accent: false };
}

function statsStrip(trip) {
  const daysCount = trip.days.length;
  const places = trip.places.filter((p) => p.dayNumber >= 1 && p.type !== "airport").length;
  const cd = countdown(trip);
  const tiles = [];
  if (cd) tiles.push(`<div class="hstat${cd.accent ? " hstat-accent" : ""}">
    <div class="hstat-num">${cd.num}</div><div class="hstat-label">${cd.label}</div></div>`);
  tiles.push(`<div class="hstat"><div class="hstat-num">${daysCount}</div>
    <div class="hstat-label">${plural(daysCount, "день", "дня", "дней")} в поездке</div></div>`);
  tiles.push(`<div class="hstat"><div class="hstat-num">${places}</div>
    <div class="hstat-label">${plural(places, "место", "места", "мест")} в маршруте</div></div>`);
  if (trip.budget) tiles.push(`<div class="hstat"><div class="hstat-num">${trip.budget}${trip.currency || ""}</div>
    <div class="hstat-label">бюджет</div></div>`);
  return `<div class="hero-stats">${tiles.join("")}</div>`;
}

function flightCard(f) {
  const title = f.direction === "out" ? "Туда" : "Обратно";
  const air = f.airline ? " · " + f.airline : "";
  return `
    <div class="flight">
      <div class="fl-h"><span>${title}${air}</span><span>${f.dateLabel || ""}</span></div>
      <div class="fl-route">
        <div class="fl-time">${f.depart || ""}</div>
        <div class="fl-line"></div>
        <div class="fl-time">${f.arrive || ""}</div>
      </div>
      <div class="fl-codes"><span>${f.from || ""}</span><span>${f.to || ""}</span></div>
      <div class="fl-air"><span>${f.durationText || ""}</span><span>${f.layoverText || ""}</span></div>
    </div>`;
}

export function renderHero(container, trip) {
  const year = trip.startDate ? trip.startDate.slice(0, 4) : "";
  const eyebrow = [trip.country || trip.city, year].filter(Boolean).join(" · ");
  const dateRange = trip.startDate && trip.endDate
    ? formatDateRange(trip.startDate, trip.endDate) : "";

  const people = tripPeople(trip).join(" & ");
  const chips = [];
  if (dateRange) chips.push(`<div class="chip">📅 ${dateRange}</div>`);
  if (people) chips.push(`<div class="chip">👫 ${people}</div>`);
  if (trip.hotel?.name) chips.push(`<div class="chip">🏨 ${trip.hotel.name}</div>`);
  chips.push(`<div class="chip">🕘 Расписание по часам</div>`);

  const flights = trip.flights.length
    ? `<div class="flights">${trip.flights.map(flightCard).join("")}</div>`
    : "";

  container.innerHTML = `
    <span class="eyebrow">📍 ${eyebrow}</span>
    <h1>${trip.title || trip.city || "Новая поездка"}</h1>
    ${trip.lead ? `<p class="lead">${trip.lead}</p>` : ""}
    ${trip.note ? `<div class="lovenote">${trip.note}</div>` : ""}
    ${statsStrip(trip)}
    <div class="meta-row">${chips.join("")}</div>
    ${flights}`;
}
