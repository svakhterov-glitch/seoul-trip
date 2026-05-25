/* ============================================================
   ТРЕНДЫ (инсайты для поездки)
   Блок «в тренде сейчас» — показывается только для корейских
   поездок. Карточку тренда можно добавить в день (открывает форму
   места с предзаполнением).

   handlers: { onAdd(trend) }
   ============================================================ */

import { koreaTrends, isKoreaTrip } from "../model/trends.korea.js";

function trendCard(t, i) {
  return `
    <div class="trend-card" data-i="${i}">
      <div class="trend-photo" aria-hidden="true">${t.photo}</div>
      <div class="trend-body">
        <div class="trend-name">${t.name}</div>
        <div class="trend-area">📍 ${t.area}</div>
        <div class="trend-why">${t.why}</div>
      </div>
      <button type="button" class="btn-ghost btn-sm trend-add" data-i="${i}">＋ В день</button>
    </div>`;
}

export function renderTrends(container, trip, handlers) {
  // тренды только для поездок в Корею
  if (!isKoreaTrip(trip)) { container.hidden = true; container.innerHTML = ""; return; }

  container.hidden = false;
  container.innerHTML = `
    <div class="trends-head">
      <h3>🔥 В тренде сейчас · Корея</h3>
      <span class="trends-note">подборка обновляемых трендовых мест</span>
    </div>
    <div class="trend-list">${koreaTrends.map(trendCard).join("")}</div>`;

  container.querySelectorAll(".trend-add").forEach((btn) => {
    btn.addEventListener("click", () => handlers.onAdd(koreaTrends[+btn.dataset.i]));
  });
}
