import type { Voice } from '../../shared/types';
import { audioUrl } from './api';

let cachedVoice: HTMLAudioElement | null = null;

export function stopAudio() {
  cachedVoice?.pause();
  cachedVoice = null;
}

function fallbackSpeak(text: string, voice: Voice) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const lang = voice === 'de' ? 'de' : 'en';
  const match = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
  if (match) utterance.voice = match;
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export async function playAudio(voice: Voice, slug: string, fallbackText?: string): Promise<void> {
  stopAudio();
  try {
    const res = await fetch(audioUrl(voice, slug), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`audio missing: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    cachedVoice = new Audio(url);
    await cachedVoice.play();
  } catch {
    if (fallbackText) fallbackSpeak(fallbackText, voice);
  }
}