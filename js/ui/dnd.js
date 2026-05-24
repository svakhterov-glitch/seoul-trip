/* ============================================================
   DRAG-AND-DROP перенос мест между днями
   Карточку места (.tl-item[draggable]) можно перетащить на
   вкладку дня (.tab[data-day]) или на блок дня (.day-sec[data-day]
   в обзоре). При сбросе вызывается onMove(placeId, dayNumber).

   Отель/аэропорт (data-fixed) не перетаскиваются.
   Примечание: нативный HTML5 DnD работает на десктопе (мышь);
   поддержку тач-перетаскивания добавим отдельно при необходимости.
   ============================================================ */

export function enableDnD({ itineraryEl, tabsEl, onMove }) {
  let dragId = null;

  itineraryEl.querySelectorAll('.tl-item[draggable="true"]').forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragId = el.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => {
      dragId = null;
      el.classList.remove("dragging");
      clearTargets();
    });
  });

  const zones = [
    ...tabsEl.querySelectorAll(".tab[data-day]"),
    ...itineraryEl.querySelectorAll(".day-sec[data-day]"),
  ].filter((z) => +z.dataset.day >= 1);

  function clearTargets() {
    zones.forEach((z) => z.classList.remove("drop-target"));
  }

  zones.forEach((z) => {
    z.addEventListener("dragover", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      z.classList.add("drop-target");
    });
    z.addEventListener("dragleave", () => z.classList.remove("drop-target"));
    z.addEventListener("drop", (e) => {
      e.preventDefault();
      z.classList.remove("drop-target");
      const id = dragId || e.dataTransfer.getData("text/plain");
      if (id) onMove(id, +z.dataset.day);
    });
  });
}
