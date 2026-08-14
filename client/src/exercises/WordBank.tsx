import { useState } from 'react';
import { sfx } from '../sfx';
import type { WordBankExercise } from '../../../shared/types';
import { answersMatch } from '../../../shared/utils';

interface Props {
  exercise: WordBankExercise;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function WordBank({ exercise, disabled, revealed, onSubmit }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const locked = disabled || revealed;

  const remaining = exercise.wordBank.filter((w) => !picked.includes(w));
  const answerTokens = exercise.answer.split(/\s+/);

  const pick = (word: string) => {
    if (locked) return;
    setPicked((p) => [...p, word]);
  };

  const unpick = (idx: number) => {
    if (locked) return;
    setPicked((p) => p.filter((_, i) => i !== idx));
  };

  const submit = () => {
    if (checked || locked || picked.length !== answerTokens.length) return;
    const correct = answersMatch(picked.join(' '), exercise.answer);
    setChecked(true);
    onSubmit(correct);
  };

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
        <p className="ipa">{exercise.entry.ipa}</p>
      </div>
      <div className="chips">
        {picked.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className="chip chip--picked" onClick={() => { sfx.click(); unpick(i); }}>
            {w}
          </button>
        ))}
      </div>
      <div className="word-bank">
        {remaining.map((w, i) => (
          <button key={`${w}-${i}`} type="button" className="chip" onClick={() => { sfx.click(); pick(w); }}>
            {w}
          </button>
        ))}
      </div>
      {revealed && (
        <p className="reveal">
          Correct answer: <strong>{exercise.answer}</strong>
        </p>
      )}
      <button
        type="button"
        className="btn btn--primary"
        disabled={locked || picked.length !== answerTokens.length}
        onClick={submit}
      >
        Check
      </button>
    </div>
  );
}