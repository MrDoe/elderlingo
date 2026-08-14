import type {
  Exercise,
  ListeningExercise,
  MatchPairsExercise,
  MultipleChoiceExercise,
  PhraseEntry,
  TypeTranslationExercise,
  WordBankExercise,
  WordEntry,
} from '../shared/types';
import { slugify } from '../shared/utils';

export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDistractors(all: WordEntry[], entry: WordEntry, n: number, rnd: () => number): WordEntry[] {
  return shuffle(all.filter((e) => e.word !== entry.word), rnd).slice(0, n);
}

function mcOeToEn(entry: WordEntry, all: WordEntry[], rnd: () => number): MultipleChoiceExercise {
  const distractors = pickDistractors(all, entry, 3, rnd).map((e) => e.meaning);
  return {
    id: '',
    type: 'multiple-choice',
    prompt: 'What does this Old English word mean?',
    entry,
    options: shuffle([entry.meaning, ...distractors], rnd),
    answer: entry.meaning,
  };
}

function mcEnToOe(entry: WordEntry, all: WordEntry[], rnd: () => number): MultipleChoiceExercise {
  const distractors = pickDistractors(all, entry, 3, rnd).map((e) => e.word);
  return {
    id: '',
    type: 'multiple-choice',
    prompt: `Choose the Old English word for “${entry.meaning}”.`,
    entry,
    options: shuffle([entry.word, ...distractors], rnd),
    answer: entry.word,
  };
}

type Generator = (entry: WordEntry, all: WordEntry[], rnd: () => number) => Exercise;

function typeOeToEn(entry: WordEntry, _all: WordEntry[], _rnd: () => number): TypeTranslationExercise {
  return {
    id: '',
    type: 'type-translation',
    direction: 'oe-en',
    prompt: `Type the meaning of ${entry.word}.`,
    entry,
    answer: entry.meaning,
  };
}

function typeEnToOe(entry: WordEntry, _all: WordEntry[], _rnd: () => number): TypeTranslationExercise {
  return {
    id: '',
    type: 'type-translation',
    direction: 'en-oe',
    prompt: `Type the Old English word for “${entry.meaning}”.`,
    entry,
    answer: entry.word,
  };
}

function listening(entry: WordEntry, all: WordEntry[], rnd: () => number): ListeningExercise {
  const distractors = pickDistractors(all, entry, 3, rnd).map((e) => e.meaning);
  return {
    id: '',
    type: 'listening',
    prompt: 'Listen, then choose the meaning.',
    entry,
    slug: slugify(entry.word),
    options: shuffle([entry.meaning, ...distractors], rnd),
    answer: entry.meaning,
  };
}

function matchPairs(entries: WordEntry[], rnd: () => number): MatchPairsExercise {
  return {
    id: '',
    type: 'match-pairs',
    prompt: 'Tap a word, then tap its meaning.',
    pairs: shuffle(
      entries.map((e) => ({
        left: e.word,
        leftIpa: e.ipa,
        leftSlug: slugify(e.word),
        right: e.meaning,
      })),
      rnd,
    ),
  };
}

function wordBank(entry: WordEntry, _all: WordEntry[], rnd: () => number): WordBankExercise {
  const tokens = entry.word.split(/\s+/);
  return {
    id: '',
    type: 'word-bank',
    prompt: `Tap the words in the correct order for “${entry.meaning}”.`,
    entry,
    wordBank: shuffle(tokens, rnd),
    answer: entry.word,
  };
}

export function buildWordLesson(entries: WordEntry[], lessonId: string): Exercise[] {
  const rnd = mulberry32(lessonId.length * 7919 + entries.length * 131);
  const generators: Generator[] = [mcOeToEn, typeEnToOe, listening, mcEnToOe];
  const exercises: Exercise[] = entries.map((entry, i) => {
    const ex = generators[i % generators.length](entry, entries, rnd);
    return { ...ex, id: `${lessonId}-${i}` };
  });
  const pairCount = Math.min(4, entries.length);
  exercises.push({ ...matchPairs(shuffle(entries, rnd).slice(0, pairCount), rnd), id: `${lessonId}-pairs` });
  return exercises;
}

export function buildPhraseLesson(entries: WordEntry[], lessonId: string): Exercise[] {
  const rnd = mulberry32(lessonId.length * 104729 + entries.length * 97);
  const generators: Generator[] = [mcEnToOe, wordBank, listening, typeOeToEn];
  const exercises: Exercise[] = entries.map((entry, i) => {
    const ex = generators[i % generators.length](entry, entries, rnd);
    return { ...ex, id: `${lessonId}-${i}` };
  });
  const pairCount = Math.min(4, entries.length);
  exercises.push({ ...matchPairs(shuffle(entries, rnd).slice(0, pairCount), rnd), id: `${lessonId}-pairs` });
  return exercises;
}

export function buildSentenceLesson(entries: WordEntry[], lessonId: string): Exercise[] {
  const rnd = mulberry32(lessonId.length * 65537 + entries.length * 53);
  const generators: Generator[] = [wordBank, mcEnToOe, typeOeToEn, wordBank];
  const exercises: Exercise[] = entries.map((entry, i) => {
    const ex = generators[i % generators.length](entry, entries, rnd);
    return { ...ex, id: `${lessonId}-${i}` };
  });
  return exercises;
}

export function buildPhrasebookLesson(phrases: PhraseEntry[], lessonId: string): Exercise[] {
  const entries: WordEntry[] = phrases.map((p) => ({
    word: p.oe,
    ipa: '',
    meaning: p.en,
    tts: { en: '', de: '' },
  }));
  const rnd = mulberry32(lessonId.length * 15485863 + entries.length * 211);
  const generators: Generator[] = [listening, mcEnToOe, wordBank, typeOeToEn];
  const exercises: Exercise[] = entries.map((entry, i) => {
    const ex = generators[i % generators.length](entry, entries, rnd);
    return { ...ex, id: `${lessonId}-${i}` };
  });
  return exercises;
}