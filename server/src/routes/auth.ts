import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware.js';
import { toUserPublic, type UserRow } from '../types.js';

const router = Router();

router.post('/register', (req, res) => {
  const { email, name, password } = req.body as { email?: string; name?: string; password?: string };
  if (!email || !name || !password) {
    res.status(400).json({ error: 'email, name and password are required' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }
  const normalizedEmail = String(email).toLowerCase().trim();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }
  const hash = bcrypt.hashSync(String(password), 10);
  const info = db
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(normalizedEmail, String(name).trim(), hash);
  req.session.userId = Number(info.lastInsertRowid);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as UserRow;
  res.status(201).json(toUserPublic(user));
});

router.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).toLowerCase().trim()) as
    | UserRow
    | undefined;
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  req.session.userId = user.id;
  res.json(toUserPublic(user));
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId) as UserRow;
  res.json(toUserPublic(user));
});

export default router;