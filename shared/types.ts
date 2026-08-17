export type AudioVoice = 'de' | 'speaker';

export interface WordEntry {
  word: string;
  ipa: string;
  meaning: string;
  tts: string;
  voice?: AudioVoice;
}

export interface PhraseEntry {
  oe: string;
  en: string;
  category: string;
  tts?: string;
}

export interface ExerciseBase {
  id: string;
  prompt: string;
}

export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple-choice';
  entry: WordEntry;
  options: string[];
  answer: string;
}

export interface TypeTranslationExercise extends ExerciseBase {
  type: 'type-translation';
  direction: 'oe-en' | 'en-oe';
  entry: WordEntry;
  answer: string;
}

export interface WordBankExercise extends ExerciseBase {
  type: 'word-bank';
  entry: WordEntry;
  wordBank: string[];
  answer: string;
}

export interface MatchPairsExercise extends ExerciseBase {
  type: 'match-pairs';
  pairs: { left: string; leftIpa: string; leftSlug: string; right: string; voice: AudioVoice }[];
}

export interface ListeningExercise extends ExerciseBase {
  type: 'listening';
  entry: WordEntry;
  slug: string;
  options: string[];
  answer: string;
}

export type Exercise =
  | MultipleChoiceExercise
  | TypeTranslationExercise
  | WordBankExercise
  | MatchPairsExercise
  | ListeningExercise;

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  order: number;
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  lessons: Lesson[];
}

export type LessonStatus = 'locked' | 'available' | 'started' | 'completed';

export interface LessonSummary {
  id: string;
  title: string;
  order: number;
  status: LessonStatus;
  bestScore: number;
  xp: number;
}

export interface ApiUnit {
  id: string;
  title: string;
  subtitle: string;
  order: number;
  lessons: LessonSummary[];
}

export interface UserPublic {
  id: number;
  email: string;
  name: string;
  xp: number;
  streak: number;
}

export interface LessonCompleteRequest {
  correct: number;
  total: number;
  heartsLeft: number;
}

export interface LessonCompleteResult {
  completed: boolean;
  xpEarned: number;
  streak: number;
  bestScore: number;
}

export interface AudioStatus {
  chatterboxOnline: boolean;
  cachedFiles: number;
}

export const HEARTS_PER_LESSON = 3;
export const XP_PER_CORRECT = 10;
export const XP_PER_CORRECT_FAILED = 5;
export const PASS_RATIO = 0.6;

export type ChatRole = 'user' | 'bot';

export interface ChatMessage {
  role: ChatRole;
  transcript?: string;
  oe?: string;
  gloss?: string;
}

export interface ChatTurn extends ChatMessage {
  id: string;
  ts: number;
}

export interface ChatReply {
  oe: string;
  gloss: string;
}

export interface SttResult {
  transcript: string;
  oe?: string;
}

export interface ServiceStatus {
  whisperOnline: boolean;
  chatterboxOnline: boolean;
  ollamaOnline: boolean;
}

export interface PromptInfo {
  prompt: string;
  default: string;
  custom: boolean;
}
