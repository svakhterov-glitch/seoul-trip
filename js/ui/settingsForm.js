/* ============================================================
   СТРАНИЦА «НАСТРОЙКИ ПОЕЗДКИ» (адрес #/settings)
   Переменные уровня всей поездки: базовые данные, люди, бюджет и
   валюта, интересы и темп, категории дней. Сохранение отдаёт один
   patch через onSave(patch).

   renderSettingsPage(container, { trip, onSave(patch), onCancel })
   ============================================================ */

import { createCategory, tripPeople } from "../model/entities.js";

const PACE = [
  ["", "—"], ["relaxed", "Расслабленный"], ["moderate", "Умеренный"], ["packed", "Насыщенный"],
];

function opt(v, l, sel) {
  return `<option value="${v}"${v === sel ? " selected" : ""}>${l}</option>`;
}
function ff(id, label, attrs = "", value = "") {
  return `<label class="ff" for="${id}"><span class="ff-label">${label}</span>
    <input id="${id}" ${attrs} value="${value}"></label>`;
}
function personRow(name) {
  return `<div class="list-row person-row">
    <input type="text" class="list-input" value="${name}" placeholder="Имя">
    <button type="button" class="list-del" aria-label="Удалить человека">🗑</button>
  </div>`;
}
function catRow(c) {
  return `<div class="list-row cat-row" data-key="${c.key}">
    <input type="color" class="cat-color" value="${c.color}" aria-label="Цвет категории">
    <input type="text" class="list-input cat-label" value="${c.label}" placeholder="Название категории">
    <button type="button" class="list-del" aria-label="Удалить категорию">🗑</button>
  </div>`;
}

export function renderSettingsPage(container, { trip, onSave, onCancel }) {
  const people = tripPeople(trip);

  container.innerHTML = `
    <div class="page">
      <header class="page-head">
        <div class="page-head-inner">
          <button type="button" class="page-back" id="st_back">← Назад</button>
          <span class="page-eyebrow">Настройки поездки</span>
        </div>
      </header>
      <div class="page-body">
        <h1 class="tf-title">Настройки поездки</h1>
        <p class="tf-intro">Переменные всей поездки. «Люди» питают поле «кто нашёл
          место», валюта — ценовые бейджи, категории — цвета дней.</p>

        <section class="tf-card">
          <h2 class="tf-h2">О поездке</h2>
          <div class="tf-grid">
            ${ff("st_title", "Название", 'type="text"', trip.title || "")}
            ${ff("st_city", "Город", 'type="text"', trip.city || "")}
            ${ff("st_country", "Страна", 'type="text"', trip.country || "")}
            ${ff("st_hotel", "Отель", 'type="text"', trip.hotel?.name || "")}
            ${ff("st_start", "Дата начала", 'type="date"', trip.startDate || "")}
            ${ff("st_end", "Дата конца", 'type="date"', trip.endDate || "")}
          </div>
          <label class="ff"><span class="ff-label">Вводный текст</span>
            <textarea id="st_lead" rows="2" placeholder="короткое описание поездки">${trip.lead || ""}</textarea></label>
          <label class="ff"><span class="ff-label">Личная заметка</span>
            <input id="st_note" type="text" value="${trip.note || ""}" placeholder="напр. 💛 только вдвоём"></label>
          <p class="tf-error" id="st_error" role="alert" hidden></p>
        </section>

        <section class="tf-card">
          <h2 class="tf-h2">Люди</h2>
          <div class="list" id="st_people">${people.map(personRow).join("")}</div>
          <button type="button" class="btn-ghost btn-sm" id="st_addperson">＋ Добавить человека</button>
        </section>

        <section class="tf-card">
          <h2 class="tf-h2">Бюджет и валюта</h2>
          <div class="tf-grid">
            ${ff("st_currency", "Валюта (символ или код)", 'type="text" maxlength="6"', trip.currency || "₩")}
            ${ff("st_budget", "Общий бюджет", 'type="number" min="0" placeholder="напр. 2000000"', trip.budget ?? "")}
          </div>
        </section>

        <section class="tf-card">
          <h2 class="tf-h2">Интересы и темп</h2>
          <label class="ff"><span class="ff-label">Интересы (через запятую)</span>
            <input id="st_interests" type="text" value="${(trip.interests || []).join(", ")}"
              placeholder="еда, искусство, шопинг"></label>
          <label class="ff"><span class="ff-label">Темп поездки</span>
            <select id="st_pace">${PACE.map(([v, l]) => opt(v, l, trip.pace || "")).join("")}</select></label>
        </section>

        <section class="tf-card">
          <h2 class="tf-h2">Категории дней</h2>
          <div class="list" id="st_cats">${trip.categories.map(catRow).join("")}</div>
          <button type="button" class="btn-ghost btn-sm" id="st_addcat">＋ Добавить категорию</button>
        </section>

        <footer class="tf-foot">
          <button type="button" class="btn-ghost" id="st_cancel">Отмена</button>
          <button type="button" class="btn-primary" id="st_save">Сохранить</button>
        </footer>
      </div>
    </div>`;

  const $ = (id) => container.querySelector("#" + id);
  const peopleEl = $("st_people");
  const catsEl = $("st_cats");
  const errEl = $("st_error");

  $("st_addperson").addEventListener("click", () => peopleEl.insertAdjacentHTML("beforeend", personRow("")));
  $("st_addcat").addEventListener("click", () =>
    catsEl.insertAdjacentHTML("beforeend", catRow(createCategory({ label: "Новая категория", color: "#2f6fd6" }))));

  container.addEventListener("click", (e) => {
    const del = e.target.closest(".list-del");
    if (del) del.closest(".list-row").remove();
  });

  $("st_back").addEventListener("click", onCancel);
  $("st_cancel").addEventListener("click", onCancel);

  $("st_save").addEventListener("click", () => {
    const start = $("st_start").value, end = $("st_end").value;
    if (start && end && end < start) {
      errEl.textContent = "Дата конца не может быть раньше начала.";
      errEl.hidden = false;
      return;
    }
    const people = [...peopleEl.querySelectorAll(".list-input")]
      .map((i) => i.value.trim()).filter(Boolean);
    const categories = [...catsEl.querySelectorAll(".cat-row")]
      .map((row) => createCategory({
        key: row.dataset.key,
        label: row.querySelector(".cat-label").value.trim(),
        color: row.querySelector(".cat-color").value,
      }))
      .filter((c) => c.label);
    const budgetRaw = $("st_budget").value.trim();

    onSave({
      title: $("st_title").value.trim(),
      city: $("st_city").value.trim(),
      country: $("st_country").value.trim(),
      startDate: start,
      endDate: end,
      hotel: $("st_hotel").value.trim() ? { name: $("st_hotel").value.trim(), coords: trip.hotel?.coords || null } : null,
      lead: $("st_lead").value.trim(),
      note: $("st_note").value.trim(),
      people,
      currency: $("st_currency").value.trim() || "₩",
      budget: budgetRaw === "" ? null : Number(budgetRaw),
      interests: $("st_interests").value.split(",").map((s) => s.trim()).filter(Boolean),
      pace: $("st_pace").value,
      categories,
    });
  });
}
