/* ============================================================
   ШАПКА (HERO)
   Рисует заголовок, подзаголовок, чипы и карточки рейсов из
   данных поездки. Раньше всё было захардкожено в index.html —
   теперь меняется при переключении/создании поездки.
   ============================================================ */

import { formatDateRange } from "../model/days.js";

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

  const chips = [];
  if (dateRange) chips.push(`<div class="chip">📅 ${dateRange}</div>`);
  if (trip.travelers) chips.push(`<div class="chip">👫 ${trip.travelers}</div>`);
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
    <div class="meta-row">${chips.join("")}</div>
    ${flights}`;
}
