import { describe, it, expect } from 'vitest';
import { placeMapLinks, kakaoRouteUrl } from '@/lib/mapLinks';
import { kindColor } from '@/lib/kindColors';

describe('placeMapLinks', () => {
  it('с координатами строит точные ссылки Kakao/Google', () => {
    const l = placeMapLinks('Дворец Кёнбоккун', [37.5797, 126.9767]);
    expect(l.kakao).toContain('map.kakao.com/link/map/');
    expect(l.kakao).toContain('37.5797,126.9767');
    expect(l.google).toContain('query=37.5797,126.9767');
    expect(l.naver).toContain('map.naver.com');
  });

  it('без координат — поиск по имени во всех трёх', () => {
    const l = placeMapLinks('Кафе Onion', null);
    expect(l.kakao).toContain('map.kakao.com/?q=');
    expect(l.google).toContain('/maps/search/');
    expect(l.naver).toContain('/p/search/');
  });

  it('кодирует имя в URL', () => {
    const l = placeMapLinks('Кафе & бар', null);
    expect(l.kakao).not.toContain(' ');
    expect(l.kakao).toContain('%');
  });

  it('kakaoRouteUrl даёт ссылку-маршрут', () => {
    expect(kakaoRouteUrl('Точка', [37.5, 127.0])).toContain('map.kakao.com/link/to/');
  });
});

describe('kindColor', () => {
  it('известные типы дают свой цвет', () => {
    expect(kindColor('food')).toBe('#e8463c');
    expect(kindColor('nature')).toBe('#3fa34d');
  });
  it('неизвестный тип — нейтральный', () => {
    expect(kindColor('')).toBe('#8a93a8');
    expect(kindColor('zzz')).toBe('#8a93a8');
  });
});
