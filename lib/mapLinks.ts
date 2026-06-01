import type { Coords } from '@/lib/entities';

/** Ссылки «открыть место» в трёх картах. Имена мест русские, поэтому при наличии
 *  координат строим точные ссылки по точке (Kakao/Google), иначе — поиск по имени.
 *  Naver web не даёт чистой ссылки-по-точке с меткой — всегда поиск по имени. */
export interface PlaceMapLinks {
  kakao: string;
  naver: string;
  google: string;
}

const enc = encodeURIComponent;

export function placeMapLinks(name: string, coords: Coords | null): PlaceMapLinks {
  const n = (name || '').trim() || 'место';
  if (coords) {
    const [lat, lng] = coords;
    return {
      // Kakao: метка с подписью в точке.
      kakao: `https://map.kakao.com/link/map/${enc(n)},${lat},${lng}`,
      // Naver: поиск по имени (нет стабильной web-ссылки по точке с меткой).
      naver: `https://map.naver.com/p/search/${enc(n)}`,
      // Google: точка по координатам.
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    };
  }
  return {
    kakao: `https://map.kakao.com/?q=${enc(n)}`,
    naver: `https://map.naver.com/p/search/${enc(n)}`,
    google: `https://www.google.com/maps/search/?api=1&query=${enc(n)}`,
  };
}

/** Ссылка-навигация в Kakao (маршрут «до точки»). Требует координат. */
export function kakaoRouteUrl(name: string, coords: Coords): string {
  const [lat, lng] = coords;
  return `https://map.kakao.com/link/to/${enc((name || '').trim() || 'точка')},${lat},${lng}`;
}
