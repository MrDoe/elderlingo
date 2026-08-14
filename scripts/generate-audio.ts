// Pre-generates all lesson audio through the local Chatterbox container (GPU).
//
// Pipeline:
//   1. Health-checks http://localhost:4123 (set CHATTERBOX_URL to override).
//   2. For each curated word/phrase in content/, synthesizes audio:
//        - voice "en":  POST /v1/audio/speech            (built-in narrator)
//        - voice "de":  POST /v1/audio/speech/upload     (zero-shot clone of
//          infra/voices/narrator_sample.wav, a 10-30s Old English reference
//          recording; the narrator then speaks the curated German-orthography
//          tts forms with an authentic Old English accent)
//   3. Chatterbox always returns WAV, so each clip is converted to MP3 with
//      ffmpeg and written to server/public/audio/<voice>/<slug>.mp3.
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
import { entrySlug } from '../shared/utils.js';
import type { Voice } from '../shared/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TTS_URL = process.env.CHATTERBOX_URL ?? 'http://localhost:4123';
const OUT_ROOT = path.join(__dirname, '..', 'server', 'public', 'audio');
const GERMAN_SAMPLE = path.join(__dirname, '..', 'infra', 'voices', 'narrator_sample.wav');
const FORCE = process.argv.includes('--force');

const VOICES: Voice[] = ['en', 'de'];

async function chatterboxOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Default narrator: OpenAI-compatible JSON endpoint, always returns WAV.
async function synthDefault(text: string): Promise<Buffer> {
  const res = await fetch(`${TTS_URL}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text }),
  });
  if (!res.ok) throw new Error(`chatterbox error ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
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
  if (!hasSample) console.log('ℹ  no infra/voices/narrator_sample.wav found — skipping Old English narrator');
  const voices = VOICES.filter((v) => v !== 'de' || hasSample);

  const entries = allEntries();
  const tasks: { voice: Voice; slug: string; text: string }[] = [];
  for (const entry of entries) {
    const slug = entrySlug(entry);
    for (const voice of voices) {
      const out = path.join(OUT_ROOT, voice, `${slug}.mp3`);
      if (!FORCE && fs.existsSync(out)) continue;
      tasks.push({ voice, slug, text: entry.tts[voice] });
    }
  }

  console.log(`Generating ${tasks.length} audio files (${entries.length} entries × ${voices.length} voices)…`);
  let ok = 0;
  for (const task of tasks) {
    try {
      const wav = task.voice === 'de' ? await synthWithSample(task.text, GERMAN_SAMPLE) : await synthDefault(task.text);
      const outDir = path.join(OUT_ROOT, task.voice);
      fs.mkdirSync(outDir, { recursive: true });
      const outFile = path.join(outDir, `${task.slug}.mp3`);
      wavToMp3(wav, outFile);
      ok++;
      console.log(`  ✓ [${task.voice}] ${task.text} → ${task.slug}.mp3`);
    } catch (err) {
      console.error(`  ✗ [${task.voice}] ${task.text}: ${err instanceof Error ? err.message : err}`);
    }
  }
  console.log(`Done: ${ok}/${tasks.length} files generated in ${OUT_ROOT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
