import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.ELDERLINGO_DATA ?? path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'elderlingo.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS lesson_progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'started',
    best_score INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    PRIMARY KEY (user_id, lesson_id)
  );
`);

const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (userCols.some((c) => c.name === 'chat_enabled')) {
  db.exec('ALTER TABLE users DROP COLUMN chat_enabled');
}
if (userCols.some((c) => c.name === 'voice')) {
  db.exec('ALTER TABLE users DROP COLUMN voice');
}

export function updateStreak(userId: number): number {
  const user = db.prepare('SELECT streak, last_activity_date FROM users WHERE id = ?').get(userId) as {
    streak: number;
    last_activity_date: string | null;
  };
  const today = new Date().toISOString().slice(0, 10);
  let streak = 1;
  if (user.last_activity_date === today) {
    streak = user.streak;
  } else if (user.last_activity_date === yesterday()) {
    streak = user.streak + 1;
  }
  db.prepare('UPDATE users SET streak = ?, last_activity_date = ? WHERE id = ?').run(streak, today, userId);
  return streak;
}

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}