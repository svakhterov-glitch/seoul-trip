import type { MediaItem } from '@/lib/media';

/**
 * Демо-витрина «Медиа» для Сеула: реальные места из актуального списка
 * Time Out Seoul (обновлён 18 сентября 2025), координаты — геокодер Nominatim,
 * ссылка на источник — живая (проверена). Это фикстура для пути A: даёт увидеть
 * карточку на настоящих данных без правок бэкенда. Когда заработает живой сбор
 * (edge-функция `trends`, PLAN.md §8.3) — этот файл и ветку в `fetchMediaBoard`
 * убираем.
 */
const TIME_OUT_2025 = 'https://www.timeout.com/seoul/en/things-to-do/best-things-to-do-in-seoul';
const TIME_OUT = 'Time Out Seoul';
const DATE = 'сентябрь 2025';

export const SEOUL_MEDIA_DEMO: MediaItem[] = [
  {
    id: 'demo_changdeokgung', name: 'Дворец Чхандоккун', coords: [37.5823872, 126.9917013],
    segment: 'sight', rubric: 'best',
    blurb: 'Дворец из списка ЮНЕСКО со знаменитым «тайным садом» — ландшафтными лужайками и павильонами.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_gwangjang', name: 'Рынок Кванджан', coords: [37.5697826, 127.0006548],
    segment: 'food', rubric: 'best',
    blurb: 'Один из старейших и крупнейших рынков Сеула: уличная еда — биндэтток, маяк-кимбап, токпокки.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_nseoul', name: 'Башня N Seoul Tower', coords: [37.5512692, 126.9882959],
    segment: 'sight', rubric: 'best',
    blurb: '480-метровая башня на горе Намсан с круговой панорамой города; наверх — лифт или канатная дорога.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_leeum', name: 'Музей искусств Leeum', coords: [37.5383468, 126.9989890],
    segment: 'museum', rubric: 'best',
    blurb: 'Музей Samsung: традиционное и современное корейское искусство в трёх архитектурно разных корпусах.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_commonground', name: 'Common Ground', coords: [37.5412157, 127.0656188],
    segment: 'shop', rubric: 'trending',
    blurb: 'Самый большой в мире молл из морских контейнеров — магазины, кафе и стрит-фуд у Konkuk University.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_ihwa', name: 'Деревня муралов Ихва', coords: [37.5781542, 127.0072201],
    segment: 'sight', rubric: 'trending',
    blurb: 'Деревня на склоне горы Наксан, оживлённая уличными муралами, с видами на город.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_yeonnam', name: 'Парк Кёныйсон (Йонтрал-парк)', coords: [37.5522075, 126.9353166],
    segment: 'nature', rubric: 'trending',
    blurb: 'Зелёная линия бывшей железной дороги в Йоннам-доне с книжной улицей и кафе.',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
  {
    id: 'demo_suyeonsanbang', name: 'Чайная Суёнсанбан', coords: [37.5949836, 126.9949740],
    segment: 'food', rubric: 'best',
    blurb: 'Традиционная чайная в бывшем доме писателя у Букхансана; летом — сезонный пингсу (шейв-айс).',
    image: '', source: TIME_OUT, sourceUrl: TIME_OUT_2025, sourceDate: DATE,
  },
];

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
