#!/usr/bin/env python3
# Сборка доски «Мишлен» для Сеула → lib/michelinDemo.ts
#
# Вход:
#   .tmp/michelin_records.json — универсум заведений со скриншотов гида:
#       [{"name": "...", "cuisine": "..."}]  (отличие НЕ отсюда — оно ненадёжно с пикселей)
#   .tmp/michelin_official.json — официальные списки гида:
#       {"star3": [...], "star2": [...], "star1": [...], "bib": [...]}
# Логика: отличие берём из ОФИЦИАЛЬНОГО списка (надёжно), иначе — "plate" (Selected).
# Геокодим через задеплоенную edge-функцию geocode (Kakao, фолбэк Nominatim).
import json, os, re, urllib.request, time, unicodedata

URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
ANON = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

records = json.load(open(".tmp/michelin_records.json"))
official = json.load(open(".tmp/michelin_official.json"))

def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s.lower())

# Карта нормализованное-имя → звёздность из ОФИЦИАЛЬНОГО списка (2★/3★ полные и
# авторитетные; 1★ — почти полный). Bib официально неполный — берём со скриншотов.
off = {}
for key in ("star3", "star2", "star1"):
    for nm in official.get(key, []):
        off.setdefault(norm(nm), key)

def decide(n, sdist):
    # 1) официальные звёзды — авторитет (перекрывают скриншот);
    if n in off:
        return off[n]
    # 2) скриншот уверенно видит звезду, но это не офиц. 2★/3★ → значит 1★
    #    (список 2★/3★ полный; недостающие 1★ так и доберём со скриншотов);
    if sdist in ("star1", "star2", "star3"):
        return "star1"
    # 3) Bib — надёжно читается со скриншота (лицо Bibendum); иначе Selected.
    if sdist == "bib":
        return "bib"
    return "plate"

def slug(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or "x"

RANK = {"star3": 0, "star2": 1, "star1": 2, "bib": 3, "plate": 4}
def price_band(d):
    return {"star3": "₩₩₩₩", "star2": "₩₩₩₩", "star1": "₩₩₩", "plate": "₩₩", "bib": "₩"}[d]

# Дедуп по нормализованному имени; собираем заведения.
seen = {}
items = []
for r in records:
    name = (r.get("name") or "").strip()
    if not name:
        continue
    n = norm(name)
    if n in seen:
        continue
    seen[n] = True
    dist = decide(n, r.get("sdist", "plate"))
    items.append({
        "name": name,
        "cuisine": (r.get("cuisine") or "").strip(),
        "distinction": dist,
        # Kakao keyword search находит заведения по «Имя Seoul», но НЕ по
        # «Имя, Seoul, South Korea» (ищет строку буквально). Эта же строка идёт
        # в ссылку Naver Map.
        "geo": f"{name} Seoul",
    })

# Контроль: сколько в каждой категории + какие официальные звёзды не попали в универсум.
present = set(seen.keys())
missing = {k: [nm for nm in official.get(k, []) if norm(nm) not in present] for k in ("star3", "star2", "star1")}
print("заведений:", len(items))
for k in ("star3", "star2", "star1", "bib", "plate"):
    got = sum(1 for it in items if it["distinction"] == k)
    extra = f"; офиц. нет в скриншотах: {missing[k]}" if k in missing and missing[k] else ""
    print(f"  {k}: {got}{extra}")

# Геокодинг батчами по 40.
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
            print("geocode error:", e); coords = [None]*len(chunk)
        coords += [None]*(len(chunk)-len(coords))
        out += coords[:len(chunk)]
        time.sleep(0.3)
    return out

def in_korea(c):
    return bool(c) and isinstance(c, list) and len(c) == 2 and 33 <= c[0] <= 39 and 124 <= c[1] <= 132

coords = geocode([it["geo"] for it in items])
for it, c in zip(items, coords):
    it["coords"] = [round(c[0], 6), round(c[1], 6)] if in_korea(c) else None

# Ретрай не найденных: по чистому имени (без «Seoul») — иногда Kakao так находит.
miss = [it for it in items if not it["coords"]]
if miss:
    rc = geocode([it["name"] for it in miss])
    for it, c in zip(miss, rc):
        if in_korea(c):
            it["coords"] = [round(c[0], 6), round(c[1], 6)]

hit = sum(1 for it in items if it["coords"])
print(f"координаты в Корее: {hit}/{len(items)}")

# Сортировка: звёзды → Bib → Selected, внутри — по имени.
items.sort(key=lambda it: (RANK[it["distinction"]], it["name"].lower()))

# Генерация lib/michelinDemo.ts.
def esc(s):
    return (s or "").replace("\\", "\\\\").replace("'", "\\'")

lines = []
for it in items:
    co = "null" if not it["coords"] else f'[{it["coords"][0]}, {it["coords"][1]}]'
    lines.append(
        f"  {{ id: 'mich_{slug(it['name'])}', name: '{esc(it['name'])}', coords: {co}, "
        f"cuisine: '{esc(it['cuisine'])}', distinction: '{it['distinction']}', "
        f"price: '{price_band(it['distinction'])}', geo: '{esc(it['geo'])}' }},"
    )

ts = (
"import type { MichelinItem } from '@/lib/michelin';\n\n"
"/**\n"
" * Демо-доска «Мишлен» для Сеула: рестораны гида MICHELIN. Названия и кухня —\n"
" * со скриншотов списка гида (предоставлены пользователем); отличие (звёзды /\n"
" * Bib Gourmand) сверено с официальным списком гида, остальные — «Selected».\n"
" * Координаты — геокодер Kakao (не найденные → coords:null: в списке есть, на\n"
" * карте нет). Фикстура (как `mediaDemo`). СГЕНЕРИРОВАНО scripts/build_michelin.py.\n"
" */\n"
"export const SEOUL_MICHELIN_DEMO: MichelinItem[] = [\n"
+ "\n".join(lines) + "\n];\n\n"
"const DEMO_CITIES = ['сеул', 'seoul'];\n\n"
"/** Демо-доска «Мишлен» для города из набора (Сеул), иначе пустой список. */\n"
"export function demoMichelinFor(city: string): MichelinItem[] {\n"
"  const c = (city || '').trim().toLowerCase();\n"
"  return DEMO_CITIES.some((d) => c.includes(d)) ? SEOUL_MICHELIN_DEMO : [];\n"
"}\n"
)
open("lib/michelinDemo.ts", "w").write(ts)
print("→ lib/michelinDemo.ts записан, заведений:", len(items))
