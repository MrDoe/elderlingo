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
- Cut MP3s live in `server/public/audio/speaker/` (24 kHz mono, 64 kbps, slugs = `slugify(phrase)`), served by `GET /api/audio/:voice/:slug.mp3` (voices: de|speaker). ALL lesson audio is served with voice `speaker` from `audio/speaker/` — word entries AND phrasebook. Lessons must never use runtime TTS (the browser speechSynthesis fallback was removed from `client/src/audio.ts`); missing files are pre-generated instead.
- `scripts/generate-audio.ts` pre-generates missing lesson audio with the SAME pipeline as chat (`/api/tts` → `ttsInput()`): `transliterate(entry.word)` (OE → German phonetic script via `shared/oedict.ts`) → Chatterbox zero-shot clone (`infra/voices/narrator_sample.wav`) → MP3 into `audio/speaker/`. Idempotent: existing files — including real narrator phrase cuts — are never overwritten. `scripts/regenerate-audio.sh` runs it in a restart-and-resume loop (Chatterbox throws CUDA device-side asserts; `docker restart chatterbox-tts-api` resets it).
- `scripts/cut-phrases.py` — boundary detection + validation + cutting. It depends on `/tmp/opencode/words.json` (whisper word timestamps) and `/tmp/opencode/phrases.txt` (100 phrases, one per line) — both are EPHEMERAL (/tmp). Re-derive with `/tmp/opencode/whisper-venv` if lost.
- Phrase→whisper-word index mapping is HAND-VERIFIED, hardcoded in `FIRST_WORD_IDX`. Do not regenerate it blindly from a whisper run.
- Re-cut workflow for phrase boundaries (Aug 2026): span between user-approved neighbor cuts → energy envelope at threshold 0.008 (min run 0.08 s, min gap 0.06 s) for onsets/gaps → whisper large-v3 word timestamps on merged-run spans for interior splits → gemma4 primed judge (informational) → user ear-check. Tooling in `/tmp/opencode/recut.py` (ephemeral).
- 9 of the 100 phrase cuts are missing (they sit in merged runs the envelope could not split) — those slugs currently hold pre-generated TTS placeholders from `generate-audio.ts`; replace them with real cuts whenever the source WAV yields them.
- Pipeline quirks that produced bad cuts: threshold 0.025 misses quiet fricative onsets (h, s, þ, f) — phrase starts can sit up to ~1 s before the detected run onset; 0.80 s-long cuts (`s + 0.8` end clamp) and durations < ~0.9 s for 3-word phrases mean a merged run / missed boundary. Some adjacent phrases have NO silence gap at all (e.g. 85.08–88.90 s holds three phrases) — envelope can't split those.

## Phonetics-check pipeline (Allosaurus + whisper)

- Purpose: verify that each mp3 in `server/public/audio/speaker/` is phonetically correct against its expected Old English text. Iterative tuning produced big gains; keep the loop.
- Venv: `scripts/.venv` (torch CUDA 13 + allosaurus 1.0.2 + faster-whisper 1.2.1). Allosaurus model `uni2005` (PANPHON 2005, universal IPA) auto-downloaded into the venv's site-packages. Run scripts with `scripts/.venv/bin/python`.
- Expected references: `scripts/phrase-ipa.ts` (hand-derived strict IPA for the 98 phrasebook phrases, via altenglisch-lautschrift rules) + hand-curated `ipa` in `content/units.ts`. Merged into `scripts/.phonetics/mapping.json` by `npx tsx scripts/dump-audio-mapping.ts` (146 unique slugs; word entries with ipa override duplicate phrase entries).
- `scripts/phonetics_lib.py` — IPA→PANPHON conversion (fallbacks ɑː→aː, æː→æ, yː→y, ɡ→g, strip ˈ/ˌ and syllable dots), OE phone inventory (`scripts/.phonetics/oe-inventory.txt`), Levenshtein PER, custom CTC Viterbi forced alignment on raw AM logits. WARNING: PANPHON unit ids are 1-based (blank=0) — domain list from `phone.txt` is 0-based, so ids = `domain.index(p) + 1`.
- `scripts/allosaurus-tune.py` — numpy-level variant sweeps (mask lang_id: `ipa` | `deu` | OE inventory file path; `emit` blank divisor; per-clip prior on expected phones added to logits; adaptive emit = bisect emit so hyp length ≈ ref length). `--gpu` runs AM on CUDA (15 s vs ~5 min CPU). Results → `scripts/.phonetics/allosaurus-results.json`.
- `scripts/whisper-tune.py` — faster-whisper large-v3 sweep (language, initial_prompt, vad_filter, hallucination_silence_threshold) with CER + windowed CER (min CER over sliding windows — padding-robust for sub-second clips). WARNING: whisper output uses PRECOMPOSED macrons (ē U+0113) — NFD-normalize before stripping diacritics or normalization silently drops whole letters.
- `scripts/compare-phonetics.ts` — joins best variants → verdicts → `scripts/.phonetics/phonetics-check.md` (columns: OE | expected IPA | tuned Allosaurus IPA | OE-primed whisper | wCER | PER | verdict). Verdict: OK if wCER < 0.2 or (contained && align conf ≥ 0.2); SUSPECT < 0.5 / conf ≥ 0.25 / contained; else BAD.
- Best configs found (Aug 2026): Allosaurus = OE inventory mask + expected-phone prior w=4 + adaptive emit, mean PER 0.505 (baseline ipa mask 0.870); Whisper = `initial_prompt="Old English: <phrase>"` + `condition_on_previous_text=False`, mean wCER 0.072 (baseline auto 0.509). VAD filter and hallucination_silence_threshold HURT short clips. Verdicts were 133 OK / 10 SUSPECT / 3 BAD.
- Known artifacts: whisper hallucinates on sub-second single-word clips ("Grrrrrr…" for þū, "yikes" for siex, "Aiii!" for hīe) even when the audio is correct — allosaurus alignment conf is the tiebreaker there; files where whisper switches to a foreign script (Hebrew/Arabic/Greek) are usually fine audio but worth an ear-check. Remaining ear-check list (both engines degrade): twā, lēof, þū, se-hafoc-fliehþ, sing-me-sang, þæt-is-boc.

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
