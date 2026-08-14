import type { WordEntry } from './types';

export function normalizeAnswer(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[æ]/g, 'ae')
    .replace(/[þð]/g, 'th')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function answersMatch(a: string, b: string): boolean {
  return normalizeAnswer(a) === normalizeAnswer(b);
}

export function slugify(word: string): string {
  const slug = normalizeAnswer(word).replace(/\s+/g, '-');
  return slug || 'word';
}

export function entrySlug(entry: WordEntry): string {
  return slugify(entry.word);
}
