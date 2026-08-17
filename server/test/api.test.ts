import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elderlingo-test-'));
process.env.ELDERLINGO_DATA = dataDir;

let app: ReturnType<typeof createApp>;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.createApp();
  agent = request.agent(app);
});
afterAll(() => fs.rmSync(dataDir, { recursive: true, force: true }));

describe('auth', () => {
  it('rejects requests without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('registers a user', async () => {
    const res = await agent.post('/api/auth/register').send({
      email: 'wulf@heorot.test',
      name: 'Wulf',
      password: 'saxewulf',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ email: 'wulf@heorot.test', xp: 0, streak: 0 });
    expect(res.body).not.toHaveProperty('voice');
    expect(res.body).not.toHaveProperty('chatEnabled');
  });

  it('rejects duplicate emails', async () => {
    const res = await agent.post('/api/auth/register').send({
      email: 'wulf@heorot.test',
      name: 'Wulf2',
      password: 'saxewulf',
    });
    expect(res.status).toBe(409);
  });

  it('rejects short passwords', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'short@heorot.test',
      name: 'Shorty',
      password: 'abc',
    });
    expect(res.status).toBe(400);
  });

  it('logs in and reports the session user', async () => {
    const login = await agent.post('/api/auth/login').send({
      email: 'wulf@heorot.test',
      password: 'saxewulf',
    });
    expect(login.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.body.name).toBe('Wulf');
  });

  it('rejects wrong passwords', async () => {
    const res = await agent.post('/api/auth/login').send({
      email: 'wulf@heorot.test',
      password: 'wrong',
    });
    expect(res.status).toBe(401);
  });

  it('no longer offers a voice preference', async () => {
    const res = await agent.post('/api/auth/voice').send({ voice: 'de' });
    expect(res.status).toBe(404);
  });

  it('logs out', async () => {
    const res = await agent.post('/api/auth/logout');
    expect(res.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});

describe('lesson path & progress', () => {
  let wulf: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    wulf = request.agent(app);
    await wulf.post('/api/auth/register').send({
      email: 'paths@heorot.test',
      name: 'Pathfinder',
      password: 'saxewulf',
    });
  });

  it('starts with only the first lesson available', async () => {
    const res = await wulf.get('/api/units');
    expect(res.status).toBe(200);
    const statuses = res.body[0].lessons.map((l: { status: string }) => l.status);
    expect(statuses[0]).toBe('available');
    expect(statuses.slice(1).every((s: string) => s === 'locked')).toBe(true);
  });

  it('blocks locked lessons', async () => {
    const res = await wulf.get('/api/lessons/u1l2');
    expect(res.status).toBe(403);
  });

  it('404s unknown lessons', async () => {
    const res = await wulf.get('/api/lessons/nope');
    expect(res.status).toBe(404);
  });

  it('rejects invalid completion payloads', async () => {
    const res = await wulf.post('/api/lessons/u1l1/complete').send({ correct: 99, total: 9, heartsLeft: 3 });
    expect(res.status).toBe(400);
  });

  it('completes a lesson and awards XP + streak', async () => {
    const res = await wulf
      .post('/api/lessons/u1l1/complete')
      .send({ correct: 9, total: 9, heartsLeft: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ completed: true, xpEarned: 90, streak: 1, bestScore: 9 });
    const me = await wulf.get('/api/auth/me');
    expect(me.body.xp).toBe(90);
    expect(me.body.streak).toBe(1);
  });

  it('unlocks the next lesson after completion', async () => {
    const res = await wulf.get('/api/lessons/u1l2');
    expect(res.status).toBe(200);
  });

  it('does not double-count XP on replays with the same score', async () => {
    const replay = await wulf
      .post('/api/lessons/u1l1/complete')
      .send({ correct: 9, total: 9, heartsLeft: 3 });
    expect(replay.body.xpEarned).toBe(0);
    const me = await wulf.get('/api/auth/me');
    expect(me.body.xp).toBe(90);
  });

  it('awards delta XP on improved replays and keeps the best score', async () => {
    const worse = await wulf
      .post('/api/lessons/u1l2/complete')
      .send({ correct: 6, total: 9, heartsLeft: 3 });
    expect(worse.body.completed).toBe(true);
    expect(worse.body.xpEarned).toBe(60);
    const better = await wulf
      .post('/api/lessons/u1l2/complete')
      .send({ correct: 7, total: 9, heartsLeft: 2 });
    expect(better.body.xpEarned).toBe(10);
    expect(better.body.bestScore).toBe(7);
    const me = await wulf.get('/api/auth/me');
    expect(me.body.xp).toBe(90 + 60 + 10);
  });

  it('does not award streak on failed lessons', async () => {
    const res = await wulf.post('/api/lessons/u1l3/complete').send({ correct: 2, total: 11, heartsLeft: 0 });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(false);
    expect(res.body.streak).toBe(0);
    const me = await wulf.get('/api/auth/me');
    expect(me.body.streak).toBe(1);
  });
});

describe('audio', () => {
  let listener: ReturnType<typeof request.agent>;

  beforeAll(async () => {
    listener = request.agent(app);
    await listener.post('/api/auth/register').send({
      email: 'listener@heorot.test',
      name: 'Listener',
      password: 'saxewulf',
    });
  });

  it('reports the cache status', async () => {
    const res = await request(app).get('/api/audio/status');
    expect(res.status).toBe(401);
    const res2 = await listener.get('/api/audio/status');
    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('cachedFiles');
    expect(res2.body).toHaveProperty('chatterboxOnline');
  });

  it('404s for ungenerated audio', async () => {
    const res = await listener.get('/api/audio/de/definitely-missing.mp3');
    expect(res.status).toBe(404);
  });

  it('404s for unknown voices', async () => {
    const res = await listener.get('/api/audio/en/fixture-audio.mp3');
    expect(res.status).toBe(404);
  });

  it('serves generated audio as audio/mpeg', async () => {
    const { audioDir } = await import('../src/routes/audio.js');
    fs.mkdirSync(path.join(audioDir, 'de'), { recursive: true });
    fs.writeFileSync(path.join(audioDir, 'de', 'fixture-audio.mp3'), Buffer.from([0x49, 0x44, 0x33, 0x00]));
    const res = await listener.get('/api/audio/de/fixture-audio.mp3');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('audio/mpeg');
    expect(res.body).toEqual(Buffer.from([0x49, 0x44, 0x33, 0x00]));
    fs.rmSync(path.join(audioDir, 'de', 'fixture-audio.mp3'));
  });
});