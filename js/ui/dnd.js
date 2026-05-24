/* ============================================================
   DRAG-AND-DROP мест
   • Внутри дня: перетаскивание меняет ПОРЯДОК блоков (план дня
     строится по нему, а не по времени) — onReorder(day, ids).
   • На вкладку дня наверху: быстрый перенос в КОНЕЦ того дня со
     сбросом времени — onMoveToDay(id, day).

   Отель/аэропорт (data-fixed) не перетаскиваются и не участвуют
   в нумерации порядка.
   Нативный HTML5 DnD — десктоп (мышь); тач добавим отдельно.
   ============================================================ */

function makeIndicator() {
  const el = document.createElement("div");
  el.className = "tl-drop-line";
  return el;
}

/* элемент, ПЕРЕД которым нужно вставить (по позиции курсора) */
function dragAfterElement(list, y, draggingId) {
  const items = [...list.querySelectorAll('.tl-item:not([data-fixed])')]
    .filter((el) => el.dataset.id !== draggingId);
  let closest = { offset: -Infinity, el: null };
  for (const child of items) {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, el: child };
  }
  return closest.el;
}

export function enableDnD({ itineraryEl, tabsEl, onReorder, onMoveToDay }) {
  let dragId = null;
  const indicator = makeIndicator();

  function cleanup() {
    indicator.remove();
    itineraryEl.querySelectorAll(".drop-target").forEach((e) => e.classList.remove("drop-target"));
    tabsEl.querySelectorAll(".drop-target").forEach((e) => e.classList.remove("drop-target"));
  }

  /* перетаскиваемые карточки */
  itineraryEl.querySelectorAll('.tl-item[draggable="true"]').forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragId = el.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      cleanup();
      dragId = null;
    });
  });

  /* зоны дней: перестановка/вставка внутри списка */
  itineraryEl.querySelectorAll(".day-sec").forEach((sec) => {
    const day = +sec.dataset.day;
    const list = sec.querySelector(".timeline");
    if (!list || !(day >= 1)) return;

    list.addEventListener("dragover", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      sec.classList.add("drop-target");
      const after = dragAfterElement(list, e.clientY, dragId);
      if (after) list.insertBefore(indicator, after);
      else list.appendChild(indicator);
    });
    list.addEventListener("dragleave", (e) => {
      if (!list.contains(e.relatedTarget)) {
        sec.classList.remove("drop-target");
        indicator.remove();
      }
    });
    list.addEventListener("drop", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      const ids = [...list.querySelectorAll('.tl-item:not([data-fixed])')]
        .map((el) => el.dataset.id)
        .filter((id) => id !== dragId);
      const after = dragAfterElement(list, e.clientY, dragId);
      const idx = after ? ids.indexOf(after.dataset.id) : ids.length;
      ids.splice(idx < 0 ? ids.length : idx, 0, dragId);
      cleanup();
      onReorder(day, ids);
    });
  });

  /* вкладки дней — быстрый перенос в конец дня */
  tabsEl.querySelectorAll(".tab[data-day]").forEach((tab) => {
    const day = +tab.dataset.day;
    if (!(day >= 1)) return;
    tab.addEventListener("dragover", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      tab.classList.add("drop-target");
    });
    tab.addEventListener("dragleave", () => tab.classList.remove("drop-target"));
    tab.addEventListener("drop", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      tab.classList.remove("drop-target");
      onMoveToDay(dragId, day);
    });
  });
}
