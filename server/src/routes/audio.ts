import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireAuth } from '../middleware.js';
import { chatterboxOnline } from '../chattts.js';
import type { AudioStatus } from '../../../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');

const router = Router();

function countFiles(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const voice of fs.readdirSync(dir)) {
    const voiceDir = path.join(dir, voice);
    if (fs.statSync(voiceDir).isDirectory()) n += fs.readdirSync(voiceDir).length;
  }
  return n;
}

router.get('/status', requireAuth, async (_req, res) => {
  const status: AudioStatus = {
    chatterboxOnline: await chatterboxOnline(),
    cachedFiles: countFiles(audioDir),
  };
  res.json(status);
});

router.get('/:voice/:slug.mp3', (req, res) => {
  const { voice, slug } = req.params;
  if (voice !== 'de' && voice !== 'speaker') {
    res.status(404).json({ error: 'Unknown voice' });
    return;
  }
  const safeSlug = slug.replace(/[^a-z0-9-]/g, '');
  const file = path.join(audioDir, voice, `${safeSlug}.mp3`);
  if (!file.startsWith(audioDir) || !fs.existsSync(file)) {
    res.status(404).json({ error: 'Audio not generated yet — run `npm run generate-audio`' });
    return;
  }
  res.type('audio/mpeg');
  fs.createReadStream(file).pipe(res);
});

export default router;
