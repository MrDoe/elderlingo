# AGENTS.md

## Commands (run at repo root)

- `npm run dev` — server + client (concurrently)
- `npm run typecheck` — tsc --noEmit for server and client workspaces
- `npm run build` — client build
- `npm run test` — vitest (server workspace, `server/test/api.test.ts`, `utils.test.ts`)
- `npx tsx <file>` — run TS scripts (tsx at root)

## Code conventions

- No comments in code unless asked.
- npm workspaces: `client/` (React 19 + Vite), `server/` (express + better-sqlite3), shared code in `shared/`.
- Content lives in `content/`: `units.ts` (lessons/units), `phrases.ts` (100-phrase phrasebook), `builder.ts` (exercise generators). Exercises reference entries via `slugify()` from `shared/utils.ts` (lowercase → NFD strip marks → æ→ae, þ/ð→th → strip non-alnum → spaces→dashes).
- Client has no external deps for SFX/animation — WebAudio synth in `client/src/sfx.ts`, hand-rolled canvas confetti in `client/src/components/Confetti.tsx`, mascot in `client/src/components/Mascot.tsx`. Mute persists in localStorage key `elderlingo.muted`.

## Audio pipeline (phrase audio)

- Source: `old_english_phrases.wav` (48 kHz stereo 16-bit PCM, 204.12 s, exactly 100 OE phrases spoken in order, 10 categories × 10, speech ends ~193.7 s).
- Cut MP3s live in `server/public/audio/en/` (24 kHz mono, 64 kbps, slugs = `slugify(phrase)`), served by `GET /api/audio/:voice/:slug.mp3` (voices: en|de|speaker).
- `scripts/cut-phrases.py` — boundary detection + validation + cutting. It depends on `/tmp/opencode/words.json` (whisper word timestamps) and `/tmp/opencode/phrases.txt` (100 phrases, one per line) — both are EPHEMERAL (/tmp). Re-derive with `/tmp/opencode/whisper-venv` if lost.
- Phrase→whisper-word index mapping is HAND-VERIFIED, hardcoded in `FIRST_WORD_IDX`. Do not regenerate it blindly from a whisper run.
- `scripts/generate-audio.ts` regenerates TTS for u1 word entries only — it never wipes the audio dir, so phrase MP3s are safe.
- Old word-level TTS files (an.mp3, brothor.mp3, …) are still used by unit u1 lessons — do not delete. (User has since moved them to `server/public/audio/en/bad/`; rejected phrase cuts live in `server/public/audio/en/wrongly cut/`. Keep both out of slug lookup.)
- Re-cut workflow for phrase boundaries (Aug 2026): span between user-approved neighbor cuts → energy envelope at threshold 0.008 (min run 0.08 s, min gap 0.06 s) for onsets/gaps → whisper large-v3 word timestamps on merged-run spans for interior splits → gemma4 primed judge (informational) → user ear-check. Tooling in `/tmp/opencode/recut.py` (ephemeral).
- Pipeline quirks that produced bad cuts: threshold 0.025 misses quiet fricative onsets (h, s, þ, f) — phrase starts can sit up to ~1 s before the detected run onset; 0.80 s-long cuts (`s + 0.8` end clamp) and durations < ~0.9 s for 3-word phrases mean a merged run / missed boundary. Some adjacent phrases have NO silence gap at all (e.g. 85.08–88.90 s holds three phrases) — envelope can't split those.

## Gemma4 audio verification (llama.cpp)

- Start: `bash /home/christoph/code/start-gemma4.sh` → llama-server on http://127.0.0.1:8081 (gemma4:12b from ollama blobs + `mmproj-gemma-4-12B-it-bf16.gguf`, any-to-any: vision `gemma4uv` + audio `gemma4ua`). Needs ≥10 GB free VRAM — check `nvidia-smi`; stop the server before loading whisper large-v3 (they don't fit together with ASR/ollama processes).
- API: `POST /v1/chat/completions`, content parts `{"type":"input_audio","input_audio":{"data":"<base64 wav 16 kHz mono>","format":"wav"}}`.
- It transcribes Old English clips WELL only when primed with the expected phrase in the prompt; neutral transcription prompts give garbage ("The journey", "It's over.") or empty. It is suggestible (can say YES for a wrong phrase and echo the prompt in HEARD), and multiple-choice prompts are useless (always picks C) — treat its judge output as informational, never a hard gate.
- Working judge prompt: `Listen to the audio clip. The expected Old English phrase is: "<phrase>" Answer in this exact format:\nMATCH: YES or NO\nHEARD: <what you actually hear, word for word>` (max_tokens 250, temperature 0).
- Some clips reliably return empty content with finish_reason=length (reasoning consumes all tokens); retrying with the exact prompt above sometimes fixes it — if a clip keeps failing, mark it unverified for the user's ear.
- `llama-server` needs `--no-mmproj-offload` and `--media-path /tmp/opencode`; logs in `/tmp/opencode/llama-server.log`.

## Whisper / faster-whisper quirks

- Venv: `/tmp/opencode/whisper-venv` (faster-whisper, small + large-v3). Reinstall if /tmp was cleaned.
- `clip_timestamps` in this version takes a FLAT list of floats `[s1, e1, s2, e2, ...]` (not pairs/tuples).
- `Segment` has no `segment_index` attribute; map clips by `sg.start` time instead.
- Word timestamps pad the first word of each segment EARLY by up to ~3 s; some words merge ("God þē" → "Gottse") so cumulative word-index anchoring drifts. That's why the phrase mapping is hardcoded.
- Do NOT pass the full phrase list as `initial_prompt` for word timestamps — it hallucinates splits and garbage timestamps.
- Small model is useless for validating 1 s clips ("This is now fair." everywhere); use large-v3 for content checks. Even large-v3 says "is now fair" for "Se snāw feallþ" on short clips — its WORDS are wrong but word TIMESTAMPS on short spans are still usable split anchors (e.g. split "strang|Mīn" at 70.30 s from a 3 s merged span).
- `/tmp/opencode/final_bounds.json` holds the last accepted 100 phrase bounds — update it after any re-cut so `cut-phrases.py --cut` stays consistent.
- GPU (RTX 4090 Laptop, 16 GB) is shared: OEchat ASR uvicorn, ollama servers, other `python main.py` processes may hold VRAM. Check `nvidia-smi` before loading models; CUDA OOM is transient — retry after the user frees memory.

## Environment quirks

- Linux, German locale: bash `printf` uses comma decimal separators — use `LC_ALL=C` or Python for float formatting.
- Repo IS a git repo (`.git` present) even though environment metadata may say otherwise.
- User prefers step-by-step, verifiable work: cut → transcribe → compare; only re-adjust boundaries when a cut fails verification, and only accept an adjustment if the retry actually verifies (no blind probing).
- For phrase audio the user's rule: "The words don't have to be correct! We only need the anchors for splitting!" — whisper transcripts are only a means to find split points, not a correctness target.
