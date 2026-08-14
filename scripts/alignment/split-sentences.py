#!/usr/bin/env python3
"""Split the narrator recording into one MP3 per transcript sentence.

Pipeline:
  1. Whisper word timestamps (scripts/alignment/whisper-transcribe.py) provide
     the speech timeline. Whisper's *text* is unreliable for Old English, but
     its word *timestamps* track the audio.
  2. The transcript (scripts/alignment/transcript.txt) has ~the same word count,
     so sentence boundaries are placed at proportional positions, then refined
     with a fuzzy match of the sentence's last word against nearby whisper words.
  3. ffmpeg cuts each sentence (with leading/trailing silence trimmed) and
     encodes 24 kHz mono MP3 into server/public/audio/speaker/<NNN>-<slug>.mp3,
     plus a manifest.json mapping each clip to its sentence text.

Usage:
  python3 scripts/alignment/split-sentences.py narrator-sample.wav whisper_words.json
"""

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SRC = Path(sys.argv[1] if len(sys.argv) > 1 else "narrator-sample.wav")
WHISPER = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/opencode/whisper_words.json")
TRANSCRIPT = ROOT / "scripts" / "alignment" / "transcript.txt"
OUT_DIR = ROOT / "server" / "public" / "audio" / "speaker"

DIACRITICS = {
    "ā": "a", "æ": "ae", "ǣ": "ae", "ē": "e", "ī": "i", "ō": "o", "ū": "u",
    "ȳ": "y", "þ": "th", "ð": "th", "ą": "a", "ę": "e", "ǫ": "o", "é": "e",
}


def norm(w: str) -> str:
    w = w.lower().strip().strip(".,!?;:""''()-")
    return "".join(DIACRITICS.get(c, c) for c in w)


def lev(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


sentences = [s.strip() for s in TRANSCRIPT.read_text().splitlines() if s.strip()]
sent_words = [re.findall(r"\S+", s) for s in sentences]
n_sent = len(sentences)

words = json.loads(WHISPER.read_text())
n_whisper = len(words)


def cost(a: str, b: str) -> float:
    """Match cost: near-exact matches dominate so the DTW path locks onto them."""
    if a == b:
        return 0.0
    d = lev(a, b)
    if d == 1:
        return 0.5
    return 2.0 * d


def align(sent_words: list[list[str]], words: list[dict]) -> list[tuple[float, float]]:
    """Global DTW over words. Returns (start_time, end_time) per sentence."""
    tw = [norm(w) for sw in sent_words for w in sw]
    ww = [norm(w["w"]) for w in words]
    n_t, n_w = len(tw), len(ww)

    INF = 10**6
    SKIP_T = 5.0  # unmatched transcript word (must never be free)
    SKIP_W = 0.5  # unmatched whisper word (over-splitting tolerance)
    dtw = [[INF] * (n_w + 1) for _ in range(n_t + 1)]
    dtw[0][0] = 0.0
    for i in range(1, n_t + 1):
        for j in range(1, n_w + 1):
            dtw[i][j] = min(
                dtw[i - 1][j - 1] + cost(tw[i - 1], ww[j - 1]),
                dtw[i - 1][j] + SKIP_T,
                dtw[i][j - 1] + SKIP_W,
            )

    # traceback: pos[i] = whisper word index current when transcript word i
    # was processed (records trailing skipped whisper words too, so a sentence
    # keeps words whisper split off its end, e.g. "lufige" -> "lufi e")
    pos = [-1] * n_t
    i, j = n_t, n_w
    while i > 0 and j > 0:
        pos[i - 1] = j - 1
        diag = dtw[i - 1][j - 1] + cost(tw[i - 1], ww[j - 1])
        up = dtw[i - 1][j] + SKIP_T
        left = dtw[i][j - 1] + SKIP_W
        if diag <= up and diag <= left:
            i, j = i - 1, j - 1
        elif up <= left:
            i -= 1
        else:
            j -= 1

    # boundaries: start = first whisper word after the previous sentence's last
    # matched word, end = whisper end of the sentence's last word
    boundaries = []
    t_idx = 0
    prev_j = -1
    for sw in sent_words:
        e_j = pos[t_idx + len(sw) - 1]
        boundaries.append((words[prev_j + 1]["s"], words[e_j]["e"]))
        prev_j = e_j
        t_idx += len(sw)
    return boundaries


def energy_envelope(path_audio: str, win_ms: int = 20) -> tuple[list[float], float]:
    """RMS energy envelope (one value per window) of the source audio."""
    import av

    container = av.open(path_audio)
    stream = container.streams.audio[0]
    resampler = av.AudioResampler(format="s16", layout="mono", rate=24000)
    hop = 24000 * win_ms // 1000
    envelope: list[float] = []
    frame = None
    while True:
        try:
            raw = next(container.decode(stream))
        except StopIteration:
            break
        for r in resampler.resample(raw):
            buf = r.to_ndarray()[0]
            for off in range(0, len(buf) - hop + 1, hop):
                chunk = buf[off : off + hop].astype(float)
                envelope.append(float((chunk**2).mean()) ** 0.5)
    container.close()
    win = win_ms / 1000.0
    envelope.insert(0, envelope[0])
    return envelope, win


def refine_boundaries(
    boundaries: list[tuple[float, float]],
    envelope: list[float],
    win: float,
) -> list[tuple[float, float]]:
    """Fix up zero-length sentences (whisper dropped their words).

    A dropped sentence collapses onto the previous boundary; it lies in the
    audio gap before the next matched word. Its end is split at the last deep
    energy valley in that gap, and starts never precede the previous end.
    """
    ends = [b[1] for b in boundaries]
    out = []
    prev_end = 0.0
    for i, (s, e) in enumerate(boundaries):
        if e <= s + 0.15:
            s = prev_end
            lo_i = int(prev_end / win)
            hi_i = max(lo_i + 1, int((e + 1.2) / win))
            window = envelope[lo_i:hi_i]
            peak = max(window) if window else 0.0
            hit = None
            if peak > 0:
                for k in range(len(window) - 1, -1, -1):
                    if window[k] < 0.25 * peak:
                        hit = (lo_i + k) * win
                        break
            e = max(s + 0.1, hit) if hit else s + 0.35
        elif s < prev_end:
            s = prev_end
        out.append((s, e))
        prev_end = e
    return out


if __name__ == "__main__":
    DRY = "--dry-run" in sys.argv
    boundaries = refine_boundaries(align(sent_words, words), *energy_envelope(str(SRC)))

    if DRY:
        for i, (start, end) in enumerate(boundaries):
            dur = end - start
            flag = "  <<<<" if dur < 0.45 or dur > 3.5 else ""
            print(f"{i + 1:3d} {start:6.3f}-{end:6.3f} {dur:5.2f}s  {sentences[i]}{flag}")
        raise SystemExit

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    for i, (start, end) in enumerate(boundaries):
        dur = end - start
        if dur < 0.15:
            continue
        slug = "".join(DIACRITICS.get(c, c) if c.isalnum() else "-" for c in sent_words[i][0].lower()) or f"s{i+1}"
        out = OUT_DIR / f"{i + 1:03d}-{slug}.mp3"
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(SRC), "-ss", f"{start:.3f}", "-t", f"{dur:.3f}",
                "-af", "aresample=24000",
                "-ac", "1", "-codec:a", "libmp3lame", "-q:a", "3", str(out),
            ],
            check=True,
        )
        manifest.append({"file": out.name, "text": sentences[i]})
        print(f"  ✓ {i + 1:03d} {start:7.3f}-{end:7.3f}  {sentences[i]}")

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f"Done: {len(manifest)} clips in {OUT_DIR}")
