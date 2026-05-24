/* ============================================================
   ПАНЕЛЬ ПОЕЗДОК
   Выпадающий список существующих поездок + кнопка «Новая
   поездка». Нативный <select> доступен с клавиатуры из коробки.
   ============================================================ */

export function renderTripBar(container, { trips, currentId, onSelect, onNew }) {
  container.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "tripbar-inner";

  const label = document.createElement("label");
  label.className = "tripbar-label";
  label.textContent = "Поездка";
  label.setAttribute("for", "tripSelect");

  const select = document.createElement("select");
  select.id = "tripSelect";
  select.className = "tripbar-select";
  trips.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.title || t.city || "Без названия";
    if (t.id === currentId) opt.selected = true;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => onSelect(select.value));

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tripbar-new";
  btn.innerHTML = "＋ Новая поездка";
  btn.addEventListener("click", onNew);

  wrap.append(label, select, btn);
  container.appendChild(wrap);
}
