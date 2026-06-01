import { describe, it, expect } from 'vitest';
import { placeMapLinks, kakaoRouteUrl, isMapLink } from '@/lib/mapLinks';
import { kindColor } from '@/lib/kindColors';

describe('placeMapLinks', () => {
  it('ищет ПО НАЗВАНИЮ во всех трёх — открывается карточка места, не точка', () => {
    const l = placeMapLinks('Кафе Onion', [37.5797, 126.9767]);
    expect(l.kakao).toContain('map.kakao.com/?q=');
    expect(l.naver).toContain('/p/search/');
    expect(l.google).toContain('/maps/search/');
    // даже при наличии координат не уходим в голую точку
    expect(l.google).not.toContain('query=37.5797,126.9767');
  });

  it('предпочитает английский geo русскому имени (корейские карты ищут лучше)', () => {
    const l = placeMapLinks('Кафе Лук', null, 'Onion Anguk, Seoul, South Korea');
    expect(l.kakao).toContain(encodeURIComponent('Onion Anguk, Seoul, South Korea'));
    expect(l.naver).toContain(encodeURIComponent('Onion Anguk, Seoul, South Korea'));
    expect(l.google).toContain(encodeURIComponent('Onion Anguk, Seoul, South Korea'));
    expect(l.kakao).not.toContain(encodeURIComponent('Кафе Лук'));
  });

  it('без geo — ищет по имени', () => {
    const l = placeMapLinks('Кафе Onion', null);
    expect(l.kakao).toContain('map.kakao.com/?q=');
    expect(l.kakao).toContain(encodeURIComponent('Кафе Onion'));
  });

  it('нет ни имени, ни geo, но есть точка — открываем хотя бы точку (Google)', () => {
    const l = placeMapLinks('', [37.5, 127.0], '');
    expect(l.google).toContain('query=37.5,127');
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

describe('isMapLink', () => {
  it('распознаёт карт-ссылки (скриншот карты вместо фото)', () => {
    expect(isMapLink('https://maps.app.goo.gl/abc')).toBe(true);
    expect(isMapLink('https://www.google.com/maps/place/X')).toBe(true);
    expect(isMapLink('https://map.kakao.com/?q=x')).toBe(true);
    expect(isMapLink('https://map.naver.com/p/search/x')).toBe(true);
  });
  it('обычные ссылки (инста/блог) — не карта', () => {
    expect(isMapLink('https://instagram.com/p/x')).toBe(false);
    expect(isMapLink('https://oliveyoung.co.kr/x')).toBe(false);
    expect(isMapLink('')).toBe(false);
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
