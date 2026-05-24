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
import { getDay, createTrip } from "./model/entities.js";
import { buildDays, formatDateRu } from "./model/days.js";
import { catBadge } from "./ui/helpers.js";
import { renderHero } from "./ui/hero.js";
import { renderTripBar } from "./ui/tripBar.js";
import { renderTripFormPage } from "./ui/tripForm.js";
import { createMap } from "./ui/map.js";
import { renderTabs } from "./ui/calendar.js";
import { renderTimeline, highlightPlace } from "./ui/timeline.js";

/* ---------- инициализация данных ---------- */
const repo = new LocalStorageRepository();

// Источник правды для готового Сеула — файл seed.seoul.js: пересохраняем его
// при каждой загрузке (правки в seed сразу видны). Поездки, созданные
// пользователем, хранятся отдельными ключами и при этом не теряются.
// При открытии показываем именно Сеул (решение по стартовому экрану).
const trip = await repo.saveTrip(seoulTrip);
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

/* пользователь просит меньше движения? */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- маршрутизация между видами ---------- */
function route() {
  if (location.hash === "#/new") {
    viewApp.hidden = true;
    viewPage.hidden = false;
    renderTripFormPage(viewPage, {
      onCreate: handleCreateTrip,
      onCancel: () => history.back(),
    });
    window.scrollTo(0, 0);
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

/* ---------- выбор места ---------- */
function selectPlace(placeId) {
  const place = store.getTrip().places.find((p) => p.id === placeId);
  if (!place || !place.coords) return;
  highlightPlace(itineraryEl, placeId);
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
    capEl.innerHTML = `${catBadge(d.cat)} <b>День ${day} · ${d.title}</b> — ${d.date}. Нажмите точку на карте или в расписании.`;
  }
}

/* ---------- общий рендер по состоянию ---------- */
function render(store) {
  const trip = store.getTrip();
  const day = store.getActiveDay();
  renderHero(heroEl, trip);
  renderTabs(tabsEl, trip, day, (d) => store.setActiveDay(d));
  mapApi.update(trip, day, selectPlace);
  renderCaption(trip, day);
  renderTimeline(itineraryEl, trip, day, selectPlace);
}

store.subscribe(render);
await refreshTripBar();
render(store);
route(); // показать нужный вид по адресу (#/new открывает страницу создания)
