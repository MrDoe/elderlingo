import { describe, expect, it } from 'vitest';
import { answersMatch, normalizeAnswer, slugify } from '../../shared/utils';

describe('normalizeAnswer', () => {
  it('lowercases and trims', () => {
    expect(normalizeAnswer('  Hāl  ')).toBe('hal');
  });

  it('maps OE special characters to ASCII equivalents', () => {
    expect(normalizeAnswer('þancie')).toBe('thancie');
    expect(normalizeAnswer('þū')).toBe('thu');
    expect(normalizeAnswer('brōþor')).toBe('brothor');
    expect(normalizeAnswer('swīþe')).toBe('swithe');
    expect(normalizeAnswer('ġesund')).toBe('gesund');
    expect(normalizeAnswer('iċ')).toBe('ic');
    expect(normalizeAnswer('mæġ')).toBe('maeg');
    expect(normalizeAnswer('hēo')).toBe('heo');
  });

  it('collapses whitespace', () => {
    expect(normalizeAnswer('wes   hāl')).toBe('wes hal');
  });

  it('handles uppercase OE text', () => {
    expect(normalizeAnswer('ĠESUND')).toBe('gesund');
    expect(normalizeAnswer('ÞŪ')).toBe('thu');
  });
});

describe('answersMatch', () => {
  it('accepts diacritic/character variants', () => {
    expect(answersMatch('þancie þē', 'thancie the')).toBe(true);
    expect(answersMatch('iċ', 'ic')).toBe(true);
    expect(answersMatch('hēo', 'heo')).toBe(true);
    expect(answersMatch('wē sindon', 'we sindon')).toBe(true);
    expect(answersMatch('swīþe', 'swithe')).toBe(true);
  });

  it('rejects different answers', () => {
    expect(answersMatch('hāl', 'halo')).toBe(false);
  });
});

describe('slugify', () => {
  it('produces stable ASCII slugs', () => {
    expect(slugify('þancie þē')).toBe('thancie-the');
    expect(slugify('iċ eom hāl')).toBe('ic-eom-hal');
    expect(slugify('hāl')).toBe('hal');
  });
});