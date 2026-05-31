import { describe, it, expect } from 'vitest';
import { cleanItineraryText } from '@/lib/generateItinerary';

describe('cleanItineraryText', () => {
  it('декодирует числовые HTML-сущности', () => {
    expect(cleanItineraryText('Каф&#233; Onion')).toBe('Кафé Onion');
    expect(cleanItineraryText('Кор&#xe9;я')).toBe('Корéя');
  });

  it('убирает HTML-теги (например <br>)', () => {
    expect(cleanItineraryText('Мён<br>дон')).toBe('Мён дон');
    expect(cleanItineraryText('<b>Дворец</b>')).toBe('Дворец');
  });

  it('схлопывает пробелы и тримит', () => {
    expect(cleanItineraryText('  два   слова  ')).toBe('два слова');
  });

  it('декодирует амперсанд и кавычки', () => {
    expect(cleanItineraryText('Кафе &amp; бар')).toBe('Кафе & бар');
  });

  it('нестроку отдаёт пустой строкой', () => {
    expect(cleanItineraryText(null)).toBe('');
    expect(cleanItineraryText(undefined)).toBe('');
    expect(cleanItineraryText(42)).toBe('');
  });
});
