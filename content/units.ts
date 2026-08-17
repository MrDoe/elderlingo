import type { Unit, WordEntry } from '../shared/types';
import {
  buildPhraseLesson,
  buildPhrasebookLesson,
  buildSentenceLesson,
  buildWordLesson,
} from './builder';
import { PHRASE_CATEGORIES, phrasesByCategory } from './phrases';

// All IPA and tts values are hand-curated.
// - ipa: phonetic transcription of the Old English word (early West Saxon reference pronunciation)
// - tts: German-orthography form fed to the German narrator, so German phonology produces
//   the closer-to-authentic OE sound (e.g. ċ → "ch" ich-laut, wīf → "weef" /viːf/)

const greetings: WordEntry[] = [
  { word: 'hāl', ipa: 'hɑːl', meaning: 'healthy, whole', tts: 'haahl' },
  { word: 'ġesund', ipa: 'jeˈsund', meaning: 'well, sound', tts: 'jesund' },
  { word: 'swīþe', ipa: 'ˈswiː.ðe', meaning: 'very', tts: 'ßwie-the' },
  { word: 'lēof', ipa: 'leːof', meaning: 'dear, beloved', tts: 'léof' },
  { word: 'cwic', ipa: 'kwik', meaning: 'alive, living', tts: 'kwick' },
  { word: 'god morgen', ipa: 'ɡod ˈmor.jen', meaning: 'good morning', tts: 'god morjen' },
  { word: 'wes hāl', ipa: 'wes hɑːl', meaning: 'be well! (farewell)', tts: 'wess haal' },
  { word: 'þancie þē', ipa: 'ˈθɑn.tʃi.e θeː', meaning: 'thank you', tts: 'thantschie theh' },
];

const pronouns: WordEntry[] = [
  { word: 'iċ', ipa: 'itʃ', meaning: 'I', tts: 'itch' },
  { word: 'þū', ipa: 'θuː', meaning: 'you (sg.)', tts: 'thuh' },
  { word: 'hē', ipa: 'heː', meaning: 'he', tts: 'heh' },
  { word: 'hēo', ipa: 'heːo', meaning: 'she', tts: 'heh-oh' },
  { word: 'hit', ipa: 'hit', meaning: 'it', tts: 'hitt' },
  { word: 'wē', ipa: 'weː', meaning: 'we', tts: 'weh' },
  { word: 'ġē', ipa: 'jeː', meaning: 'you (pl.)', tts: 'jee' },
  { word: 'hīe', ipa: 'hiːe', meaning: 'they', tts: 'hii-e' },
];

const numbers: WordEntry[] = [
  { word: 'ān', ipa: 'ɑːn', meaning: 'one', tts: 'ahn' },
  { word: 'twā', ipa: 'twɑː', meaning: 'two', tts: 'twah' },
  { word: 'þrīe', ipa: 'θriːe', meaning: 'three', tts: 'thrii-eh' },
  { word: 'fēower', ipa: 'ˈfeːo.wer', meaning: 'four', tts: 'feeowa' },
  { word: 'fīf', ipa: 'fiːf', meaning: 'five', tts: 'fiif' },
  { word: 'siex', ipa: 'siːks', meaning: 'six', tts: 'siix' },
  { word: 'seofon', ipa: 'ˈseo.von', meaning: 'seven', tts: 'seh-oh-fon' },
  { word: 'eahta', ipa: 'ˈæɑx.tɑ', meaning: 'eight', tts: 'ea-tha' },
  { word: 'nigon', ipa: 'ˈni.ɣon', meaning: 'nine', tts: 'nih-jon' },
  { word: 'tīen', ipa: 'tiːen', meaning: 'ten', tts: 'tiehn' },
];

const family: WordEntry[] = [
  { word: 'fæder', ipa: 'ˈfæ.der', meaning: 'father', tts: 'fäder' },
  { word: 'mōdor', ipa: 'ˈmoː.dor', meaning: 'mother', tts: 'mohdor' },
  { word: 'brōþor', ipa: 'ˈbroː.θor', meaning: 'brother', tts: 'brohthor' },
  { word: 'sweostor', ipa: 'ˈsweo.stor', meaning: 'sister', tts: 'sweosstor' },
  { word: 'sunu', ipa: 'ˈsu.nu', meaning: 'son', tts: 'suhnuh' },
  { word: 'dohtor', ipa: 'ˈdox.tor', meaning: 'daughter', tts: 'dochtor' },
  { word: 'wīf', ipa: 'wiːf', meaning: 'woman, wife', tts: 'wiif' },
  { word: 'mæġ', ipa: 'mæj', meaning: 'relative, kinsman', tts: 'mäj' },
];

const toBe: WordEntry[] = [
  { word: 'iċ eom', ipa: 'itʃ eom', meaning: 'I am', tts: 'itch eom' },
  { word: 'þū eart', ipa: 'θuː æɑrt', meaning: 'you are', tts: 'thuu ärrt' },
  { word: 'hē is', ipa: 'heː is', meaning: 'he is', tts: 'heh iss' },
  { word: 'hēo is', ipa: 'heːo is', meaning: 'she is', tts: 'heh-oh iss' },
  { word: 'hit is', ipa: 'hit is', meaning: 'it is', tts: 'hitt iss' },
  { word: 'wē sindon', ipa: 'weː ˈsin.don', meaning: 'we are', tts: 'weh sindon' },
  { word: 'ġē sindon', ipa: 'jeː ˈsin.don', meaning: 'you are (pl.)', tts: 'jeh sindon' },
  { word: 'hīe sindon', ipa: 'hiːe ˈsin.don', meaning: 'they are', tts: 'hii-e sindon' },
];

const sentences: WordEntry[] = [
  { word: 'iċ eom hāl', ipa: 'itʃ eom hɑːl', meaning: 'I am healthy', tts: 'itch eh-om hahl' },
  { word: 'þū eart lēof', ipa: 'θuː æɑrt leːof', meaning: 'you are dear', tts: 'thuu ärrt leh-of' },
  { word: 'hē is swīþe ġesund', ipa: 'heː is ˈswiː.ðe jeˈsund', meaning: 'he is very healthy', tts: 'heh iss ßwie-the jesund' },
  { word: 'hēo is cwic', ipa: 'heːo is kwik', meaning: 'she is alive', tts: 'heh-oh iss kwick' },
  { word: 'wē sindon ġesunde', ipa: 'weː ˈsin.don jeˈsun.de', meaning: 'we are healthy', tts: 'weh sindon jesunde' },
  { word: 'hīe sindon hāle', ipa: 'hiːe ˈsin.don ˈhɑː.le', meaning: 'they are healthy', tts: 'hih-eh sindon haale' },
];

export const units: Unit[] = [
  {
    id: 'u1',
    title: 'Wyrtruman',
    subtitle: 'Roots — greetings, people, and the verb “to be”',
    order: 1,
    lessons: [
      { id: 'u1l1', unitId: 'u1', title: 'Grētunge', order: 1, exercises: buildWordLesson(greetings, 'u1l1') },
      { id: 'u1l2', unitId: 'u1', title: 'Bīnemnendlīcu', order: 2, exercises: buildWordLesson(pronouns, 'u1l2') },
      { id: 'u1l3', unitId: 'u1', title: 'Tælu', order: 3, exercises: buildWordLesson(numbers, 'u1l3') },
      { id: 'u1l4', unitId: 'u1', title: 'Cynn', order: 4, exercises: buildWordLesson(family, 'u1l4') },
      { id: 'u1l5', unitId: 'u1', title: 'Bēon', order: 5, exercises: buildPhraseLesson(toBe, 'u1l5') },
      { id: 'u1l6', unitId: 'u1', title: 'Andgietfulle cwidas', order: 6, exercises: buildSentenceLesson(sentences, 'u1l6') },
    ],
  },
  {
    id: 'u2',
    title: 'Cwidas',
    subtitle: 'Phrases — 100 everyday Old English sentences, spoken aloud',
    order: 2,
    lessons: PHRASE_CATEGORIES.map((cat, i) => ({
      id: `u2l${i + 1}`,
      unitId: 'u2',
      title: cat.title,
      order: i + 1,
      exercises: buildPhrasebookLesson(phrasesByCategory(cat.id), `u2l${i + 1}`),
    })),
  },
];

export function getLesson(lessonId: string) {
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      if (lesson.id === lessonId) return lesson;
    }
  }
  return undefined;
}

export function getUnit(unitId: string) {
  return units.find((u) => u.id === unitId);
}

export function allEntries(): WordEntry[] {
  const seen = new Map<string, WordEntry>();
  for (const unit of units) {
    for (const lesson of unit.lessons) {
      for (const ex of lesson.exercises) {
        if ('entry' in ex && !seen.has(ex.entry.word)) seen.set(ex.entry.word, ex.entry);
      }
    }
  }
  return [...seen.values()];
}
