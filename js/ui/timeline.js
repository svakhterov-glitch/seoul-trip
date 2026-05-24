/* ============================================================
   РАСПИСАНИЕ ПО ДНЯМ (timeline)
   Рисует карточки мест по часам. При day===0 — все дни подряд,
   иначе один выбранный день. Возвращает выбор места наверх через
   onPlaceClick(placeId).
   ============================================================ */

import { getDay, placesForDay } from "../model/entities.js";
import { kakaoLink, priceBadge, byBadge, catBadge } from "./helpers.js";

function dayBlock(trip, d, onPlaceClick) {
  const sec = document.createElement("div");
  sec.className = "day-sec";

  let html = `
    <div class="day-head">
      <div class="dh-row">
        <span class="dh-date">День ${d.number} · ${d.date}</span>${catBadge(d.cat)}
      </div>
      <h3>${d.title}</h3>
      <p>${d.sub}</p>
    </div>
    <div class="timeline">`;

  /* для дня 1 первой строкой — заселение в отель */
  let places = placesForDay(trip, d.number);
  if (d.number === 1) {
    const hotel = trip.places.find((p) => p.type === "hotel");
    if (hotel) places = [hotel, ...places];
  }

  if (places.length === 0) {
    /* пустой день — empty state (важно для новых поездок) */
    html += `<div class="tl-empty">На этот день пока ничего не запланировано.
      Добавьте место вручную, киньте ссылку или соберите день через ИИ.</div>`;
  }

  places.forEach((p) => {
    const cat = getDay(trip, p.dayNumber)?.cat || null;
    html += `
      <div class="tl-item" data-id="${p.id}" role="button" tabindex="0"
           aria-label="${p.time ? p.time + ", " : ""}${p.name}">
        <div class="tl-time">${p.time || ""}</div>
        <div class="tl-mid">
          <div class="tl-dot" aria-hidden="true">${p.photo}</div>
          <div class="tl-line"></div>
        </div>
        <div class="tl-card">
          <div class="tl-name">${p.name}</div>
          <div class="tl-desc">${p.desc}</div>
          <div class="badges">${p.type === "hotel" ? "" : catBadge(cat)}${priceBadge(p.price)}${byBadge(p.by)}</div>
          ${p.history ? `<div class="tl-hist"><b>📜 История:</b> ${p.history}</div>` : ""}
          <a class="kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">🗺 Открыть в Kakao Map</a>
        </div>
      </div>`;
  });

  html += `</div>`;
  sec.innerHTML = html;
  sec.querySelectorAll(".tl-item").forEach((el) => {
    el.addEventListener("click", () => onPlaceClick(el.dataset.id));
    // Enter/Space активируют карточку (как нативная кнопка)
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onPlaceClick(el.dataset.id);
      }
    });
  });
  return sec;
}

export function renderTimeline(container, trip, day, onPlaceClick) {
  container.innerHTML = "";
  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  days.forEach((d) => container.appendChild(dayBlock(trip, d, onPlaceClick)));
}

/* подсветить выбранную карточку */
export function highlightPlace(container, placeId) {
  container.querySelectorAll(".tl-item").forEach((el) => el.classList.remove("active"));
  const card = container.querySelector(`.tl-item[data-id="${placeId}"]`);
  if (card) card.classList.add("active");
}
