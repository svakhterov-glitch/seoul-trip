#!/usr/bin/env python3
# Конвертер: docs/seoul-route-2026.json → TripDoc (data) поездки 'seoul'.
# Геокодит места через задеплоенную edge-функцию geocode. Пишет .tmp/seoul_new.json.
import json, os, re, urllib.request, time

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
ANON = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

route = json.load(open("docs/seoul-route-2026.json"))
data = json.load(open(".tmp/seoul_data.json"))

def geocode(queries):
    out = []
    for i in range(0, len(queries), 40):
        chunk = queries[i:i+40]
        body = json.dumps({"queries": chunk}).encode()
        req = urllib.request.Request(URL + "/functions/v1/geocode", data=body,
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + ANON, "apikey": ANON})
        try:
            r = json.loads(urllib.request.urlopen(req, timeout=60).read())
            coords = r.get("coords", [])
        except Exception as e:
            print("geocode chunk error:", e); coords = [None]*len(chunk)
        coords += [None]*(len(chunk)-len(coords))
        out += coords[:len(chunk)]
        time.sleep(0.3)
    return out

def in_korea(c):
    return bool(c) and isinstance(c, list) and len(c) == 2 and 33 <= c[0] <= 39 and 124 <= c[1] <= 132

def kind_of(cat):
    c = (cat or "").lower()
    if re.search(r"bar|brew|gastropub", c): return "bar"
    if re.search(r"coffee|cafe|brunch|restaurant|food|breakfast|market", c): return "food" if "market" not in c else "shop"
    if re.search(r"museum", c): return "museum"
    if re.search(r"park|nature|hik|trail|summit|forest|mountain|sacred", c): return "nature"
    if re.search(r"shop|store|fashion|retail|department|high-street|district", c): return "shop"
    if re.search(r"transfer|hotel|logistics", c): return "other"
    if re.search(r"viewpoint|landmark", c): return "sight"
    return "sight"

def price_of(krw):
    n = 0
    m = re.search(r"\d[\d\s]*", str(krw or ""))
    if m: n = int(re.sub(r"\D", "", m.group()))
    if n == 0: return "free"
    if n < 30000: return 1
    if n <= 80000: return 2
    return 3

_id = [0]
def nid(p):
    _id[0] += 1
    return f"{p}_seoul_{_id[0]}"

def checklist(texts):
    items = []
    for t in texts:
        t = (t or "").strip()
        if t: items.append({"id": nid("chk"), "text": t, "done": False})
    return items

CAT = {1:"start",2:"tour",3:"tour",4:"trend",5:"dist",6:"nature",7:"shop",8:"final"}

places = []
geo_queries = []   # параллельно местам — что геокодить

def add_place(day, order, name, geo, desc, kind, price, note, district, by, time_s, chk):
    places.append({
        "id": nid("place"), "dayNumber": day, "order": order, "name": name,
        "coords": None, "time": time_s or "", "desc": desc or "", "price": price,
        "image": "", "by": by or "TripsPlan", "kind": kind or "sight", "note": note or "",
        "photo": "📍", "source": "ai", "sourceUrl": "", "sourceDate": "", "seasonNote": "",
        "district": district or "", "geo": geo or "", "locked": False, "checklist": chk or [],
    })
    geo_queries.append(geo or (name + ", Seoul, South Korea"))

for d in route["days"]:
    dn = d["day_number"]; order = 0
    seen = set()
    # карточки мест
    for tb in d.get("time_blocks", []):
        pc = tb.get("place_card", {})
        name = (pc.get("card_title") or pc.get("place_name") or "").strip()
        if not name: continue
        seen.add(name.lower())
        note_bits = []
        if pc.get("budget_krw"): note_bits.append(f"Бюджет ~{pc['budget_krw']} KRW")
        if pc.get("booking_needed") and pc["booking_needed"] not in ("нет",): note_bits.append(f"Бронь: {pc['booking_needed']}")
        if pc.get("best_time_for_photo") and pc["best_time_for_photo"] != "—": note_bits.append(f"Фото: {pc['best_time_for_photo']}")
        add_place(dn, order, name, pc.get("google_maps_query"), pc.get("card_description"),
                  kind_of(pc.get("category")), price_of(pc.get("budget_krw")), " · ".join(note_bits),
                  pc.get("area"), "TripsPlan", pc.get("visit_time"), [])
        order += 1
    # ресторан дня
    mf = (d.get("michelin_food") or {}).get("main") or {}
    rn = (mf.get("name") or "").strip()
    if rn and not re.search(r"без michelin|заменить локальн|n/a", rn.lower()):
        clean = re.sub(r"\s*\(.*?\)\s*", "", rn).strip()
        note = []
        if mf.get("budget_for_two_krw"): note.append(f"На двоих ~{mf['budget_for_two_krw']} KRW")
        if mf.get("reservation_needed"): note.append(f"Бронь: {mf['reservation_needed']}")
        if mf.get("queue_risk"): note.append(f"Очередь: {mf['queue_risk']}")
        chk = checklist(re.split(r"[;,]| и ", mf.get("what_to_order", "")))
        add_place(dn, order, "🍽 " + clean, mf.get("google_maps_query"),
                  (mf.get("why_it_fits") or "") , "food", price_of(mf.get("budget_for_two_krw")),
                  " · ".join(note), mf.get("area"), mf.get("category", "Bib Gourmand"), "", chk)
        order += 1
    # шопинг-карточки (без дублей по названию)
    for sf in d.get("shopping_focus", []) or []:
        nm = (sf.get("recommended_place") or "").strip()
        if not nm or nm.lower() in seen: continue
        seen.add(nm.lower())
        chk = checklist(sf.get("brands_to_check", []))
        desc = (sf.get("shopping_category", "") + ". Искать: " + ", ".join(sf.get("brands_to_check", []))).strip(". ")
        note = sf.get("tax_free_note", "")
        add_place(dn, order, "🛍 " + nm, sf.get("google_maps_query"), desc, "shop", None, note,
                  "", "Шопинг", "", chk)
        order += 1

print(f"мест собрано: {len(places)}; геокожу…")
coords = geocode(geo_queries)
for p, c in zip(places, coords):
    if in_korea(c):
        p["coords"] = [round(c[0], 6), round(c[1], 6)]

# Ретрай не найденных: чистые корейские/короткие запросы (Kakao их находит лучше).
RETRY = {
    "Myeongdong Kyoja": "명동교자 본점", "первый заход": "올리브영 명동타운",
    "Olive Young Myeongdong Flagship": "올리브영 명동타운", "Последний заход в Olive Young": "올리브영 명동타운",
    "Namdaemun Market": "남대문시장", "Хондэ": "홍익대학교", "Сонбави": "인왕산 선바위",
    "Гребень стены": "인왕산", "Старт на Инвансан": "사직공원", "Jaha Son Mandu": "자하손만두",
    "LCDC": "성수동", "Завтрак у отеля": "명동", "Дорога в Инчхон": "서울역",
    "Apgujeong концепт": "갤러리아 압구정", "Mangwon": "망원시장",
}
miss = [p for p in places if not p["coords"]]
rq = []
for p in miss:
    q = next((v for k, v in RETRY.items() if k.lower() in p["name"].lower()), None)
    rq.append(q or (p["geo"] or p["name"]))
rc = geocode(rq)
for p, c in zip(miss, rc):
    if in_korea(c):
        p["coords"] = [round(c[0], 6), round(c[1], 6)]

# Жёсткий фолбэк (приблизительные координаты известных ориентиров) — для оставшихся.
HARD = {
    "Inwangsan": [37.5840, 126.9588], "Сонбави": [37.5817, 126.9602], "Старт на Инвансан": [37.5760, 126.9655],
    "Mapo Bib": [37.5556, 126.9024], "Apgujeong концепт": [37.5274, 127.0388],
    "Завтрак у отеля": [37.5620, 126.9855],
}
for p in places:
    if not p["coords"]:
        for k, c in HARD.items():
            if k.lower() in p["name"].lower():
                p["coords"] = c; break
kept = sum(1 for p in places if p["coords"])
print(f"координаты в Корее: {kept}/{len(places)}")

# отель
hcoords = geocode(["Stanford Hotel Myeongdong Seoul"])[0]
hotels = [{
    "id": nid("hotel"), "name": "Stanford Hotel Myeongdong",
    "coords": [round(hcoords[0], 6), round(hcoords[1], 6)] if in_korea(hcoords) else None,
    "checkIn": "2026-06-08", "checkOut": "2026-06-15",
}]

# дни: заголовки/подзаголовки/категория
rby = {d["day_number"]: d for d in route["days"]}
for day in data["days"]:
    n = day.get("number")
    rd = rby.get(n)
    if rd:
        day["title"] = rd["day_title"]
        day["sub"] = rd["day_subtitle"]
        day["cat"] = CAT.get(n, day.get("cat", "tour"))

# категория 'nature', если нет
cats = data.get("categories", [])
if not any(c.get("key") == "nature" for c in cats):
    cats.append({"key": "nature", "label": "Природа", "color": "#3fa34d"})
data["categories"] = cats

data["places"] = places
data["hotels"] = hotels

json.dump(data, open(".tmp/seoul_new.json", "w"), ensure_ascii=False)
print("готово → .tmp/seoul_new.json | дней:", len(data["days"]), "мест:", len(places), "отелей:", len(hotels))
