import { useState } from 'react';
import type { TypeTranslationExercise, Voice } from '../../../shared/types';
import { answersMatch } from '../../../shared/utils';
import { AudioButton } from '../components/AudioButton';

interface Props {
  exercise: TypeTranslationExercise;
  voice: Voice;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function TypeTranslation({ exercise, voice, disabled, revealed, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [checked, setChecked] = useState(false);
  const locked = disabled || revealed;

  const submit = () => {
    if (checked || locked) return;
    const correct = answersMatch(value, exercise.answer);
    setChecked(true);
    onSubmit(correct);
  };

  const showWord = exercise.direction === 'oe-en';
  const showIpa = exercise.direction === 'oe-en';

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
        {showWord && (
          <div className="word-card">
            <AudioButton entry={exercise.entry} voice={voice} />
            <span className="word">{exercise.entry.word}</span>
            {showIpa && <span className="ipa">{exercise.entry.ipa}</span>}
          </div>
        )}
      </div>
      <input
        className="text-input"
        value={value}
        disabled={locked}
        placeholder={exercise.direction === 'oe-en' ? 'Type the meaning…' : 'Type the Old English word…'}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        autoFocus
      />
      {revealed && (
        <p className="reveal">
          Correct answer: <strong>{exercise.answer}</strong>
        </p>
      )}
      <button type="button" className="btn btn--primary" disabled={locked} onClick={submit}>
        Check
      </button>
    </div>
  );
}