import type { AudioVoice } from '../../shared/types';
import { audioUrl } from './api';

let cachedVoice: HTMLAudioElement | null = null;

type PlayListener = (playing: boolean) => void;
const playListeners = new Set<PlayListener>();

export function onAudioPlay(listener: PlayListener): () => void {
  playListeners.add(listener);
  return () => {
    playListeners.delete(listener);
  };
}

function notifyPlaying(playing: boolean) {
  for (const l of playListeners) l(playing);
}

export function stopAudio() {
  cachedVoice?.pause();
  cachedVoice = null;
}

export async function playAudio(voice: AudioVoice, slug: string): Promise<void> {
  stopAudio();
  notifyPlaying(true);
  try {
    const res = await fetch(audioUrl(voice, slug), { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`audio missing: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    cachedVoice = new Audio(url);
    await new Promise<void>((resolve) => {
      cachedVoice!.onended = () => resolve();
      cachedVoice!.onerror = () => resolve();
      void cachedVoice!.play();
    });
  } catch {
    console.warn(`No audio file for ${voice}/${slug} — run \`npm run generate-audio\``);
  } finally {
    notifyPlaying(false);
  }
}
