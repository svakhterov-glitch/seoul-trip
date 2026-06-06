import type { MediaItem } from '@/lib/media';

/**
 * Демо-витрина «Медиа» для Сеула: реальные места из актуальных редакционных
 * подборок шести изданий/рейтингов, у каждого места — свой источник и живая
 * ссылка на материал (проверены). Координаты — выверены по картам; фото
 * достопримечательностей — свободная лицензия Wikimedia Commons (у ресторанов
 * свободных фото нет — плитка показывает цвет рубрики и эмодзи). Это фикстура
 * для пути A: даёт увидеть карточку на настоящих данных без правок бэкенда.
 * Когда заработает живой сбор (edge-функция `trends`, PLAN.md §8.3) — этот файл
 * и ветку в `fetchMediaBoard` убираем.
 *
 * Источники:
 *  - Time Out Seoul, «14 best things to do» (обновлён 18 сентября 2025)
 *  - Lonely Planet, «20 fabulous things to do in Seoul»
 *  - MICHELIN Guide Seoul & Busan 2025
 *  - CatchTable (캐치테이블) — итоги года 2025: топ ресторанов по бронированиям
 *  - Asia's 50 Best Restaurants 2025 (церемония в Сеуле, 25 марта 2025)
 *  - «100 Taste of Seoul 2025» — список мэрии Сеула (60 экспертов)
 *  - MICHELIN Guide Seoul & Busan 2026 (10-летие гида, рекордные 10 новых звёзд)
 *  - Asia's 50 Best Restaurants 2026 (6 ресторанов Сеула; Mingles №4)
 *  - Seoul Cafe & Bakery Fair 2026 / LetSeoul — кафе-тренды (концепт B.E.Y.O.N.D)
 *  - Молодёжные медиа 2026: Hypebeast, TikTok/Instagram (вирусное), VisitKorea Gen-Z (핫플)
 */
const SRC = {
  timeout: { source: 'Time Out Seoul', url: 'https://www.timeout.com/seoul/en/things-to-do/best-things-to-do-in-seoul', date: 'сентябрь 2025' },
  lonely: { source: 'Lonely Planet', url: 'https://www.lonelyplanet.com/articles/top-things-to-do-in-seoul', date: '' },
  michelin: { source: 'MICHELIN Guide', url: 'https://guide.michelin.com/us/en/article/michelin-guide-ceremony/the-michelin-guide-seoul-busan-2025-a-new-three-star-promotion-as-seoul-s-culinary-landscape-expands-with-korean-essence-at-its-core', date: '2025' },
  catchtable: { source: 'CatchTable', url: 'https://www.mt.co.kr/future/2025/12/26/2025122614170384145', date: '2025' },
  asia50: { source: "Asia's 50 Best", url: 'https://www.theworlds50best.com/asia/en/the-list.html', date: '2025' },
  taste: { source: '100 Taste of Seoul', url: 'https://tasteofseoul.visitseoul.net', date: '2025' },
  michelin2026: { source: 'MICHELIN Guide 2026', url: 'https://guide.michelin.com/en/article/michelin-guide-ceremony/michelin-guide-seoul-busan-2026-highlights', date: '2026' },
  asia2026: { source: "Asia's 50 Best 2026", url: 'https://www.theworlds50best.com/asia/en/the-list.html', date: '2026' },
  cafe2026: { source: 'Seoul Cafe Trends 2026', url: 'https://letseoul.com/en/articles/seoul-spring-cafe-trends-2026-beyond', date: '2026' },
  hypebeast: { source: 'Hypebeast', url: 'https://hypebeast.com/city-feed/seoul', date: '2026' },
  genz: { source: 'VisitKorea · Gen Z', url: 'https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=187836', date: '2026' },
  social: { source: 'TikTok/Instagram (вирусное)', url: 'https://airial.travel/attractions/south-korea/seongsu-dong-cafe-street-seoul-FusHEwUT', date: '2026' },
} as const;

type Src = keyof typeof SRC;

interface DemoSeed {
  id: string; name: string; coords: [number, number];
  segment: string; rubric: MediaItem['rubric']; blurb: string; src: Src;
  image?: string;
}

const SEEDS: DemoSeed[] = [
  // — Time Out Seoul —
  { id: 'demo_changdeokgung', name: 'Дворец Чхандоккун', coords: [37.5823872, 126.9917013], segment: 'sight', rubric: 'best', src: 'timeout',
    blurb: 'Дворец из списка ЮНЕСКО со знаменитым «тайным садом» — ландшафтными лужайками и павильонами.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Exterior_front_view_of_Daejojeon_Hall_of_Changdeokgung_Palace_with_blue_sky_in_Seoul.jpg' },
  { id: 'demo_gwangjang', name: 'Рынок Кванджан', coords: [37.5697826, 127.0006548], segment: 'food', rubric: 'best', src: 'timeout',
    blurb: 'Один из старейших и крупнейших рынков Сеула: уличная еда — биндэтток, маяк-кимбап, токпокки.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Gwangjang_Market%2C_Seoul_01.jpg' },
  { id: 'demo_nseoul', name: 'Башня N Seoul Tower', coords: [37.5512692, 126.9882959], segment: 'sight', rubric: 'best', src: 'timeout',
    blurb: '480-метровая башня на горе Намсан с круговой панорамой города; наверх — лифт или канатная дорога.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/N_Seoul_Tower_view_2.jpg' },
  { id: 'demo_leeum', name: 'Музей искусств Leeum', coords: [37.5383468, 126.9989890], segment: 'museum', rubric: 'best', src: 'timeout',
    blurb: 'Музей Samsung: традиционное и современное корейское искусство в трёх архитектурно разных корпусах.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c4/Leeum%2C_Samsung_Museum_of_Art.jpg' },
  { id: 'demo_commonground', name: 'Common Ground', coords: [37.5412157, 127.0656188], segment: 'shop', rubric: 'trending', src: 'timeout',
    blurb: 'Самый большой в мире молл из морских контейнеров — магазины, кафе и стрит-фуд у Konkuk University.' },
  { id: 'demo_ihwa', name: 'Деревня муралов Ихва', coords: [37.5781542, 127.0072201], segment: 'sight', rubric: 'trending', src: 'timeout',
    blurb: 'Деревня на склоне горы Наксан, оживлённая уличными муралами, с видами на город.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Ihwa_Mural_Village_10.jpg' },
  { id: 'demo_yeonnam', name: 'Парк Кёныйсон (Йонтрал-парк)', coords: [37.5522075, 126.9353166], segment: 'nature', rubric: 'trending', src: 'timeout',
    blurb: 'Зелёная линия бывшей железной дороги в Йоннам-доне с книжной улицей и кафе.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Gyeonguiseon_Forest_Trail_Park_and_Ttaeng-ttaeng_Street_in_Seoul_%28near_Hongdae%2C_1%29.jpg' },
  { id: 'demo_suyeonsanbang', name: 'Чайная Суёнсанбан', coords: [37.5949836, 126.9949740], segment: 'food', rubric: 'best', src: 'timeout',
    blurb: 'Традиционная чайная в бывшем доме писателя у Букхансана; летом — сезонный пингсу (шейв-айс).' },

  // — Lonely Planet —
  { id: 'demo_bukchon', name: 'Деревня Букчон Ханок', coords: [37.5823919, 126.9858648], segment: 'sight', rubric: 'best', src: 'lonely',
    blurb: 'Исторический квартал из сотен традиционных домов-ханок между дворцами Кёнбоккун и Чхандоккун.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Bukchon-ro_11-gil_street_with_hanok_houses_and_blue_sky_in_Bukchon_Hanok_Village_Seoul.jpg' },
  { id: 'demo_ddp', name: 'Dongdaemun Design Plaza', coords: [37.5670686, 127.0098990], segment: 'museum', rubric: 'trending', src: 'lonely',
    blurb: 'Футуристический комплекс Захи Хадид у Тондэмуна — выставки, дизайн-маркеты и ночная подсветка.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Dongdaemun_Design_Plaza_at_night%2C_Seoul%2C_Korea.jpg' },
  { id: 'demo_lotte', name: 'Башня Lotte World Tower', coords: [37.5125537, 127.1026790], segment: 'sight', rubric: 'best', src: 'lonely',
    blurb: '555-метровый небоскрёб со смотровой Seoul Sky — одной из самых высоких в мире.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Lotte_World_Tower_near_Cheongdam_Bridge.jpg' },
  { id: 'demo_cheonggyecheon', name: 'Ручей Чхонгечхон', coords: [37.5722855, 127.0367290], segment: 'nature', rubric: 'best', src: 'lonely',
    blurb: 'Восстановленный ручей через центр города — 11 км прогулочной набережной с арт-инсталляциями.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Cheonggyecheon_evening_2.jpg' },
  { id: 'demo_hongdae', name: 'Хондэ', coords: [37.5544418, 126.9225125], segment: 'fun', rubric: 'trending', src: 'lonely',
    blurb: 'Молодёжный район у Университета Хоник: уличные музыканты, бары, клубы и арт-маркеты.',
    image: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Hongdae_2.jpg' },

  // — MICHELIN Guide 2025 —
  { id: 'demo_mingles', name: 'Mingles', coords: [37.5226819, 127.0391790], segment: 'food', rubric: 'best', src: 'asia2026',
    blurb: '№4 в Asia’s 50 Best 2026 — лучший результат корейского ресторана за всё время; современная высокая кухня шефа Кан Мингу.' },
  { id: 'demo_seoryung', name: 'Soryeong (Пхеньянский нэнмён)', coords: [37.5585205, 126.9754518], segment: 'food', rubric: 'new', src: 'michelin',
    blurb: 'Холодная гречневая лапша по-пхеньянски — новичок категории Bib Gourmand в гиде Michelin 2025.' },

  // — CatchTable, итоги 2025 (топ по бронированиям и ожиданию) —
  { id: 'demo_mongtan', name: 'Монтан (Mongtan)', coords: [37.5359768, 126.9722366], segment: 'food', rubric: 'trending', src: 'catchtable',
    blurb: 'Корейское барбекю в Ёнсане: культовые рёбра удэгальби на соломенном огне — 1-е место CatchTable по бронированиям.' },
  { id: 'demo_cucciolo', name: 'Кучолло Сеул (Cucciolo)', coords: [37.5291771, 126.9684462], segment: 'food', rubric: 'trending', src: 'catchtable',
    blurb: 'Итальянская остерия шефа Ким Чжиуна в штаб-квартире Amorepacific — 5-е место рейтинга CatchTable 2025.' },
  { id: 'demo_gouga', name: 'Гоуга Йоыйдо (омакасе)', coords: [37.5221722, 126.9199288], segment: 'food', rubric: 'best', src: 'catchtable',
    blurb: 'Омакасе из корейской говядины ханусо в башне FKI на Ёыйдо — фаворит гурманов CatchTable.' },
  { id: 'demo_sowana', name: 'Сована Ханнам (омакасе)', coords: [37.5356051, 127.0010459], segment: 'food', rubric: 'trending', src: 'catchtable',
    blurb: 'Доступный омакасе из корейской говядины в Ханнаме — на слуху по бронированиям CatchTable.' },
  { id: 'demo_swaniye', name: 'Сванийе (Soigné)', coords: [37.5199865, 127.0190472], segment: 'food', rubric: 'best', src: 'catchtable',
    blurb: 'Две звезды Мишлен шефа Ли Чжуна у станции Синса — современная авторская кухня.' },
  { id: 'demo_jungsik', name: 'Чонсиктан (Jungsik)', coords: [37.5256335, 127.0411060], segment: 'food', rubric: 'best', src: 'catchtable',
    blurb: 'Две звезды Мишлен в Чхондаме — новая корейская высокая кухня шефа Лим Чжонсика.' },

  // — Asia's 50 Best Restaurants 2025 (сеульские из списка) —
  { id: 'demo_onjium', name: 'Onjium (Онджиым)', coords: [37.5806, 126.9742], segment: 'food', rubric: 'best', src: 'asia2026',
    blurb: 'Реконструкция придворной корейской кухни напротив дворца Кёнбоккун — №14 в Asia’s 50 Best 2026; шеф Чо Ынхи названа лучшим шеф-женщиной Азии.' },
  { id: 'demo_eatanic', name: 'Eatanic Garden', coords: [37.5030, 127.0415], segment: 'food', rubric: 'best', src: 'asia2026',
    blurb: 'Современная корейская кухня шефа Сон Чжонвона на верхнем этаже отеля Josun Palace — №26 в Asia’s 50 Best 2026.' },
  { id: 'demo_mosu', name: 'Mosu Seoul (Мосу)', coords: [37.5411532, 126.9961548], segment: 'food', rubric: 'best', src: 'asia2026',
    blurb: 'Три звезды Мишлен: авторская корейская кухня шефа Ан Сонджэ в Ханнам-доне — №41 в Asia’s 50 Best 2026.' },

  // — 100 Taste of Seoul 2025 (мэрия Сеула) —
  { id: 'demo_balwoo', name: 'Balwoo Gongyang (Балу Конъян)', coords: [37.5746, 126.9816], segment: 'food', rubric: 'best', src: 'taste',
    blurb: 'Храмовая кухня у ворот Чогеса: вегетарианские сеты по буддийским канонам, звезда Мишлен.' },

  // — MICHELIN Guide Seoul & Busan 2026 (10-летие гида, рекордные 10 новых звёзд) —
  { id: 'demo_mitou', name: 'Mitou (Митоу)', coords: [37.5258563716046, 127.044921119762], segment: 'food', rubric: 'new', src: 'michelin2026',
    blurb: 'Новые 2 звезды Michelin 2026 и «зелёная звезда»: сезонная кухня с минимумом отходов и продуктами семейной фермы под Чонджу.' },
  { id: 'demo_gosari', name: 'Gosari Express (Госари Экспресс)', coords: [37.5662676217473, 127.020008547897], segment: 'food', rubric: 'new', src: 'michelin2026',
    blurb: 'Bib Gourmand 2026 и «зелёная звезда»: доступная корейская еда с экологичным подходом.' },

  // — Кафе-тренды 2026 (Seoul Cafe & Bakery Fair, концепт B.E.Y.O.N.D) —
  { id: 'demo_glow', name: 'Glow (Сонсу)', coords: [37.54550076140227, 127.04283608118138], segment: 'food', rubric: 'trending', src: 'cafe2026',
    blurb: 'Кафе-тренд 2026 в Сонсу: 200 мест, из них 140 — на двухъярусной деревянной террасе с живыми деревьями.' },
  { id: 'demo_artistbakery', name: 'Artist Bakery (Ангук)', coords: [37.5764071801326, 126.984358455132], segment: 'food', rubric: 'trending', src: 'cafe2026',
    blurb: 'Хит выпечки 2026 у станции Ангук: соль-брэд и багет-сэндвичи; очереди даже в будни.' },

  // — Молодёжные медиа: Hypebeast, TikTok/Instagram, Gen-Z 핫플 (2026) —
  { id: 'demo_kith', name: 'Kith Seoul (Сонсу)', coords: [37.5411274489245, 127.047198971706], segment: 'shop', rubric: 'trending', src: 'hypebeast',
    blurb: '4-этажный флагман Kith в Сонсу: стритвир, сникеры и лайфстайл — вирусный среди молодёжи.' },
  { id: 'demo_blueelephant', name: 'Blue Elephant Seongsu', coords: [37.5475641895409, 127.04244685499], segment: 'shop', rubric: 'new', src: 'social',
    blurb: 'Иммерсивный оптик-флагман на 1000 пхён (открыт в конце 2025) — хит TikTok и Instagram.' },
  { id: 'demo_thisisneverthat', name: 'thisisneverthat (флагман)', coords: [37.54333450600984, 127.06172381152828], segment: 'shop', rubric: 'trending', src: 'hypebeast',
    blurb: 'Флагман корейского стритвир-бренда: типографика и влияние 90-х/2000-х, любимый K-pop и рэп-сценой.' },
  { id: 'demo_nudake_tea', name: 'NUDAKE Tea House (Хаус Досан)', coords: [37.5253657755817, 127.035680539267], segment: 'food', rubric: 'trending', src: 'social',
    blurb: 'Чайный дом NUDAKE: «scented tea» и молекулярные десерты на «неземных» столах — вирусная фуд-эстетика.' },
  { id: 'demo_sindang', name: 'Сындан-дон («Хипдандон»)', coords: [37.5630320348009, 127.014609897994], segment: 'fun', rubric: 'trending', src: 'genz',
    blurb: 'Старые переулки Сындана с хип-барами, кафе и токпокки-тауном — ретро-район нового поколения.' },
];

export const SEOUL_MEDIA_DEMO: MediaItem[] = SEEDS.map((s) => ({
  id: s.id, name: s.name, coords: s.coords, segment: s.segment, rubric: s.rubric,
  blurb: s.blurb, image: s.image ?? '',
  source: SRC[s.src].source, sourceUrl: SRC[s.src].url, sourceDate: SRC[s.src].date,
}));

const DEMO_CITIES = ['сеул', 'seoul'];

/**
 * Демо-доска «Медиа» для города, если он из набора (Сеул) — иначе `null`, и
 * `fetchMediaBoard` идёт обычным путём (edge-функция `trends`). Сопоставление по
 * вхождению, чтобы сработало и для «Сеул, Южная Корея».
 */
export function demoMediaFor(city: string): MediaItem[] | null {
  const c = (city || '').trim().toLowerCase();
  return DEMO_CITIES.some((d) => c.includes(d)) ? SEOUL_MEDIA_DEMO : null;
}
