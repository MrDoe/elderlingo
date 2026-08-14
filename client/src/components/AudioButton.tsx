import { useState } from 'react';
import type { Voice, WordEntry } from '../../../shared/types';
import { entrySlug } from '../../../shared/utils';
import { playAudio } from '../audio';

interface AudioButtonProps {
  entry?: WordEntry;
  voice: Voice;
  slug?: string;
  compact?: boolean;
  label?: string;
}

export function AudioButton({ entry, voice, slug, compact, label }: AudioButtonProps) {
  const [busy, setBusy] = useState(false);
  const targetSlug = slug ?? (entry ? entrySlug(entry) : '');
  const fallbackText = entry?.tts[voice];

  return (
    <button
      type="button"
      className={`audio-btn${compact ? ' audio-btn--compact' : ''}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await playAudio(voice, targetSlug, fallbackText);
        setBusy(false);
      }}
      aria-label={label ?? 'Play audio'}
    >
      {busy ? '⏳' : '🔊'}
    </button>
  );
}