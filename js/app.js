/* ============================================================
   ТОЧКА ВХОДА
   Собирает слои: Repository → Store → UI. UI подписан на Store и
   перерисовывается при любом изменении. Здесь же — управление
   списком поездок (выбор/создание) и реакция на выбор места.

   Слои (см. PLAN.md, раздел 2):
   UI (ui/*) → Store (store/) → Repository (data/) → Model (model/)
   ИИ-генерация — отдельным сервисом (ai/*).
   ============================================================ */

import { LocalStorageRepository } from "./data/localStorageRepo.js";
import { Store } from "./store/store.js";
import { seoulTrip } from "./model/seed.seoul.js";
import { getDay, createTrip, byOptions } from "./model/entities.js";
import { buildDays, formatDateRu } from "./model/days.js";
import { catBadge } from "./ui/helpers.js";
import { renderHero } from "./ui/hero.js";
import { renderTripBar } from "./ui/tripBar.js";
import { renderTripFormPage } from "./ui/tripForm.js";
import { renderSettingsPage } from "./ui/settingsForm.js";
import { createMap } from "./ui/map.js";
import { renderTabs } from "./ui/calendar.js";
import { renderTimeline, highlightPlace } from "./ui/timeline.js";
import { renderPlaceForm } from "./ui/placeForm.js";
import { renderDayForm } from "./ui/dayForm.js";
import { enableDnD } from "./ui/dnd.js";

/* ---------- инициализация данных ---------- */
const repo = new LocalStorageRepository();

// Загружаем сохранённую поездку, если она есть (правки пользователя
// сохраняются между перезагрузками). Если хранилище пустое — кладём
// готовый Сеул из seed. При открытии показываем Сеул (стартовый экран).
let trip = await repo.getTrip(seoulTrip.id);
if (!trip) trip = await repo.saveTrip(seoulTrip);
const store = new Store(repo, trip);

/* ---------- UI-узлы ---------- */
const viewApp = document.getElementById("view-app");
const viewPage = document.getElementById("view-page");
const mapApi = createMap("map");
const heroEl = document.getElementById("heroInner");
const tripbarEl = document.getElementById("tripbar");
const tabsEl = document.getElementById("tabs");
const itineraryEl = document.getElementById("itinerary");
const capEl = document.getElementById("mapCap");
const editorEl = document.getElementById("editorPanel");
const catLegendEl = document.getElementById("catLegend");

/* пользователь просит меньше движения? */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- маршрутизация между видами ---------- */
function showPage(render) {
  viewApp.hidden = true;
  viewPage.hidden = false;
  render(viewPage);
  window.scrollTo(0, 0);
}

function route() {
  if (location.hash === "#/new") {
    showPage((el) => renderTripFormPage(el, {
      onCreate: handleCreateTrip,
      onCancel: () => history.back(),
    }));
  } else if (location.hash === "#/settings" || location.hash === "#/categories") {
    showPage((el) => renderSettingsPage(el, {
      trip: store.getTrip(),
      onSave: async (patch) => { await store.updateTrip(patch); location.hash = ""; },
      onCancel: () => history.back(),
    }));
  } else {
    viewPage.hidden = true;
    viewPage.innerHTML = "";
    viewApp.hidden = false;
    // карта могла быть скрыта (display:none) — пересчитать размер тайлов
    requestAnimationFrame(() => mapApi.map.invalidateSize());
  }
}
window.addEventListener("hashchange", route);

/* ---------- управление списком поездок ---------- */
async function refreshTripBar() {
  const trips = await repo.listTrips();
  renderTripBar(tripbarEl, {
    trips,
    currentId: store.getTrip().id,
    onSelect: selectTrip,
    onNew: () => { location.hash = "#/new"; },
    onSettings: () => { location.hash = "#/settings"; },
  });
}

async function selectTrip(id) {
  const t = await repo.getTrip(id);
  if (t) store.loadTrip(t);
}

async function handleCreateTrip(data) {
  const days = buildDays(data.startDate, data.endDate);
  // первый день — прилёт, последний — вылет (буквы категорий уже проставлены)
  const flights = data.flights.map((f) => ({
    ...f,
    dateLabel: f.date ? formatDateRu(f.date) : "",
  }));

  const newTrip = createTrip({
    title: data.title || data.city,
    city: data.city,
    country: data.country,
    travelers: data.travelers,
    startDate: data.startDate,
    endDate: data.endDate,
    hotel: data.hotelName ? { name: data.hotelName, coords: null } : null,
    flights,
    days,
    places: [],
  });

  await repo.saveTrip(newTrip);
  await refreshTripBar();
  store.loadTrip(newTrip);
  // вернуться с страницы создания на основной вид (покажет новую поездку)
  location.hash = "";
}

/* ---------- редактор мест (добавить / изменить / удалить) ---------- */
let formCtl = null;

function closeEditor() {
  formCtl = null;
  editorEl.hidden = true;
  editorEl.innerHTML = "";
  mapApi.setClickHandler(null);
}

function openEditor(place, dayNumber) {
  const trip = store.getTrip();
  formCtl = renderPlaceForm(editorEl, {
    place,
    dayNumber: dayNumber ?? place?.dayNumber ?? (store.getActiveDay() || 1),
    days: trip.days,
    byList: byOptions(trip),
    currency: trip.currency,
    onPickCoords: () => {
      mapApi.setClickHandler((coords) => {
        if (formCtl) formCtl.setCoords(coords);
        mapApi.showDraft(coords);
      });
      document.getElementById("map").scrollIntoView({
        block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth",
      });
    },
    onSave: async (data) => {
      const { id, ...patch } = data;
      if (id) await store.updatePlace(id, patch);
      else await store.addPlace({ ...patch, source: "manual" });
      closeEditor();
    },
    onCancel: closeEditor,
    onDelete: place ? deletePlace : null,
  });
  editorEl.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
}

function startAdd(dayNumber) { openEditor(null, dayNumber); }
function startEdit(id) {
  const p = store.getTrip().places.find((x) => x.id === id);
  if (p) openEditor(p, p.dayNumber);
}

/* настройка дня (категория, начало/конец, заголовок, тема).
   Форма встраивается прямо в блок дня, где её открыли — не уезжает
   наверх к карте (карта для настройки дня не нужна). */
function startDaySettings(dayNumber) {
  const d = store.getTrip().days.find((x) => x.number === dayNumber);
  const sec = itineraryEl.querySelector(`.day-sec[data-day="${dayNumber}"]`);
  if (!d || !sec) return;
  closeEditor(); // закрыть форму места, если открыта
  itineraryEl.querySelectorAll(".day-editor").forEach((e) => e.remove());

  const host = document.createElement("div");
  host.className = "day-editor";
  sec.querySelector(".day-head").after(host);
  renderDayForm(host, {
    day: d,
    categories: store.getTrip().categories,
    // при сохранении произойдёт перерисовка — встроенная форма исчезнет сама
    onSave: (number, patch) => store.updateDay(number, patch),
    onCancel: () => host.remove(),
    onManageCategories: () => { host.remove(); location.hash = "#/settings"; },
  });
  host.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
}
async function deletePlace(id) {
  const p = store.getTrip().places.find((x) => x.id === id);
  if (p && confirm(`Удалить «${p.name}»? Это действие нельзя отменить.`)) {
    await store.removePlace(id);
    closeEditor();
  }
}

/* ---------- выбор места ---------- */
function selectPlace(placeId) {
  const place = store.getTrip().places.find((p) => p.id === placeId);
  if (!place) return;
  highlightPlace(itineraryEl, placeId);
  if (!place.coords) return; // нет точки на карте (свободное окно / без координат)
  const smooth = !reduceMotion.matches;
  document.getElementById("map").scrollIntoView({
    block: "nearest",
    behavior: smooth ? "smooth" : "auto",
  });
  mapApi.flyToPlace(place, true, smooth);
}

/* подпись под картой */
function renderCaption(trip, day) {
  if (day === 0) {
    const count = trip.places.filter((p) => p.dayNumber >= 1).length;
    capEl.innerHTML = count
      ? `🗺️ <b>Весь маршрут</b> — все ${count} мест за ${trip.days.length} дней. Нажмите день ниже, чтобы открыть его план.`
      : `🗺️ <b>Маршрут пока пуст</b> — ${trip.days.length} дней готовы к наполнению. Выберите день и добавьте места.`;
  } else {
    const d = getDay(trip, day);
    capEl.innerHTML = `${catBadge(trip, d.cat)} <b>День ${day} · ${d.title}</b> — ${d.date}. Нажмите точку на карте или в расписании.`;
  }
}

/* легенда категорий + кнопка их настройки */
function renderCatLegend(trip) {
  const badges = trip.categories.map((c) => catBadge(trip, c.key)).join("");
  catLegendEl.innerHTML = `${badges}<button type="button" class="link-btn" id="catManage">настроить категории</button>`;
  catLegendEl.querySelector("#catManage").addEventListener("click", () => {
    location.hash = "#/settings";
  });
}

/* ---------- общий рендер по состоянию ---------- */
function render(store) {
  const trip = store.getTrip();
  const day = store.getActiveDay();
  renderHero(heroEl, trip);
  renderCatLegend(trip);
  renderTabs(tabsEl, trip, day, (d) => store.setActiveDay(d));
  mapApi.update(trip, day, selectPlace);
  renderCaption(trip, day);
  renderTimeline(itineraryEl, trip, day, {
    onPlaceClick: selectPlace,
    onAdd: startAdd,
    onDaySettings: startDaySettings,
    onEdit: startEdit,
    onDelete: deletePlace,
  });
  enableDnD({
    itineraryEl, tabsEl,
    onReorder: (dayNumber, ids) => store.setDayOrder(dayNumber, ids),
    onMoveToDay: (id, dayNumber) => store.moveToDayEnd(id, dayNumber),
  });
}

store.subscribe(render);
await refreshTripBar();
render(store);
route(); // показать нужный вид по адресу (#/new открывает страницу создания)
