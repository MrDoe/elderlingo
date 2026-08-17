import type { Exercise } from '../../../shared/types';
import { Listening } from './Listening';
import { MatchPairs } from './MatchPairs';
import { MultipleChoice } from './MultipleChoice';
import { TypeTranslation } from './TypeTranslation';
import { WordBank } from './WordBank';

interface Props {
  exercise: Exercise;
  disabled: boolean;
  revealed: boolean;
  onSubmit: (correct: boolean) => void;
}

export function ExerciseCard({ exercise, disabled, revealed, onSubmit }: Props) {
  switch (exercise.type) {
    case 'multiple-choice':
      return (
        <MultipleChoice exercise={exercise} disabled={disabled} revealed={revealed} onSubmit={onSubmit} />
      );
    case 'type-translation':
      return (
        <TypeTranslation exercise={exercise} disabled={disabled} revealed={revealed} onSubmit={onSubmit} />
      );
    case 'word-bank':
      return (
        <WordBank exercise={exercise} disabled={disabled} revealed={revealed} onSubmit={onSubmit} />
      );
    case 'match-pairs':
      return (
        <MatchPairs exercise={exercise} disabled={disabled} revealed={revealed} onSubmit={onSubmit} />
      );
    case 'listening':
      return (
        <Listening exercise={exercise} disabled={disabled} revealed={revealed} onSubmit={onSubmit} />
      );
  }
}
