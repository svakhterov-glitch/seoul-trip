/* ============================================================
   ФОРМА МЕСТА (Этап 2)
   Компактная панель добавления/редактирования места рядом с
   картой. Координаты задаются кликом по карте (кнопка «Указать
   на карте» → app включает режим выбора → setCoords()).

   renderPlaceForm(container, {
     place, dayNumber, days,
     onSave(data), onCancel(), onDelete(id)|null, onPickCoords()
   }) → { setCoords(coords) }
   ============================================================ */

function priceOptions(currency) {
  const c = currency || "₩";
  return [
    ["", "—"], ["free", "Бесплатно"], ["1", `${c} недорого`],
    ["2", `${c}${c} средний`], ["3", `${c}${c}${c} выше среднего`],
  ];
}

function opt(value, label, selected) {
  return `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`;
}
function coordsLabel(coords) {
  return coords ? `${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}` : "не указаны";
}

export function renderPlaceForm(container, opts) {
  const { place, dayNumber, days, byList, currency, onSave, onCancel, onDelete, onPickCoords } = opts;
  const editing = !!place;
  let coords = place?.coords || null;
  const priceVal = place?.price == null ? "" : String(place.price);
  const dayVal = String(dayNumber ?? place?.dayNumber ?? 1);
  const BY = byList?.length ? byList : ["Вместе"];
  const PRICES = priceOptions(currency);

  container.hidden = false;
  container.innerHTML = `
    <div class="pf">
      <div class="pf-head">
        <h3>${editing ? "Изменить место" : "Новое место"}</h3>
        <button type="button" id="pf_x" class="pf-x" aria-label="Закрыть">✕</button>
      </div>
      <form class="pf-form" novalidate>
        <div class="pf-grid">
          <label class="ff"><span class="ff-label">Название</span>
            <input id="pf_name" type="text" required value="${place?.name || ""}" placeholder="напр. Кафе у реки"></label>
          <label class="ff"><span class="ff-label">Время (необязательно)</span>
            <input id="pf_time" type="time" value="${place?.time || ""}"></label>
          <label class="ff"><span class="ff-label">День</span>
            <select id="pf_day">
              ${days.map((d) => opt(String(d.number), `День ${d.number} · ${d.title}`, dayVal)).join("")}
            </select></label>
          <label class="ff"><span class="ff-label">Цена</span>
            <select id="pf_price">${PRICES.map(([v, l]) => opt(v, l, priceVal)).join("")}</select></label>
          <label class="ff"><span class="ff-label">Кто нашёл</span>
            <select id="pf_by">${BY.map((b) => opt(b, b, place?.by || "Вместе")).join("")}</select></label>
          <label class="ff"><span class="ff-label">Иконка</span>
            <input id="pf_photo" type="text" maxlength="2" value="${place?.photo || "📍"}"></label>
        </div>
        <label class="ff"><span class="ff-label">Описание</span>
          <textarea id="pf_desc" rows="2" placeholder="Пара слов о месте">${place?.desc || ""}</textarea></label>

        <div class="pf-coords">
          <span class="ff-label">Точка на карте:</span>
          <span class="pf-coords-val" id="pf_coords">${coordsLabel(coords)}</span>
          <button type="button" class="btn-ghost btn-sm" id="pf_pick">Указать на карте</button>
        </div>
        <p class="tf-error" id="pf_error" role="alert" hidden></p>

        <div class="pf-foot">
          ${editing ? '<button type="button" class="btn-del" id="pf_del">Удалить</button>' : "<span></span>"}
          <div class="pf-foot-right">
            <button type="button" class="btn-ghost" id="pf_cancel">Отмена</button>
            <button type="submit" class="btn-primary">${editing ? "Сохранить" : "Добавить"}</button>
          </div>
        </div>
      </form>
    </div>`;

  const $ = (id) => container.querySelector("#" + id);
  const errEl = $("pf_error");
  const showError = (msg) => { errEl.textContent = msg; errEl.hidden = false; };

  $("pf_pick").addEventListener("click", () => onPickCoords());
  $("pf_x").addEventListener("click", onCancel);
  $("pf_cancel").addEventListener("click", onCancel);
  if (editing && onDelete) $("pf_del").addEventListener("click", () => onDelete(place.id));

  container.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("pf_name").value.trim();
    if (!name) return showError("Введите название места.");
    const priceRaw = $("pf_price").value;
    onSave({
      id: place?.id,
      name,
      time: $("pf_time").value,
      dayNumber: +$("pf_day").value,
      price: priceRaw === "" ? null : (priceRaw === "free" ? "free" : +priceRaw),
      by: $("pf_by").value,
      photo: $("pf_photo").value.trim() || "📍",
      desc: $("pf_desc").value.trim(),
      coords,
    });
  });

  $("pf_name").focus();

  return {
    setCoords(c) {
      coords = c;
      $("pf_coords").textContent = coordsLabel(c);
    },
  };
}
