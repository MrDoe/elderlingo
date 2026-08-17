import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiUnit, AudioStatus } from '../../../shared/types';
import { useAuth } from '../App';
import { api } from '../api';

export function ProfilePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ units: ApiUnit[] } | null>(null);
  const [audio, setAudio] = useState<AudioStatus | null>(null);

  useEffect(() => {
    void api.units().then((units) => setStats({ units }));
    void api.audioStatus().then(setAudio).catch(() => setAudio(null));
  }, []);

  if (!user) return null;
  const lessonsDone = stats?.units.reduce(
    (n, u) => n + u.lessons.filter((l) => l.status === 'completed').length,
    0,
  );

  return (
    <main className="profile">
      <h1>{user.name} — þīn profl</h1>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-value">⚡ {user.xp}</span>
          <span className="stat-label">Total XP</span>
        </div>
        <div className="stat">
          <span className="stat-value">🔥 {user.streak}</span>
          <span className="stat-label">Day streak</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lessonsDone ?? '–'}</span>
          <span className="stat-label">Lessons completed</span>
        </div>
      </div>

      <div className="profile-card">
        <h2>Chat</h2>
        <p>
          Talk Old English with Se Lēodwita, the chatbot. Needs the local
          services (whisper, ollama, Chatterbox) running — start them with{' '}
          <code>npm run dev:chat</code> or <code>bash scripts/dev-infra.sh</code>. The page
          still works without them; answers just fail politely.
        </p>
      </div>

      {audio && (
        <div className="profile-card">
          <h2>Audio pipeline</h2>
          <ul className="audio-status">
            <li>
              Chatterbox (GPU) container:{' '}
              <strong>{audio.chatterboxOnline ? 'online' : 'offline'}</strong>
            </li>
            <li>
              Pre-generated audio files: <strong>{audio.cachedFiles}</strong>
            </li>
          </ul>
          <p className="muted">
            Missing audio falls back to your browser's speech synthesis.
          </p>
        </div>
      )}

      <Link to="/" className="btn btn--secondary">
        ← Back to the path
      </Link>
    </main>
  );
}