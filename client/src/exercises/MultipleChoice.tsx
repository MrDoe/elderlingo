import { useEffect, useRef, useState } from 'react';
import type { MultipleChoiceExercise } from '../../../shared/types';
import { entrySlug } from '../../../shared/utils';
import { playAudio } from '../audio';
import { AudioButton } from '../components/AudioButton';
import { sfx } from '../sfx';

interface Props {
  exercise: MultipleChoiceExercise;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function MultipleChoice({ exercise, disabled, revealed, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const locked = disabled || revealed;
  const autoplayed = useRef(false);

  useEffect(() => {
    if (autoplayed.current) return;
    autoplayed.current = true;
    void playAudio(exercise.entry.voice ?? 'speaker', entrySlug(exercise.entry));
  }, [exercise]);

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
        <div className="word-card">
          <AudioButton entry={exercise.entry} />
          <span className="word">{exercise.entry.word}</span>
          <span className="ipa">{exercise.entry.ipa}</span>
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
