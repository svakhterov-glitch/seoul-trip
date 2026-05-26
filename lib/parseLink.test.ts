import { describe, it, expect } from 'vitest';
import { parseLink } from '@/lib/parseLink';

describe('parseLink — координаты из URL карт', () => {
  it('Google @lat,lng + имя из /place/', () => {
    const r = parseLink('https://www.google.com/maps/place/Gyeongbokgung+Palace/@37.5796,126.977,17z');
    expect(r.coords).toEqual([37.5796, 126.977]);
    expect(r.name).toBe('Gyeongbokgung Palace');
    expect(r.source).toBe('google');
  });

  it('Google !3d!4d', () => {
    const r = parseLink('https://www.google.com/maps/place/X/data=!3d37.5!4d127.0');
    expect(r.coords).toEqual([37.5, 127.0]);
  });

  it('Google q=lat,lng', () => {
    expect(parseLink('https://maps.google.com/?q=37.5,127.0').coords).toEqual([37.5, 127.0]);
  });

  it('Kakao link/map/имя,lat,lng', () => {
    const r = parseLink('https://kko.to/link/map/Onion,37.123,127.456');
    expect(r.coords).toEqual([37.123, 127.456]);
    expect(r.source).toBe('kakao');
  });

  it('короткая Google-ссылка без координат', () => {
    const r = parseLink('https://maps.app.goo.gl/abcd1234');
    expect(r.coords).toBeNull();
    expect(r.source).toBe('google');
  });
});

describe('parseLink — источник по домену', () => {
  it('instagram → без координат и имени', () => {
    const r = parseLink('https://www.instagram.com/p/Cxyz/');
    expect(r).toEqual({ name: '', coords: null, source: 'instagram' });
  });

  it('произвольный блог → other', () => {
    expect(parseLink('https://someblog.com/seoul/best-cafe').source).toBe('other');
  });

  it('декодирует percent-encoded имя места', () => {
    expect(parseLink('https://www.google.com/maps/place/%EC%84%9C%EC%9A%B8/@37.5,127.0').name).toBe('서울');
  });

  it('пустая/мусорная строка не падает', () => {
    expect(parseLink('')).toEqual({ name: '', coords: null, source: 'other' });
    expect(parseLink('   ').coords).toBeNull();
  });
});
