/* ============================================================
   ПАНЕЛЬ ПОЕЗДОК
   Выпадающий список существующих поездок + кнопка «Новая
   поездка». Нативный <select> доступен с клавиатуры из коробки.
   ============================================================ */

export function renderTripBar(container, { trips, currentId, onSelect, onNew, onSettings, onGenerate, auth }) {
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

  const aiBtn = document.createElement("button");
  aiBtn.type = "button";
  aiBtn.className = "tripbar-btn";
  aiBtn.innerHTML = "🤖 Собрать через ИИ";
  aiBtn.addEventListener("click", onGenerate);

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

  actions.append(aiBtn, catBtn, newBtn);

  // вход/выход (только если настроен Supabase)
  if (auth) {
    const authBtn = document.createElement("button");
    authBtn.type = "button";
    authBtn.className = "tripbar-btn";
    if (auth.user) {
      authBtn.innerHTML = `🚪 Выйти`;
      authBtn.title = auth.user.email || "";
      authBtn.addEventListener("click", auth.onLogout);
    } else {
      authBtn.innerHTML = `🔑 Войти`;
      authBtn.addEventListener("click", auth.onLogin);
    }
    actions.append(authBtn);
  }

  wrap.append(label, select, actions);
  container.appendChild(wrap);
}
