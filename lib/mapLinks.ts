import type { Coords } from '@/lib/entities';

/** Ссылки «открыть КАРТОЧКУ места» в трёх картах. Открываем именно карточку
 *  заведения (фото/часы/отзывы), а не голую точку — для этого ищем ПО НАЗВАНИЮ:
 *  карта находит заведение и показывает его карточку. Предпочитаем английский
 *  запрос `geo` (название + город + страна): русское имя корейские Kakao/Naver
 *  находят плохо. Координаты для Google — резерв, если текста нет совсем. */
export interface PlaceMapLinks {
  kakao: string;
  naver: string;
  google: string;
}

const enc = encodeURIComponent;

/**
 * @param name  — отображаемое имя места (может быть русским)
 * @param coords — точка (резерв для Google, если нет текстового запроса)
 * @param geo   — английский/латинизированный запрос места (название + город +
 *                страна); если есть — используем его, иначе имя.
 */
export function placeMapLinks(name: string, coords: Coords | null, geo = ''): PlaceMapLinks {
  // Запрос для поиска карточки: geo (англ.) предпочтительнее русского имени.
  const q = (geo || '').trim() || (name || '').trim();
  if (q) {
    return {
      kakao: `https://map.kakao.com/?q=${enc(q)}`,
      naver: `https://map.naver.com/p/search/${enc(q)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${enc(q)}`,
    };
  }
  // Нет ни имени, ни geo — открываем хотя бы точку (только Google умеет по коорд.).
  if (coords) {
    const [lat, lng] = coords;
    const pt = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    return { kakao: pt, naver: pt, google: pt };
  }
  const fallback = 'https://www.google.com/maps';
  return { kakao: fallback, naver: fallback, google: fallback };
}

/** Ссылка-навигация в Kakao (маршрут «до точки»). Требует координат. */
export function kakaoRouteUrl(name: string, coords: Coords): string {
  const [lat, lng] = coords;
  return `https://map.kakao.com/link/to/${enc((name || '').trim() || 'точка')},${lat},${lng}`;
}
