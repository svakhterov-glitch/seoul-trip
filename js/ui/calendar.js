/* ============================================================
   ВКЛАДКИ ДНЕЙ (календарь)
   Рисует переключатель «Весь маршрут» + дни поездки.
   Вкладка 0 — обзор всего маршрута.

   Доступность: контейнер — role="tablist", каждая вкладка —
   <button role="tab"> (фокусируется и срабатывает с клавиатуры).
   Стрелки ←/→ перемещают между вкладками (паттерн tablist).
   ============================================================ */

import { CATS, catColor } from "../model/config.js";

export function renderTabs(container, trip, activeDay, onSelect) {
  container.innerHTML = "";
  container.setAttribute("role", "tablist");
  container.setAttribute("aria-label", "Дни поездки");

  const tabs = [{ number: 0 }, ...trip.days];
  tabs.forEach((d) => {
    const active = d.number === activeDay;
    const t = document.createElement("button");
    t.type = "button";
    t.className = "tab" + (active ? " active" : "");
    t.dataset.day = d.number;
    t.setAttribute("role", "tab");
    t.setAttribute("aria-selected", active ? "true" : "false");
    // активная вкладка в табуляции, остальные — стрелками (roving tabindex)
    t.tabIndex = active ? 0 : -1;

    if (d.number === 0) {
      t.setAttribute("aria-label", "Весь маршрут, обзор");
      t.innerHTML = `Весь маршрут<small>обзор</small>`;
    } else {
      const c = CATS[d.cat];
      t.style.setProperty("--tc", catColor(d.cat));
      t.setAttribute("aria-label", `День ${d.number}${c ? ", " + c.label : ""}`);
      t.innerHTML = `День ${d.number}<small>${c ? c.label : ""}</small>`;
    }

    t.addEventListener("click", () => onSelect(d.number));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const btns = [...container.querySelectorAll(".tab")];
      const i = btns.indexOf(t);
      const next = e.key === "ArrowRight" ? btns[i + 1] : btns[i - 1];
      if (next) {
        next.focus();
        onSelect(+next.dataset.day);
      }
    });

    container.appendChild(t);
  });
}
