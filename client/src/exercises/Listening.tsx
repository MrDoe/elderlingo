import { useEffect, useRef, useState } from 'react';
import { sfx } from '../sfx';
import type { ListeningExercise, Voice } from '../../../shared/types';
import { playAudio } from '../audio';
import { AudioButton } from '../components/AudioButton';

interface Props {
  exercise: ListeningExercise;
  voice: Voice;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function Listening({ exercise, voice, disabled, revealed, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playedOnce, setPlayedOnce] = useState(false);
  const locked = disabled || revealed;
  const autoplayed = useRef(false);

  useEffect(() => {
    if (autoplayed.current) return;
    autoplayed.current = true;
    void playAudio(voice, exercise.slug, exercise.entry.tts[voice]).then(() => setPlayedOnce(true));
  }, [voice, exercise]);

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
        <div className="word-card word-card--audio">
          <AudioButton entry={exercise.entry} voice={voice} slug={exercise.slug} />
          <span className="muted">{playedOnce ? 'Tap to replay' : 'Playing…'}</span>
        </div>
      </div>
      <div className="option-grid">
        {exercise.options.map((opt) => {
          const isCorrect = opt === exercise.answer;
          const isSelected = opt === selected;
          let cls = 'option';
          if (revealed && isCorrect) cls += ' option--correct';
          else if (revealed && isSelected) cls += ' option--wrong';
          else if (isSelected) cls += ' option--selected';
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              disabled={locked}
              onClick={() => {
                sfx.click();
                setSelected(opt);
                onSubmit(isCorrect);
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}