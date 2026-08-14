import { Router } from 'express';
import { getLesson, units } from '../../../content/units';
import { db, updateStreak } from '../db.js';
import { requireAuth } from '../middleware.js';
import {
  HEARTS_PER_LESSON,
  PASS_RATIO,
  XP_PER_CORRECT,
  XP_PER_CORRECT_FAILED,
  type Lesson,
  type LessonCompleteRequest,
  type LessonCompleteResult,
} from '../../../shared/types';

const router = Router();

function isLessonUnlocked(lesson: Lesson, completed: Set<string>): boolean {
  const sequence: string[] = [];
  for (const unit of [...units].sort((a, b) => a.order - b.order)) {
    for (const l of [...unit.lessons].sort((a, b) => a.order - b.order)) {
      sequence.push(l.id);
    }
  }
  const idx = sequence.indexOf(lesson.id);
  if (idx <= 0) return true;
  return completed.has(sequence[idx - 1]);
}

router.get('/:id', requireAuth, (req, res) => {
  const lesson = getLesson(String(req.params.id));
  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found' });
    return;
  }
  const userId = req.session.userId!;
  const completed = new Set(
    (db.prepare("SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND status = 'completed'").all(userId) as {
      lesson_id: string;
    }[]).map((r) => r.lesson_id),
  );
  if (!isLessonUnlocked(lesson, completed)) {
    res.status(403).json({ error: 'Complete the previous lesson first' });
    return;
  }
  res.json(lesson);
});

router.post('/:id/complete', requireAuth, (req, res) => {
  const lesson = getLesson(String(req.params.id));
  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found' });
    return;
  }
  const body = req.body as LessonCompleteRequest;
  if (
    typeof body.correct !== 'number' ||
    typeof body.total !== 'number' ||
    typeof body.heartsLeft !== 'number' ||
    body.correct < 0 ||
    body.total !== lesson.exercises.length ||
    body.correct > body.total
  ) {
    res.status(400).json({ error: 'Invalid result payload' });
    return;
  }

  const userId = req.session.userId!;
  const existing = db
    .prepare('SELECT best_score, xp_earned, status FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lesson.id) as { best_score: number; xp_earned: number; status: string } | undefined;

  const alreadyCompleted = existing?.status === 'completed';
  const completed = (body.heartsLeft > 0 && body.correct / body.total >= PASS_RATIO) || alreadyCompleted;
  const xpEarned = completed ? body.correct * XP_PER_CORRECT : body.correct * XP_PER_CORRECT_FAILED;

  const bestScore = Math.max(existing?.best_score ?? 0, body.correct);
  let newXp = xpEarned;
  if (completed && alreadyCompleted) {
    newXp = Math.max(0, xpEarned - (existing?.xp_earned ?? 0));
  }
  if (newXp > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(newXp, userId);
  }

  const streak = completed ? updateStreak(userId) : undefined;

  db.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, best_score, xp_earned, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET
       status = excluded.status,
       best_score = MAX(lesson_progress.best_score, excluded.best_score),
       xp_earned = lesson_progress.xp_earned + excluded.xp_earned,
       completed_at = excluded.completed_at`,
  ).run(
    userId,
    lesson.id,
    completed ? 'completed' : 'started',
    bestScore,
    completed ? newXp : 0,
    completed ? new Date().toISOString() : null,
  );

  const result: LessonCompleteResult = {
    completed,
    xpEarned: newXp,
    streak: streak ?? 0,
    bestScore,
  };
  res.json(result);
});

export default router;