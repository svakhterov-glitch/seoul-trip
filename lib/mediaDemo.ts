import type { MediaItem } from '@/lib/media';

/**
 * Демо-витрина «Медиа» для Сеула: реальные места из актуальных редакционных
 * подборок трёх изданий, у каждого места — свой источник и живая ссылка на
 * материал (проверены). Координаты — геокодер Nominatim. Это фикстура для пути
 * A: даёт увидеть карточку на настоящих данных без правок бэкенда. Когда
 * заработает живой сбор (edge-функция `trends`, PLAN.md §8.3) — этот файл и
 * ветку в `fetchMediaBoard` убираем.
 *
 * Источники:
 *  - Time Out Seoul, «14 best things to do» (обновлён 18 сентября 2025)
 *  - Lonely Planet, «20 fabulous things to do in Seoul»
 *  - MICHELIN Guide Seoul & Busan 2025
 */
const SRC = {
  timeout: { source: 'Time Out Seoul', url: 'https://www.timeout.com/seoul/en/things-to-do/best-things-to-do-in-seoul', date: 'сентябрь 2025' },
  lonely: { source: 'Lonely Planet', url: 'https://www.lonelyplanet.com/articles/top-things-to-do-in-seoul', date: '' },
  michelin: { source: 'MICHELIN Guide', url: 'https://guide.michelin.com/us/en/article/michelin-guide-ceremony/the-michelin-guide-seoul-busan-2025-a-new-three-star-promotion-as-seoul-s-culinary-landscape-expands-with-korean-essence-at-its-core', date: '2025' },
} as const;

type Src = keyof typeof SRC;

interface DemoSeed {
  id: string; name: string; coords: [number, number];
  segment: string; rubric: MediaItem['rubric']; blurb: string; src: Src;
}

const SEEDS: DemoSeed[] = [
  // — Time Out Seoul —
  { id: 'demo_changdeokgung', name: 'Дворец Чхандоккун', coords: [37.5823872, 126.9917013], segment: 'sight', rubric: 'best', src: 'timeout',
    blurb: 'Дворец из списка ЮНЕСКО со знаменитым «тайным садом» — ландшафтными лужайками и павильонами.' },
  { id: 'demo_gwangjang', name: 'Рынок Кванджан', coords: [37.5697826, 127.0006548], segment: 'food', rubric: 'best', src: 'timeout',
    blurb: 'Один из старейших и крупнейших рынков Сеула: уличная еда — биндэтток, маяк-кимбап, токпокки.' },
  { id: 'demo_nseoul', name: 'Башня N Seoul Tower', coords: [37.5512692, 126.9882959], segment: 'sight', rubric: 'best', src: 'timeout',
    blurb: '480-метровая башня на горе Намсан с круговой панорамой города; наверх — лифт или канатная дорога.' },
  { id: 'demo_leeum', name: 'Музей искусств Leeum', coords: [37.5383468, 126.9989890], segment: 'museum', rubric: 'best', src: 'timeout',
    blurb: 'Музей Samsung: традиционное и современное корейское искусство в трёх архитектурно разных корпусах.' },
  { id: 'demo_commonground', name: 'Common Ground', coords: [37.5412157, 127.0656188], segment: 'shop', rubric: 'trending', src: 'timeout',
    blurb: 'Самый большой в мире молл из морских контейнеров — магазины, кафе и стрит-фуд у Konkuk University.' },
  { id: 'demo_ihwa', name: 'Деревня муралов Ихва', coords: [37.5781542, 127.0072201], segment: 'sight', rubric: 'trending', src: 'timeout',
    blurb: 'Деревня на склоне горы Наксан, оживлённая уличными муралами, с видами на город.' },
  { id: 'demo_yeonnam', name: 'Парк Кёныйсон (Йонтрал-парк)', coords: [37.5522075, 126.9353166], segment: 'nature', rubric: 'trending', src: 'timeout',
    blurb: 'Зелёная линия бывшей железной дороги в Йоннам-доне с книжной улицей и кафе.' },
  { id: 'demo_suyeonsanbang', name: 'Чайная Суёнсанбан', coords: [37.5949836, 126.9949740], segment: 'food', rubric: 'best', src: 'timeout',
    blurb: 'Традиционная чайная в бывшем доме писателя у Букхансана; летом — сезонный пингсу (шейв-айс).' },

  // — Lonely Planet —
  { id: 'demo_bukchon', name: 'Деревня Букчон Ханок', coords: [37.5823919, 126.9858648], segment: 'sight', rubric: 'best', src: 'lonely',
    blurb: 'Исторический квартал из сотен традиционных домов-ханок между дворцами Кёнбоккун и Чхандоккун.' },
  { id: 'demo_ddp', name: 'Dongdaemun Design Plaza', coords: [37.5670686, 127.0098990], segment: 'museum', rubric: 'trending', src: 'lonely',
    blurb: 'Футуристический комплекс Захи Хадид у Тондэмуна — выставки, дизайн-маркеты и ночная подсветка.' },
  { id: 'demo_lotte', name: 'Башня Lotte World Tower', coords: [37.5125537, 127.1026790], segment: 'sight', rubric: 'best', src: 'lonely',
    blurb: '555-метровый небоскрёб со смотровой Seoul Sky — одной из самых высоких в мире.' },
  { id: 'demo_cheonggyecheon', name: 'Ручей Чхонгечхон', coords: [37.5722855, 127.0367290], segment: 'nature', rubric: 'best', src: 'lonely',
    blurb: 'Восстановленный ручей через центр города — 11 км прогулочной набережной с арт-инсталляциями.' },
  { id: 'demo_hongdae', name: 'Хондэ', coords: [37.5544418, 126.9225125], segment: 'fun', rubric: 'trending', src: 'lonely',
    blurb: 'Молодёжный район у Университета Хоник: уличные музыканты, бары, клубы и арт-маркеты.' },

  // — MICHELIN Guide 2025 —
  { id: 'demo_mingles', name: 'Mingles', coords: [37.5226819, 127.0391790], segment: 'food', rubric: 'best', src: 'michelin',
    blurb: 'Три звезды Мишлен: современная корейская высокая кухня шефа Кан Мингу, сезонные сеты.' },
  { id: 'demo_seoryung', name: 'Soryeong (Пхеньянский нэнмён)', coords: [37.5585205, 126.9754518], segment: 'food', rubric: 'new', src: 'michelin',
    blurb: 'Холодная гречневая лапша по-пхеньянски — новичок категории Bib Gourmand в гиде Michelin 2025.' },
];

export const SEOUL_MEDIA_DEMO: MediaItem[] = SEEDS.map((s) => ({
  id: s.id, name: s.name, coords: s.coords, segment: s.segment, rubric: s.rubric,
  blurb: s.blurb, image: '',
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
