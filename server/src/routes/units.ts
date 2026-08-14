import { Router } from 'express';
import { units } from '../../../content/units';
import { db } from '../db.js';
import { requireAuth } from '../middleware.js';
import type { ApiUnit, LessonStatus } from '../../../shared/types';

const router = Router();

function lessonOrder(): { lessonId: string; completed: boolean }[] {
  const all: { lessonId: string; completed: boolean }[] = [];
  for (const unit of [...units].sort((a, b) => a.order - b.order)) {
    for (const lesson of [...unit.lessons].sort((a, b) => a.order - b.order)) {
      all.push({ lessonId: lesson.id, completed: false });
    }
  }
  return all;
}

router.get('/', requireAuth, (req, res) => {
  const userId = req.session.userId!;
  const progress = db
    .prepare('SELECT lesson_id, status, best_score, xp_earned FROM lesson_progress WHERE user_id = ?')
    .all(userId) as { lesson_id: string; status: string; best_score: number; xp_earned: number }[];

  const completed = new Set(progress.filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  const sequence = lessonOrder().map(({ lessonId }) => lessonId);

  const apiUnits: ApiUnit[] = [...units]
    .sort((a, b) => a.order - b.order)
    .map((unit) => ({
      id: unit.id,
      title: unit.title,
      subtitle: unit.subtitle,
      order: unit.order,
      lessons: [...unit.lessons]
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const idx = sequence.indexOf(lesson.id);
          const prev = idx > 0 ? sequence[idx - 1] : null;
          const prog = progress.find((p) => p.lesson_id === lesson.id);
          let status: LessonStatus = 'locked';
          if (completed.has(lesson.id)) {
            status = 'completed';
          } else if (idx === 0 || (prev && completed.has(prev))) {
            status = prog ? 'started' : 'available';
          }
          return {
            id: lesson.id,
            title: lesson.title,
            order: lesson.order,
            status,
            bestScore: prog?.best_score ?? 0,
            xp: prog?.xp_earned ?? 0,
          };
        }),
    }));

  res.json(apiUnits);
});

export default router;