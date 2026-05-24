/* ============================================================
   ПАНЕЛЬ ПОЕЗДОК
   Выпадающий список существующих поездок + кнопка «Новая
   поездка». Нативный <select> доступен с клавиатуры из коробки.
   ============================================================ */

export function renderTripBar(container, { trips, currentId, onSelect, onNew, onSettings }) {
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

  const actions = document.createElement("div");
  actions.className = "tripbar-actions";

  const catBtn = document.createElement("button");
  catBtn.type = "button";
  catBtn.className = "tripbar-btn";
  catBtn.innerHTML = "⚙️ Настройки поездки";
  catBtn.addEventListener("click", onSettings);

  const newBtn = document.createElement("button");
  newBtn.type = "button";
  newBtn.className = "tripbar-btn tripbar-new";
  newBtn.innerHTML = "＋ Новая поездка";
  newBtn.addEventListener("click", onNew);

  actions.append(catBtn, newBtn);
  wrap.append(label, select, actions);
  container.appendChild(wrap);
}
