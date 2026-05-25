/* ============================================================
   РЕАЛИЗАЦИЯ ХРАНИЛИЩА НА localStorage
   Данные живут в браузере пользователя. Методы async намеренно —
   чтобы при замене на сетевой SupabaseRepository код-потребитель
   не пришлось менять.
   ============================================================ */

import { Repository } from "./repository.js";
import { createTrip } from "../model/entities.js";

const KEY = "seoul-trip:trips"; // { [id]: tripData }

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(KEY, JSON.stringify(map));
}

export class LocalStorageRepository extends Repository {
  async listTrips() {
    return Object.values(readAll()).map(createTrip);
  }

  async getTrip(id) {
    const data = readAll()[id];
    return data ? createTrip(data) : null;
  }

  async saveTrip(trip) {
    const map = readAll();
    map[trip.id] = trip;
    writeAll(map);
    return createTrip(trip);
  }

  async deleteTrip(id) {
    const map = readAll();
    delete map[id];
    writeAll(map);
  }
}
