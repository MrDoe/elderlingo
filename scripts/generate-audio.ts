// Pre-generates missing lesson audio through the local Chatterbox container (GPU).
//
// Pipeline (identical to chat, /api/tts → ttsInput()):
//   1. Health-checks http://localhost:4123 (set CHATTERBOX_URL to override).
//   2. For each lesson entry, transliterates the Old English text to German
//      phonetic script (shared/oedict.ts — same rules chat uses).
//   3. Synthesizes with the Old English narrator: POST /v1/audio/speech/upload
//      (zero-shot clone of infra/voices/narrator_sample.wav; the narrator then
//      pronounces the German-orthography input with German phonology).
//   4. Chatterbox returns WAV; each clip is converted to MP3 with ffmpeg and
//      written to server/public/audio/speaker/<slug>.mp3 (idempotent — existing
//      files, including real narrator phrase cuts, are never overwritten).
//
// Usage:
//   npm run generate-audio             # generate what is missing (idempotent)
//   npm run generate-audio -- --force  # regenerate everything

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allEntries } from '../content/units.js';
import { transliterate } from '../shared/oedict.js';
import { slugify } from '../shared/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_URL = process.env.CHATTERBOX_URL ?? 'http://localhost:4123';
const OUT_DIR = process.argv.includes('--out')
  ? path.join(__dirname, '..', 'server', 'public', 'audio', 'speaker', process.argv[process.argv.indexOf('--out') + 1])
  : path.join(__dirname, '..', 'server', 'public', 'audio', 'speaker');
const GERMAN_SAMPLE = path.join(__dirname, '..', 'infra', 'voices', 'narrator_sample.wav');
const FORCE = process.argv.includes('--force');

async function chatterboxOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Zero-shot clone: upload the reference recording along with each request.
async function synthWithSample(text: string, sample: string): Promise<Buffer> {
  const wav = fs.readFileSync(sample);
  const form = new FormData();
  form.append('input', text);
  form.append('voice_file', new Blob([wav], { type: 'audio/wav' }), path.basename(sample));
  const res = await fetch(`${TTS_URL}/v1/audio/speech/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`chatterbox error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

// Chatterbox returns WAV; convert to MP3 via ffmpeg (keeps files small and
// playable by every browser).
function wavToMp3(wav: Buffer, outFile: string): void {
  const tmp = path.join(os.tmpdir(), `elderlingo-${process.pid}-${path.basename(outFile)}.wav`);
  try {
    fs.writeFileSync(tmp, wav);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-q:a', '3', outFile]);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

async function main() {
  if (!(await chatterboxOnline())) {
    console.error(
      `✗ Chatterbox is not running at ${TTS_URL}\n` +
        `  Start it:  docker compose -f infra/tts-compose.yml up -d\n` +
        `  (requires the NVIDIA Container Toolkit and ~4 GB free VRAM — stop ollama first)`,
    );
    process.exit(1);
  }
  console.log(`✓ Chatterbox online at ${TTS_URL}`);

  const hasSample = fs.existsSync(GERMAN_SAMPLE);
  if (!hasSample) {
    console.error(`✗ no ${GERMAN_SAMPLE} — the narrator reference recording is missing`);
    process.exit(1);
  }

  const tasks: { slug: string; text: string }[] = [];
  const only = process.argv.includes('--slugs')
    ? new Set(process.argv.slice(process.argv.indexOf('--slugs') + 1).filter((a) => !a.startsWith('--')))
    : null;
  for (const entry of allEntries()) {
    const slug = slugify(entry.word);
    if (only && !only.has(slug)) continue;
    const out = path.join(OUT_DIR, `${slug}.mp3`);
    if (!FORCE && fs.existsSync(out)) continue;
    tasks.push({ slug, text: entry.tts || transliterate(entry.word) });
  }

  console.log(`Generating ${tasks.length} audio files with the chat pipeline (OE → Lautschrift → narrator)…`);
  let ok = 0;
  for (const task of tasks) {
    try {
      const wav = await synthWithSample(task.text, GERMAN_SAMPLE);
      fs.mkdirSync(OUT_DIR, { recursive: true });
      const outFile = path.join(OUT_DIR, `${task.slug}.mp3`);
      wavToMp3(wav, outFile);
      ok++;
      console.log(`  ✓ ${task.slug}  (${task.text})`);
    } catch (err) {
      console.error(`  ✗ ${task.slug}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Done: ${ok}/${tasks.length} files generated in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
