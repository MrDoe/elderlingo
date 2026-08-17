import express, { type NextFunction, type Request, type Response } from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRouter from './routes/auth.js';
import unitsRouter from './routes/units.js';
import lessonsRouter from './routes/lessons.js';
import audioRouter from './routes/audio.js';
import chatRouter from './routes/chat.js';
import sttRouter from './routes/stt.js';
import ttsRouter from './routes/tts.js';
import statusRouter from './routes/status.js';
import promptRouter from './routes/prompt.js';
import { requireAuth } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'elderlingo-dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 30 },
    }),
  );

  app.use('/api/auth', authRouter);
  app.use('/api/units', unitsRouter);
  app.use('/api/lessons', lessonsRouter);
  app.use('/api/audio', audioRouter);
  app.use('/api/chat', requireAuth, chatRouter);
  app.use('/api/stt', requireAuth, sttRouter);
  app.use('/api/tts', requireAuth, ttsRouter);
  app.use('/api/status', requireAuth, statusRouter);
  app.use('/api/prompt', requireAuth, promptRouter);

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('/*splat', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}