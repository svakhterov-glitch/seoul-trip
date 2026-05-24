/* ============================================================
   DRAG-AND-DROP
   • Карточка места (.tl-item[draggable]) — порядок внутри дня
     (onReorder) или перенос на вкладку дня (onMoveToDay).
   • Карточка ссылки (.link-card[draggable]) из инбокса — сброс на
     день превращает её в место (onLinkToDay).

   Отель/аэропорт (data-fixed) не перетаскиваются.
   Нативный HTML5 DnD — десктоп (мышь); тач добавим отдельно.
   ============================================================ */

function makeIndicator() {
  const el = document.createElement("div");
  el.className = "tl-drop-line";
  return el;
}

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

export function enableDnD({ itineraryEl, tabsEl, inboxEl, onReorder, onMoveToDay, onLinkToDay }) {
  let dragKind = null; // 'place' | 'link'
  let dragId = null;
  const indicator = makeIndicator();

  function cleanup() {
    indicator.remove();
    document.querySelectorAll(".drop-target").forEach((e) => e.classList.remove("drop-target"));
  }

  function bindDraggable(el, kind, id) {
    el.addEventListener("dragstart", (e) => {
      dragKind = kind; dragId = id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
      el.classList.add("dragging");
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      cleanup();
      dragKind = null; dragId = null;
    });
  }

  itineraryEl.querySelectorAll('.tl-item[draggable="true"]').forEach((el) =>
    bindDraggable(el, "place", el.dataset.id));
  if (inboxEl) inboxEl.querySelectorAll('.link-card[draggable="true"]').forEach((el) =>
    bindDraggable(el, "link", el.dataset.linkId));

  /* зоны дней: список (перестановка/вставка/приём ссылки) */
  itineraryEl.querySelectorAll(".day-sec").forEach((sec) => {
    const day = +sec.dataset.day;
    const list = sec.querySelector(".timeline");
    if (!list || !(day >= 1)) return;

    list.addEventListener("dragover", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      sec.classList.add("drop-target");
      if (dragKind === "place") {
        const after = dragAfterElement(list, e.clientY, dragId);
        if (after) list.insertBefore(indicator, after);
        else list.appendChild(indicator);
      }
    });
    list.addEventListener("dragleave", (e) => {
      if (!list.contains(e.relatedTarget)) { sec.classList.remove("drop-target"); indicator.remove(); }
    });
    list.addEventListener("drop", (e) => {
      if (dragId == null) return;
      e.preventDefault();
      if (dragKind === "link") { const id = dragId; cleanup(); onLinkToDay(id, day); return; }
      const ids = [...list.querySelectorAll('.tl-item:not([data-fixed])')]
        .map((el) => el.dataset.id).filter((id) => id !== dragId);
      const after = dragAfterElement(list, e.clientY, dragId);
      const idx = after ? ids.indexOf(after.dataset.id) : ids.length;
      ids.splice(idx < 0 ? ids.length : idx, 0, dragId);
      cleanup();
      onReorder(day, ids);
    });
  });

  /* вкладки дней — быстрый перенос/приём в конец дня */
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
      const id = dragId, kind = dragKind;
      cleanup();
      if (kind === "link") onLinkToDay(id, day);
      else onMoveToDay(id, day);
    });
  });
}
