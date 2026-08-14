import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiUnit } from '../../../shared/types';
import { api } from '../api';

function nodeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'node node--done';
    case 'available':
      return 'node node--open';
    case 'started':
      return 'node node--started';
    default:
      return 'node node--locked';
  }
}

function nodeIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✓';
    case 'available':
      return '▶';
    case 'started':
      return '◐';
    default:
      return '🔒';
  }
}

export function PathPage() {
  const [units, setUnits] = useState<ApiUnit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .units()
      .then(setUnits)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
  }, []);

  if (error) return <div className="page-center error">{error}</div>;
  if (!units) return <div className="page-center">Ġehiert þæt…</div>;

  const completedCount = units.reduce(
    (n, u) => n + u.lessons.filter((l) => l.status === 'completed').length,
    0,
  );

  return (
    <main className="path">
      <header className="path-header">
        <h1>Wyrtruman</h1>
        <p>
          {completedCount} of {units.reduce((n, u) => n + u.lessons.length, 0)} lessons completed
        </p>
      </header>
      {units.map((unit) => (
        <section key={unit.id} className="unit">
          <div className="unit-head">
            <h2>{unit.title}</h2>
            <p>{unit.subtitle}</p>
          </div>
          <div className="path-line">
            {unit.lessons.map((lesson) => (
              <div key={lesson.id} className="path-node">
                {lesson.status === 'locked' ? (
                  <span className={nodeClass(lesson.status)} title="Locked — complete the previous lesson">
                    {nodeIcon(lesson.status)}
                  </span>
                ) : (
                  <Link
                    to={`/lesson/${lesson.id}`}
                    className={nodeClass(lesson.status)}
                    title={`${lesson.title} — best score ${lesson.bestScore}/${lesson.status === 'completed' ? 'done' : ''}`}
                  >
                    {nodeIcon(lesson.status)}
                  </Link>
                )}
                <span className="node-label">{lesson.title}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}