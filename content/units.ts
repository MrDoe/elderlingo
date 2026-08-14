import type { Unit, WordEntry } from '../shared/types';
import {
  buildPhraseLesson,
  buildPhrasebookLesson,
  buildSentenceLesson,
  buildWordLesson,
} from './builder';
import { PHRASE_CATEGORIES, phrasesByCategory } from './phrases';

// All IPA and tts_input values are hand-curated.
// - ipa: phonetic transcription of the Old English word (early West Saxon reference pronunciation)
// - tts.en: English-grapheme form fed to the English narrator (Chatterbox phonemizes English text)
// - tts.de: German-orthography form fed to the German narrator, so German phonology produces
//   the closer-to-authentic OE sound (e.g. ċ → "ch" ich-laut, wīf → "weef" /viːf/)

const greetings: WordEntry[] = [
  { word: 'hāl', ipa: 'hɑːl', meaning: 'healthy, whole', tts: { en: 'hahl', de: 'haahl' } },
  { word: 'ġesund', ipa: 'jeˈsund', meaning: 'well, sound', tts: { en: 'yeh-soond', de: 'jesunt' } },
  { word: 'swīþe', ipa: 'ˈswiː.ðe', meaning: 'very', tts: { en: 'swee-theh', de: 'svee-theh' } },
  { word: 'lēof', ipa: 'leːof', meaning: 'dear, beloved', tts: { en: 'leh-off', de: 'leh-ohf' } },
  { word: 'cwic', ipa: 'kwik', meaning: 'alive, living', tts: { en: 'kwik', de: 'kwick' } },
  { word: 'god morgen', ipa: 'ɡod ˈmor.jen', meaning: 'good morning', tts: { en: 'god mor-yen', de: 'gott morjen' } },
  { word: 'wes hāl', ipa: 'wes hɑːl', meaning: 'be well! (farewell)', tts: { en: 'wess hahl', de: 'wess haahl' } },
  { word: 'þancie þē', ipa: 'ˈθɑn.tʃi.e θeː', meaning: 'thank you', tts: { en: 'thahn-chee-eh thee', de: 'thankieh thee' } },
];

const pronouns: WordEntry[] = [
  { word: 'iċ', ipa: 'itʃ', meaning: 'I', tts: { en: 'itch', de: 'ich' } },
  { word: 'þū', ipa: 'θuː', meaning: 'you (sg.)', tts: { en: 'thoo', de: 'thoo' } },
  { word: 'hē', ipa: 'heː', meaning: 'he', tts: { en: 'heh', de: 'hee' } },
  { word: 'hēo', ipa: 'heːo', meaning: 'she', tts: { en: 'heh-oh', de: 'heh-oh' } },
  { word: 'hit', ipa: 'hit', meaning: 'it', tts: { en: 'hit', de: 'hitt' } },
  { word: 'wē', ipa: 'weː', meaning: 'we', tts: { en: 'weh', de: 'weh' } },
  { word: 'ġē', ipa: 'jeː', meaning: 'you (pl.)', tts: { en: 'yeh', de: 'jee' } },
  { word: 'hīe', ipa: 'hiːe', meaning: 'they', tts: { en: 'hee-eh', de: 'hee-eh' } },
];

const numbers: WordEntry[] = [
  { word: 'ān', ipa: 'ɑːn', meaning: 'one', tts: { en: 'ahn', de: 'ahn' } },
  { word: 'twā', ipa: 'twɑː', meaning: 'two', tts: { en: 'twah', de: 'tvah' } },
  { word: 'þrīe', ipa: 'θriːe', meaning: 'three', tts: { en: 'three-eh', de: 'three-eh' } },
  { word: 'fēower', ipa: 'ˈfeːo.wer', meaning: 'four', tts: { en: 'feh-oh-ver', de: 'feh-oh-ver' } },
  { word: 'fīf', ipa: 'fiːf', meaning: 'five', tts: { en: 'feef', de: 'feef' } },
  { word: 'siex', ipa: 'siːks', meaning: 'six', tts: { en: 'see-ecks', de: 'see-ecks' } },
  { word: 'seofon', ipa: 'ˈseo.von', meaning: 'seven', tts: { en: 'seh-oh-von', de: 'seh-oh-fon' } },
  { word: 'eahta', ipa: 'ˈæɑx.tɑ', meaning: 'eight', tts: { en: 'ay-ah-tah', de: 'eh-ah-tah' } },
  { word: 'nigon', ipa: 'ˈni.ɣon', meaning: 'nine', tts: { en: 'nee-gon', de: 'nee-gon' } },
  { word: 'tīen', ipa: 'tiːen', meaning: 'ten', tts: { en: 'tee-en', de: 'tee-en' } },
];

const family: WordEntry[] = [
  { word: 'fæder', ipa: 'ˈfæ.der', meaning: 'father', tts: { en: 'fah-der', de: 'fäder' } },
  { word: 'mōdor', ipa: 'ˈmoː.dor', meaning: 'mother', tts: { en: 'moh-dor', de: 'moh-dor' } },
  { word: 'brōþor', ipa: 'ˈbroː.θor', meaning: 'brother', tts: { en: 'broh-thor', de: 'broh-thor' } },
  { word: 'sweostor', ipa: 'ˈsweo.stor', meaning: 'sister', tts: { en: 'sweh-os-tor', de: 'sveh-oss-tor' } },
  { word: 'sunu', ipa: 'ˈsu.nu', meaning: 'son', tts: { en: 'soo-noo', de: 'soo-noo' } },
  { word: 'dohtor', ipa: 'ˈdox.tor', meaning: 'daughter', tts: { en: 'doch-tor', de: 'dochtor' } },
  { word: 'wīf', ipa: 'wiːf', meaning: 'woman, wife', tts: { en: 'weef', de: 'weef' } },
  { word: 'mæġ', ipa: 'mæj', meaning: 'relative, kinsman', tts: { en: 'may-yeh', de: 'mäj' } },
];

const toBe: WordEntry[] = [
  { word: 'iċ eom', ipa: 'itʃ eom', meaning: 'I am', tts: { en: 'itch eh-om', de: 'ich eh-om' } },
  { word: 'þū eart', ipa: 'θuː æɑrt', meaning: 'you are', tts: { en: 'thoo eh-art', de: 'thoo eh-art' } },
  { word: 'hē is', ipa: 'heː is', meaning: 'he is', tts: { en: 'heh is', de: 'hee iss' } },
  { word: 'hēo is', ipa: 'heːo is', meaning: 'she is', tts: { en: 'heh-oh is', de: 'heh-oh iss' } },
  { word: 'hit is', ipa: 'hit is', meaning: 'it is', tts: { en: 'hit iss', de: 'hitt iss' } },
  { word: 'wē sindon', ipa: 'weː ˈsin.don', meaning: 'we are', tts: { en: 'weh sin-don', de: 'weh zin-don' } },
  { word: 'ġē sindon', ipa: 'jeː ˈsin.don', meaning: 'you are (pl.)', tts: { en: 'yeh sin-don', de: 'jee zin-don' } },
  { word: 'hīe sindon', ipa: 'hiːe ˈsin.don', meaning: 'they are', tts: { en: 'hee-eh sin-don', de: 'hee-eh zin-don' } },
];

const sentences: WordEntry[] = [
  { word: 'iċ eom hāl', ipa: 'itʃ eom hɑːl', meaning: 'I am healthy', tts: { en: 'itch eh-om hahl', de: 'ich eh-om haahl' } },
  { word: 'þū eart lēof', ipa: 'θuː æɑrt leːof', meaning: 'you are dear', tts: { en: 'thoo eh-art leh-off', de: 'thoo eh-art leh-ohf' } },
  { word: 'hē is swīþe ġesund', ipa: 'heː is ˈswiː.ðe jeˈsund', meaning: 'he is very healthy', tts: { en: 'heh iss swee-theh yeh-soond', de: 'hee iss svee-theh jesunt' } },
  { word: 'hēo is cwic', ipa: 'heːo is kwik', meaning: 'she is alive', tts: { en: 'heh-oh iss kwik', de: 'heh-oh iss kwick' } },
  { word: 'wē sindon ġesunde', ipa: 'weː ˈsin.don jeˈsun.de', meaning: 'we are healthy', tts: { en: 'weh sin-don yeh-soon-deh', de: 'weh zin-don jesun-deh' } },
  { word: 'hīe sindon hāle', ipa: 'hiːe ˈsin.don ˈhɑː.le', meaning: 'they are healthy', tts: { en: 'hee-eh sin-don hah-leh', de: 'hee-eh zin-don haah-leh' } },
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