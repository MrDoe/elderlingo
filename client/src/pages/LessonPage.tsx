import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Lesson, LessonCompleteResult } from '../../../shared/types';
import { HEARTS_PER_LESSON, XP_PER_CORRECT } from '../../../shared/types';
import { useAuth } from '../App';
import { api, ApiError } from '../api';
import { stopAudio } from '../audio';
import { Confetti } from '../components/Confetti';
import { HeartBar } from '../components/HeartBar';
import { Mascot, type MascotMood } from '../components/Mascot';
import { ProgressBar } from '../components/ProgressBar';
import { ExerciseCard } from '../exercises/ExerciseCard';
import { sfx } from '../sfx';

type Phase = 'playing' | 'summary' | 'failed';

interface Feedback {
  kind: 'correct' | 'wrong';
  seq: number;
}

function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{n}</span>;
}

export function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [phase, setPhase] = useState<Phase>('playing');
  const [index, setIndex] = useState(0);
  const [hearts, setHearts] = useState(HEARTS_PER_LESSON);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<LessonCompleteResult | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [celebrate, setCelebrate] = useState(0);

  useEffect(() => {
    if (!id) return;
    api
      .lesson(id)
      .then(setLesson)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 403) {
          setLoadError('Complete the previous lesson first.');
        } else {
          setLoadError(err instanceof Error ? err.message : 'Failed to load lesson');
        }
      });
    return () => stopAudio();
  }, [id]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 1100);
    return () => clearTimeout(t);
  }, [feedback]);

  const submitResult = useCallback(
    async (correctCount: number) => {
      if (!lesson) return;
      try {
        const res = await api.completeLesson(lesson.id, {
          correct: correctCount,
          total: lesson.exercises.length,
          heartsLeft: hearts,
        });
        setResult(res);
        setPhase(res.completed ? 'summary' : 'failed');
        if (res.completed) {
          sfx.fanfare();
          setCelebrate((c) => c + 1);
        }
      } catch {
        setPhase('failed');
      }
    },
    [lesson, hearts],
  );

  const handleSubmit = useCallback(
    (isCorrect: boolean) => {
      if (!lesson) return;
      if (isCorrect && !revealed) {
        sfx.correct();
        setFeedback({ kind: 'correct', seq: Date.now() });
        const nextCorrect = correct + 1;
        setCorrect(nextCorrect);
        if (index + 1 >= lesson.exercises.length) {
          void submitResult(nextCorrect);
          return;
        }
        setTimeout(() => {
          setIndex((i) => i + 1);
        }, 450);
        return;
      }
      if (!isCorrect && !revealed) {
        sfx.wrong();
        sfx.heartLost();
        setFeedback({ kind: 'wrong', seq: Date.now() });
        const nextHearts = hearts - 1;
        setHearts(nextHearts);
        if (nextHearts <= 0) {
          void submitResult(correct);
          return;
        }
        setRevealed(true);
        return;
      }
      if (isCorrect && revealed) {
        sfx.click();
        if (index + 1 >= lesson.exercises.length) {
          void submitResult(correct);
          return;
        }
        setRevealed(false);
        setIndex((i) => i + 1);
      }
    },
    [lesson, index, hearts, correct, revealed, submitResult],
  );

  if (loadError) {
    return (
      <div className="page-center">
        <p className="error">{loadError}</p>
        <Link to="/" className="btn btn--primary">
          Back to the path
        </Link>
      </div>
    );
  }
  if (!lesson) return <div className="page-center">Ġehiert þæt…</div>;

  if (phase !== 'playing') {
    return (
      <div className="page-center">
        <Confetti fire={celebrate} />
        <Mascot mood={phase === 'summary' ? 'excited' : 'sad'} />
        <div className="summary-card">
          {phase === 'summary' ? (
            <>
              <h2>Wæs hāl! Lesson complete!</h2>
              <p>
                You got <strong>{correct}</strong> right on the first try.
              </p>
              <p className="xp-line">
                +<CountUp value={result?.xpEarned ?? 0} /> XP
              </p>
              {result && result.streak > 0 && <p className="streak-line">🔥 {result.streak}-day streak</p>}
            </>
          ) : (
            <>
              <h2>Lesson failed</h2>
              <p>
                You ran out of hearts ({HEARTS_PER_LESSON} wrong answers allowed). You still earned{' '}
                <strong>{result?.xpEarned ?? 0}</strong> XP. Don't give up — sēċ eft!
              </p>
            </>
          )}
          <div className="summary-actions">
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/')}>
              Back to the path
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setIndex(0);
                setHearts(HEARTS_PER_LESSON);
                setCorrect(0);
                setRevealed(false);
                setResult(null);
                setFeedback(null);
                setPhase('playing');
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const exercise = lesson.exercises[index];
  const mascotMood: MascotMood = feedback ? (feedback.kind === 'correct' ? 'happy' : 'sad') : 'idle';
  const mascotKey = feedback ? feedback.seq : `idle-${index}`;

  return (
    <main className="lesson">
      <Confetti fire={celebrate} />
      <div className="lesson-top">
        <Link to="/" className="quit" aria-label="Quit lesson">
          ✕
        </Link>
        <ProgressBar current={index + (revealed ? 1 : 0)} total={lesson.exercises.length} />
        <HeartBar hearts={hearts} />
      </div>
      <div className={`lesson-card${feedback ? ` lesson-card--${feedback.kind}` : ''}`} key={exercise.id}>
        <ExerciseCard
          exercise={exercise}
          voice={user?.voice ?? 'en'}
          disabled={false}
          revealed={revealed}
          onSubmit={handleSubmit}
        />
      </div>
      {feedback?.kind === 'correct' && (
        <div className="xp-bubble" key={feedback.seq}>
          +{XP_PER_CORRECT} XP
        </div>
      )}
      <Mascot mood={mascotMood} key={mascotKey} />
      {revealed && (
        <div className="lesson-bottom">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => handleSubmit(true)}
          >
            Continue
          </button>
        </div>
      )}
    </main>
  );
}
