/* ============================================================
   РАСПИСАНИЕ ПО ДНЯМ (timeline)
   Рисует карточки мест по часам. При day===0 — все дни подряд,
   иначе один выбранный день.

   handlers: { onPlaceClick(id), onAdd(dayNumber),
               onEdit(id), onDelete(id) }

   Карточки помечены для drag-and-drop (см. ui/dnd.js); отель и
   аэропорт зафиксированы (data-fixed) и не перетаскиваются.
   ============================================================ */

import { getDay, placesForDay } from "../model/entities.js";
import { kakaoLink, priceBadge, byBadge, catBadge } from "./helpers.js";

function placeCard(trip, p, handlers) {
  const cat = getDay(trip, p.dayNumber)?.cat || null;
  const fixed = p.type === "hotel" || p.type === "airport";
  const actions = fixed ? "" : `
    <div class="tl-actions">
      <button type="button" class="tl-act" data-act="edit" aria-label="Изменить ${p.name}">✏️</button>
      <button type="button" class="tl-act" data-act="del" aria-label="Удалить ${p.name}">🗑</button>
    </div>`;
  return `
    <div class="tl-item" data-id="${p.id}" ${fixed ? 'data-fixed="1"' : 'draggable="true"'}
         role="button" tabindex="0" aria-label="${p.time ? p.time + ", " : ""}${p.name}">
      <div class="tl-time">${p.time || ""}</div>
      <div class="tl-mid">
        <div class="tl-dot" aria-hidden="true">${p.photo}</div>
        <div class="tl-line"></div>
      </div>
      <div class="tl-card">
        ${actions}
        <div class="tl-name">${p.name}</div>
        <div class="tl-desc">${p.desc}</div>
        <div class="badges">${p.type === "hotel" ? "" : catBadge(cat)}${priceBadge(p.price)}${byBadge(p.by)}</div>
        ${p.history ? `<div class="tl-hist"><b>📜 История:</b> ${p.history}</div>` : ""}
        ${p.coords ? `<a class="kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener"
             onclick="event.stopPropagation()">🗺 Открыть в Kakao Map</a>` : ""}
      </div>
    </div>`;
}

function dayBlock(trip, d, handlers) {
  const sec = document.createElement("div");
  sec.className = "day-sec";
  sec.dataset.day = d.number;

  let html = `
    <div class="day-head">
      <div class="dh-row">
        <span class="dh-date">День ${d.number} · ${d.date}</span>${catBadge(d.cat)}
        <button type="button" class="day-add" data-day="${d.number}">＋ Добавить место</button>
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
    html += `<div class="tl-empty">На этот день пока ничего не запланировано.
      Добавьте место кнопкой выше, перетащите сюда карточку из другого дня,
      киньте ссылку или соберите день через ИИ.</div>`;
  }
  places.forEach((p) => { html += placeCard(trip, p, handlers); });

  html += `</div>`;
  sec.innerHTML = html;

  /* «добавить место» на этом дне */
  sec.querySelector(".day-add").addEventListener("click", () => handlers.onAdd(d.number));

  /* клики/клавиши по карточкам */
  sec.querySelectorAll(".tl-item").forEach((el) => {
    const id = el.dataset.id;
    el.addEventListener("click", (e) => {
      const act = e.target.closest(".tl-act");
      if (act) {
        e.stopPropagation();
        act.dataset.act === "edit" ? handlers.onEdit(id) : handlers.onDelete(id);
        return;
      }
      handlers.onPlaceClick(id);
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlers.onPlaceClick(id);
      }
    });
  });
  return sec;
}

export function renderTimeline(container, trip, day, handlers) {
  container.innerHTML = "";
  const days = day === 0 ? trip.days : trip.days.filter((d) => d.number === day);
  days.forEach((d) => container.appendChild(dayBlock(trip, d, handlers)));
}

/* подсветить выбранную карточку */
export function highlightPlace(container, placeId) {
  container.querySelectorAll(".tl-item").forEach((el) => el.classList.remove("active"));
  const card = container.querySelector(`.tl-item[data-id="${placeId}"]`);
  if (card) card.classList.add("active");
}
