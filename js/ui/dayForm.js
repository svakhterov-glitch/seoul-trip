/* ============================================================
   ФОРМА НАСТРОЙКИ ДНЯ (категория, начало/конец, заголовок, тема)
   Компактная панель рядом с картой (тот же контейнер, что и форма
   места). Сохраняет изменения дня через onSave(number, patch).

   renderDayForm(container, { day, onSave(number, patch), onCancel })
   ============================================================ */

function opt(value, label, selected) {
  return `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`;
}

export function renderDayForm(container, { day, categories, onSave, onCancel, onManageCategories }) {
  const catVal = day.cat || "";
  container.hidden = false;
  container.innerHTML = `
    <div class="pf">
      <div class="pf-head">
        <h3>⚙️ Настройка дня ${day.number}</h3>
        <button type="button" id="df_x" class="pf-x" aria-label="Закрыть">✕</button>
      </div>
      <form class="pf-form" novalidate>
        <div class="pf-grid">
          <div class="ff"><span class="ff-label">Категория дня
            <button type="button" class="link-btn" id="df_managecat">настроить категории</button></span>
            <select id="df_cat" aria-label="Категория дня">
              ${opt("", "— без категории", catVal)}
              ${categories.map((c) => opt(c.key, c.label, catVal)).join("")}
            </select></div>
          <label class="ff"><span class="ff-label">Начало дня</span>
            <input id="df_start" type="time" value="${day.start || ""}"></label>
          <label class="ff"><span class="ff-label">Конец дня</span>
            <input id="df_end" type="time" value="${day.end || ""}"></label>
        </div>
        <label class="ff"><span class="ff-label">Заголовок дня</span>
          <input id="df_title" type="text" value="${day.title || ""}" placeholder="напр. Туристический Сеул"></label>
        <label class="ff"><span class="ff-label">Тема дня</span>
          <input id="df_sub" type="text" value="${day.sub || ""}" placeholder="о чём этот день"></label>
        <p class="tf-error" id="df_error" role="alert" hidden></p>

        <div class="pf-foot">
          <span></span>
          <div class="pf-foot-right">
            <button type="button" class="btn-ghost" id="df_cancel">Отмена</button>
            <button type="submit" class="btn-primary">Сохранить</button>
          </div>
        </div>
      </form>
    </div>`;

  const $ = (id) => container.querySelector("#" + id);
  const errEl = $("df_error");

  $("df_x").addEventListener("click", onCancel);
  $("df_cancel").addEventListener("click", onCancel);
  $("df_managecat").addEventListener("click", onManageCategories);

  container.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const start = $("df_start").value, end = $("df_end").value;
    if (start && end && end < start) {
      errEl.textContent = "Конец дня не может быть раньше начала.";
      errEl.hidden = false;
      return;
    }
    onSave(day.number, {
      cat: $("df_cat").value || null,
      start, end,
      title: $("df_title").value.trim(),
      sub: $("df_sub").value.trim(),
    });
  });
}
