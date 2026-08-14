import { useState } from 'react';
import { sfx } from '../sfx';
import type { MatchPairsExercise, Voice } from '../../../shared/types';
import { AudioButton } from '../components/AudioButton';

interface Props {
  exercise: MatchPairsExercise;
  voice: Voice;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function MatchPairs({ exercise, voice, disabled, revealed, onSubmit }: Props) {
  const [leftSel, setLeftSel] = useState<string | null>(null);
  const [rightSel, setRightSel] = useState<string | null>(null);
  const [wrongPair, setWrongPair] = useState<{ left: string; right: string } | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [failedOnce, setFailedOnce] = useState(false);
  const locked = disabled || revealed;

  const byRight = new Map(exercise.pairs.map((p) => [p.right, p]));

  const pickRight = (right: string) => {
    if (locked || rightSel) return;
    if (!leftSel) {
      setRightSel(right);
      return;
    }
    const pair = byRight.get(right)!;
    if (pair.left === leftSel) {
      const next = new Set(matched);
      next.add(leftSel);
      setMatched(next);
      setLeftSel(null);
      setRightSel(null);
      setWrongPair(null);
      if (next.size === exercise.pairs.length) onSubmit(!failedOnce);
    } else {
      setFailedOnce(true);
      setWrongPair({ left: leftSel, right });
      setTimeout(() => {
        setWrongPair(null);
        setLeftSel(null);
        setRightSel(null);
      }, 700);
    }
  };

  return (
    <div className="exercise">
      <div className="exercise-prompt">
        <p>{exercise.prompt}</p>
      </div>
      <div className="match-grid">
        <div className="match-col">
          {exercise.pairs.map((p) => {
            const isMatched = matched.has(p.left);
            return (
              <button
                key={p.left}
                type="button"
                className={`match-btn${leftSel === p.left ? ' match-btn--sel' : ''}${isMatched ? ' match-btn--done' : ''}${wrongPair?.left === p.left ? ' match-btn--wrong' : ''}`}
                disabled={locked || isMatched}
                onClick={() => {
                  setLeftSel(p.left);
                  setRightSel(null);
                }}
              >
                <AudioButton entry={{ word: p.left, ipa: p.leftIpa, meaning: '', tts: { en: '', de: '' } }} voice={voice} slug={p.leftSlug} compact />
                <span className="word">{p.left}</span>
              </button>
            );
          })}
        </div>
        <div className="match-col">
          {exercise.pairs.map((p) => {
            const isMatched = matched.has(p.left);
            return (
              <button
                key={p.right}
                type="button"
                className={`match-btn${rightSel === p.right ? ' match-btn--sel' : ''}${isMatched ? ' match-btn--done' : ''}${wrongPair?.right === p.right ? ' match-btn--wrong' : ''}`}
                disabled={locked || isMatched}
                onClick={() => { sfx.click(); pickRight(p.right); }}
              >
                {p.right}
              </button>
            );
          })}
        </div>
      </div>
      {revealed && (
        <p className="reveal">
          Correct: {exercise.pairs.map((p) => `${p.left} = ${p.right}`).join(', ')}
        </p>
      )}
    </div>
  );
}