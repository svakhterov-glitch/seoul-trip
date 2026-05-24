/* ============================================================
   ТОЧКА ВХОДА
   Собирает слои: Repository → Store → UI. UI подписан на Store и
   перерисовывается при любом изменении. Здесь же — общая реакция
   на выбор места (карта + расписание).

   Слои (см. PLAN.md, раздел 2):
   UI (ui/*) → Store (store/) → Repository (data/) → Model (model/)
   ИИ-генерация — отдельным сервисом (ai/*).
   ============================================================ */

import { LocalStorageRepository } from "./data/localStorageRepo.js";
import { Store } from "./store/store.js";
import { seoulTrip } from "./model/seed.seoul.js";
import { getDay } from "./model/entities.js";
import { catBadge } from "./ui/helpers.js";
import { createMap } from "./ui/map.js";
import { renderTabs } from "./ui/calendar.js";
import { renderTimeline, highlightPlace } from "./ui/timeline.js";

/* ---------- инициализация данных ---------- */
const repo = new LocalStorageRepository();

// Пока нет редактирования из интерфейса, источник правды — файл seed.seoul.js.
// Поэтому при каждой загрузке пересохраняем поездку из файла: правки в seed
// сразу видны, а слой хранилища всё равно задействован.
// Когда появится редактирование (Этап 2), заменим на «загрузить сохранённое,
// иначе seed» + кнопку сброса.
const trip = await repo.saveTrip(seoulTrip);

const store = new Store(repo, trip);

/* ---------- UI-узлы ---------- */
const mapApi = createMap("map");
const tabsEl = document.getElementById("tabs");
const itineraryEl = document.getElementById("itinerary");
const capEl = document.getElementById("mapCap");

/* пользователь просит меньше движения? */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* выбор места: подсветить карточку, подлететь картой */
function selectPlace(placeId) {
  const place = store.getTrip().places.find((p) => p.id === placeId);
  if (!place) return;
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
    capEl.innerHTML = `🗺️ <b>Весь маршрут</b> — все ${count} мест за ${trip.days.length} дней. Нажмите день ниже, чтобы открыть его план.`;
  } else {
    const d = getDay(trip, day);
    capEl.innerHTML = `${catBadge(d.cat)} <b>День ${day} · ${d.title}</b> — ${d.date}. Нажмите точку на карте или в расписании.`;
  }
}

/* ---------- общий рендер по состоянию ---------- */
function render(store) {
  const trip = store.getTrip();
  const day = store.getActiveDay();
  renderTabs(tabsEl, trip, day, (d) => store.setActiveDay(d));
  mapApi.update(trip, day, selectPlace);
  renderCaption(trip, day);
  renderTimeline(itineraryEl, trip, day, selectPlace);
}

store.subscribe(render);
render(store);
