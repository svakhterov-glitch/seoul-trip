/* ============================================================
   СТРАНИЦА «НОВАЯ ПОЕЗДКА» (Этап 1)
   Полноэкранная страница ввода перелёта и поездки (адрес #/new).
   Собирает данные и отдаёт их через onCreate(data); построение
   Trip и сохранение делает вызывающая сторона (app.js).
   onCancel() — возврат на предыдущий экран.

   Доступность: подписи связаны с полями, верные типы input
   (date/time), ошибки показываются текстом, фокус ставится на
   первое поле.
   ============================================================ */

function field(id, label, attrs = "") {
  return `
    <label class="ff" for="${id}">
      <span class="ff-label">${label}</span>
      <input id="${id}" ${attrs} />
    </label>`;
}

function flightFieldset(p, legend) {
  return `
    <fieldset class="tf-flight">
      <legend>${legend}</legend>
      <div class="tf-grid">
        ${field(`${p}_airline`, "Авиакомпания", 'type="text" autocomplete="off" placeholder="напр. Air China"')}
        ${field(`${p}_date`, "Дата", 'type="date"')}
        ${field(`${p}_from`, "Откуда", 'type="text" placeholder="SVO Шереметьево"')}
        ${field(`${p}_to`, "Куда", 'type="text" placeholder="ICN Инчхон"')}
        ${field(`${p}_depart`, "Вылет", 'type="time"')}
        ${field(`${p}_arrive`, "Прилёт", 'type="time"')}
      </div>
    </fieldset>`;
}

export function renderTripFormPage(container, { onCreate, onCancel }) {
  container.innerHTML = `
    <div class="page">
      <header class="page-head">
        <div class="page-head-inner">
          <button type="button" class="page-back">← Назад</button>
          <span class="page-eyebrow">Новая поездка</span>
        </div>
      </header>

      <div class="page-body">
        <form class="trip-form" novalidate>
          <h1 class="tf-title">Расскажите о поездке</h1>
          <p class="tf-intro">Заполните перелёт и даты — сервис построит пустой
            календарь дней, который вы наполните вручную, ссылками или через ИИ.</p>

          <section class="tf-card">
            <h2 class="tf-h2">Поездка</h2>
            <div class="tf-grid">
              ${field("t_title", "Название поездки", 'type="text" placeholder="напр. Сеул вдвоём" required')}
              ${field("t_city", "Город", 'type="text" placeholder="Сеул" required')}
              ${field("t_country", "Страна", 'type="text" placeholder="Корея"')}
              ${field("t_travelers", "Кто едет", 'type="text" placeholder="Сергей & Полина"')}
              ${field("t_start", "Дата начала", 'type="date" required')}
              ${field("t_end", "Дата конца", 'type="date" required')}
              ${field("t_hotel", "Отель", 'type="text" placeholder="название (необязательно)"')}
            </div>
            <p class="tf-error" id="tf_error" role="alert" hidden></p>
          </section>

          <section class="tf-card">
            <h2 class="tf-h2">Перелёт</h2>
            ${flightFieldset("out", "Туда (необязательно)")}
            ${flightFieldset("back", "Обратно (необязательно)")}
          </section>

          <footer class="tf-foot">
            <button type="button" class="btn-ghost tf-cancel">Отмена</button>
            <button type="submit" class="btn-primary">Создать поездку</button>
          </footer>
        </form>
      </div>
    </div>`;

  const form = container.querySelector("form");
  const errEl = container.querySelector("#tf_error");
  const val = (id) => container.querySelector("#" + id).value.trim();

  container.querySelector(".page-back").addEventListener("click", onCancel);
  container.querySelector(".tf-cancel").addEventListener("click", onCancel);

  function readFlight(p) {
    const from = val(`${p}_from`), to = val(`${p}_to`), depart = val(`${p}_depart`);
    if (!from && !to && !depart) return null; // рейс не заполнен — пропускаем
    return {
      direction: p === "out" ? "out" : "back",
      airline: val(`${p}_airline`),
      from, to, depart, arrive: val(`${p}_arrive`),
      date: val(`${p}_date`),
    };
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
    errEl.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = val("t_title"), city = val("t_city");
    const startDate = val("t_start"), endDate = val("t_end");

    if (!title && !city) return showError("Укажите название или город поездки.");
    if (!startDate || !endDate) return showError("Укажите даты начала и конца.");
    if (endDate < startDate) return showError("Дата конца не может быть раньше начала.");

    onCreate({
      title, city,
      country: val("t_country"),
      travelers: val("t_travelers"),
      hotelName: val("t_hotel"),
      startDate, endDate,
      flights: [readFlight("out"), readFlight("back")].filter(Boolean),
    });
  });

  container.querySelector("#t_title").focus();
}
