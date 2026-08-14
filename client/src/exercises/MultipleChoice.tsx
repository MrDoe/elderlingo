import { useState } from 'react';
import type { MultipleChoiceExercise, Voice } from '../../../shared/types';
import { AudioButton } from '../components/AudioButton';
import { sfx } from '../sfx';

interface Props {
  exercise: MultipleChoiceExercise;
  voice: Voice;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function MultipleChoice({ exercise, voice, disabled, revealed, onSubmit }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const locked = disabled || revealed;

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
        <div className="word-card">
          <AudioButton entry={exercise.entry} voice={voice} />
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