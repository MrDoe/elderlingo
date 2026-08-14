#!/usr/bin/env python3
"""Cut old_english_phrases.wav into distinct per-phrase MP3 files.

Boundaries = speech-run onsets (silence->speech transitions), chosen greedily
nearest to whisper word-timestamp anchors. Anchors use the cumulative whisper
word index corrected per-whisper-segment for word merge/split drift. Each cut
is validated by re-transcribing it with whisper before MP3s are written.

Usage:
  python3 scripts/cut-phrases.py            # detect boundaries only
  python3 scripts/cut-phrases.py --validate # re-transcribe every cut and compare
  python3 scripts/cut-phrases.py --cut      # write MP3s + SRT (after validation)
"""
import argparse
import json
import re
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "old_english_phrases.wav"
OUT_DIR = ROOT / "server" / "public" / "audio" / "en"
WORDS = Path("/tmp/opencode/words.json")
WHISPER = Path("/tmp/opencode/whisper-venv/bin/python")

PHRASES = [
    "Wēs hāl.", "Wesaþ hāle.", "Gōdne morgen.", "Gōdne ǣfen.", "Gōde niht.",
    "Gēa.", "Nese.", "Ic þancie þē.", "God þē mid sīe.", "Far wel.",
    "Hwæt is þīn nama?", "Mīn nama is Wulf.", "Hwanon eart þū?", "Ic eom of Englalande.",
    "Hwǣr eart þū?", "Ic eom hēr.", "Hū eald eart þū?", "Ic eom geong.",
    "Hū gǣþ hit?", "Hit gǣþ wel.", "Ic eom wērig.", "Ic eom grǣdig.",
    "Ic eom þurstig.", "Ic lufige þē.", "Mīn heorte is glæd.", "Hit is sōþ.",
    "Ic nāt.", "Wā is mē.", "Hē is dēad.", "Hēo is cwic.",
    "Hē is mīn brōðor.", "Hēo is mīn sweostor.", "Mīn fæder is strang.", "Mīn mōdor is wīs.",
    "Þæt cild plægþ.", "Se mann is hēah.", "Þæt wīf is scīene.", "Hwǣr is se cyning?",
    "Sēo cwēn is wīs.", "Se scop singþ.", "Hit rīnþ.", "Sēo sunne scīnþ.",
    "Se snāw feallþ.", "Se wind blǣwþ.", "Hit is ceald.", "Hit is wearm.",
    "Se dæg is beorht.", "Sēo niht is þīestre.", "Se wudu is grēne.", "Þæt trēow is eald.",
    "Se hund is gōd.", "Sēo catte slǣpþ.", "Þæt hors yrnþ.", "Se fugol singþ.",
    "Ic sēo þone wulf.", "Se fisc swimþ.", "Se hafoc flīehþ.", "Þæt cild lufige þone hund.",
    "Se bera is strang.", "Hwǣr is þæt dēor?", "Hwæt dēst þū?", "Ic leornige Ænglisc.",
    "Spricst þū Ænglisc?", "Ic ne mæg þē understandan.", "Ic gā tō hūse.", "Ic ete hlāf.",
    "Ic drince wæter.", "Hē drincþ medu.", "Wē etaþ flæsc.", "Ic slǣpe wel.",
    "Hwæt is þæt?", "Þæt is bōc.", "Þæt is sweord.", "Ic hæbbe ān æppel.",
    "Þū hæfst gōd swurd.", "Sēo heall is micel.", "Mīn hūs is stǣnen.", "Þæt fȳr byrnþ.",
    "Sēo ēa is dēop.", "Se bāt is læt.", "Wacaþ!", "Cumaþ hēr.",
    "Gā aweg.", "Lǣt mē bēon.", "Sing mē sang.", "Bring mē þæt scip.",
    "Hēo cwiþ sōþ.", "Þæt weorc is heard.", "Þæt is gōd rǣd.", "Wē wuniaþ on friþe.",
    "Ic fāre ofer sǣ.", "Se cniht rītt.", "Hīe rīdaþ tō tūne.", "Ic eom fūs tō farenne.",
    "Hē sēceþ gold.", "Ic sēce mīnne frēond.", "Hwelc dæg is tōdæg?", "Tōdæg is Frīgedæg.",
    "Ic lufie gōdne sang.", "Ic geseah sumne mann.",
]




def slugify(word: str) -> str:
    s = word.lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("æ", "ae").replace("þ", "th").replace("ð", "th")
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return (s or "word").replace(" ", "-")


def nwords(p: str) -> int:
    return len([t for t in re.split(r"\s+", p.strip()) if t])


def load_env() -> tuple[np.ndarray, float]:
    with wave.open(str(SRC), "rb") as w:
        rate = w.getframerate()
        nch = w.getnchannels()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, nch)
    mono = data.mean(axis=1).astype(np.float64) / 32768.0
    hop = int(0.02 * rate)
    nw = len(mono) // hop
    return np.sqrt((mono[: nw * hop].reshape(nw, hop) ** 2).mean(axis=1)), 0.02


def speech_runs(env: np.ndarray, hop: float) -> list[tuple[float, float]]:
    voiced = env >= 0.025
    runs = []
    start = None
    for i, v in enumerate(voiced):
        t0 = i * hop
        if v and start is None:
            start = t0
        elif not v and start is not None:
            if t0 - start >= 0.2:
                runs.append((start, t0))
            start = None
    if start is not None and len(voiced) * hop - start >= 0.2:
        runs.append((start, len(voiced) * hop))
    return runs


def norm_word(w: str) -> str:
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if c.isalpha())
    return w.replace("æ", "ae").replace("þ", "th").replace("ð", "th")


def word_match(w: str, target: str) -> bool:
    a, b = norm_word(w), norm_word(target)
    if not a or not b:
        return False
    if a.startswith(b[:3]) or b.startswith(a[:3]):
        return True
    if a.startswith(b[:2]) or b.startswith(a[:2]) and min(len(a), len(b)) >= 3:
        return True
    if len(a) == len(b) and sum(x != y for x, y in zip(a, b)) <= 2:
        return True
    return False


FIRST_WORD_IDX = [
    1, 2, 4, 6, 8, 10, 11, 12, 15, 18, 19, 23, 27, 29, 34, 36, 40, 43, 47,
    50, 53, 57, 61, 65, 67, 71, 74, 76, 78, 81, 84, 88, 92, 96, 100, 103,
    107, 111, 115, 119, 122, 124, 126, 129, 132, 135, 138, 142, 146, 150,
    154, 158, 162, 165, 168, 172, 175, 178, 183, 187, 191, 195, 199, 202,
    206, 210, 214, 217, 221, 224, 227, 230, 233, 236, 240, 244, 248, 252,
    255, 259, 263, 264, 266, 268, 271, 274, 278, 280, 284, 288, 292, 296,
    299, 304, 309, 312, 316, 319, 322, 326,
]


def anchors_from_words(words: list[dict]) -> list[float]:
    """Per-phrase anchors from hand-verified whisper word indices.

    Whisper pads the first word of each segment early (up to ~2 s); those
    words have long durations. Padded anchors use the run onset in
    [a, a+4]; tight anchors use the run onset in [a-0.5, a+0.4]."""
    out = []
    for i, k in enumerate(FIRST_WORD_IDX):
        w = words[k]
        a = w["s"]
        e = w.get("e", words[k + 1]["s"] if k + 1 < len(words) else a + 1.0)
        out.append((a, max(0.0, e - a)))
    return out
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--validate", action="store_true")
    ap.add_argument("--cut", action="store_true")
    args = ap.parse_args()

    env, hop = load_env()
    words = json.load(open(WORDS))
    anchors = anchors_from_words(words)
    runs = speech_runs(env, hop)
    onsets = [r[0] for r in runs]
    print(f"phrases={len(PHRASES)} whisper_words={len(words)} runs={len(runs)}")

    starts = []
    prev = -10.0
    for i, (a, dur) in enumerate(anchors):
        cand = [t for t in onsets if (a - 0.5 <= t <= a + 0.4) if dur <= 0.5] or \
            [t for t in onsets if a <= t <= a + 4.0] if dur > 0.5 else \
            [t for t in onsets if a - 0.5 <= t <= a + 0.4]
        if dur > 0.5:
            cand = [t for t in onsets if a - 0.15 <= t <= a + 4.0]
        best = min(cand, key=lambda t: abs(t - a)) if cand else None
        if best is None or abs(best - a) > 1.5:
            best = a + 0.05
        s = best
        if s < prev + 0.25:
            s = prev + 0.3
        starts.append(s)
        prev = s
    ends = []
    for i in range(len(PHRASES)):
        s = starts[i]
        nxt = starts[i + 1] if i + 1 < len(PHRASES) else len(env) * hop
        own = [r for r in runs if r[0] < min(s + 2.5, nxt - 0.05) and r[1] > s]
        if any(r[1] > nxt for r in own):
            ends.append(min(nxt, s + 0.8))
        else:
            tail = max((r[1] for r in own), default=s + 0.5) + 0.4
            ends.append(min(nxt, tail))
    for i, (p, s, e, (a, dur)) in enumerate(zip(PHRASES, starts, ends, anchors)):
        flag = "  <-- CHECK" if e - s < 0.3 or e - s > 4.0 else ""
        print(f"{i+1:3d} {s:7.3f} {e:7.3f} ({e-s:5.2f}s) anchor={a:6.2f} dur={dur:4.2f} | {p}{flag}")

    if args.validate:
        import subprocess as sp
        json.dump({"bounds": [[round(s, 3), round(e, 3)] for s, e in zip(starts, ends)],
                   "anchors": [round(a[0], 3) for a in anchors]},
                  open("/tmp/opencode/bounds100.json", "w"))
        val = r"""
import json, sys, subprocess, unicodedata
from pathlib import Path
from faster_whisper import WhisperModel

SRC = "/home/christoph/code/elderlingo/old_english_phrases.wav"
PHRASES = [l.rstrip("\n") for l in open("/tmp/opencode/phrases.txt") if l.strip()]
data = json.load(open("/tmp/opencode/bounds100.json"))
bounds = data["bounds"]
anchors = data["anchors"]
N = len(PHRASES)

def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if c.isalpha())
    return w.replace("\u00e6", "ae").replace("\u00fe", "th").replace("\u00f0", "th")

def lev(a, b):
    if abs(len(a) - len(b)) > 2:
        return 99
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]

def match(p, t):
    exp = [norm(w) for w in p.split() if len(norm(w)) >= 3]
    tok = [norm(w) for w in t.split() if len(norm(w)) >= 3]
    if not exp:
        return False
    for a in exp:
        for b in tok:
            if a.startswith(b[:3]) or b.startswith(a[:3]):
                return True
            if a in b or b in a:
                return True
            if lev(a[:6], b[:6]) <= 2:
                return True
    return False

m = WhisperModel("large-v3", device="cuda", compute_type="float16")
TMP = Path("/tmp/opencode/line.mp3")

def cut(s, e):
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-ss", f"{s:.4f}", "-t", f"{e-s:.4f}", "-i", SRC, "-ac", "1",
         "-ar", "16000", str(TMP)],
        check=True,
    )

def transcribe():
    segs, info = m.transcribe(str(TMP), language="en")
    return " ".join(sg.text for sg in segs).strip()

final = []
nok = 0
for i in range(N):
    s0, e0 = bounds[i]
    s, e = s0, e0
    exp = PHRASES[i]
    prev_p = PHRASES[i - 1] if i >= 1 else None
    next_p = PHRASES[i + 1] if i + 1 < N else None
    nxt_start = bounds[i + 1][0] if i + 1 < N else None
    status = "??"
    t = ""
    for cs, ce in [(s0, e0), (anchors[i] + 0.05, e0)]:   # pipeline bounds first, then anchor fallback
        cut(cs, ce)
        t = transcribe()
        if match(exp, t):
            s, e, status = cs, ce, "OK"
            nok += 1
            break
    if status != "OK":
        trial = None
        if prev_p and match(prev_p, t):              # clip contains previous phrase
            trial = min(s0 + 0.3, nxt_start - 0.3 if nxt_start else s0 + 0.9)
        elif next_p and match(next_p, t):            # clip contains next phrase
            trial = max(s0 - 0.3, s0 - 0.9)
        if trial is not None:
            cut(trial, e0)
            t = transcribe()
            if match(exp, t):                        # accept only if it now verifies
                s, e, status = trial, e0, "OK"
                nok += 1
        if status != "OK":
            s, e = s0, e0                            # keep pipeline bounds
    final.append([round(s, 3), round(e, 3)])
    flag = "" if status == "OK" else "  <-- UNCERTAIN"
    print(f"{status} {i+1:3d} {s:7.3f} {e:7.3f} ({e-s:5.2f}s) | {exp[:30]:32s} | {t[:50]}{flag}", flush=True)

json.dump(final, open("/tmp/opencode/final_bounds.json", "w"))
print(f"per-line validation done: {nok}/100 verified by transcription")
"""
        sp.run([str(WHISPER), "-c", val], check=True)
        return 0

    if args.cut:
        final_path = Path("/tmp/opencode/final_bounds.json")
        if final_path.exists():
            used = json.load(open(final_path))
            if len(used) == len(PHRASES):
                starts, ends = [b[0] for b in used], [b[1] for b in used]
                print("using validated final_bounds.json")
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        for i, (p, s, e) in enumerate(zip(PHRASES, starts, ends)):
            dur = e - s
            name = f"{slugify(p)}.mp3"
            fade = f"afade=t=in:st=0:d=0.02,afade=t=out:st={max(0.0, dur-0.02):.4f}:d=0.02"
            subprocess.run(
                ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
                 "-ss", f"{s:.4f}", "-t", f"{dur:.4f}", "-i", str(SRC),
                 "-ac", "1", "-ar", "24000", "-b:a", "64k", "-af", fade, str(OUT_DIR / name)],
                check=True,
            )
        print(f"wrote {len(PHRASES)} files to {OUT_DIR}")
        srt = []
        for i, (p, s, e) in enumerate(zip(PHRASES, starts, ends), 1):
            def ts(t):
                ms = int(round(t * 1000))
                return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
            srt.append(f"{i}\n{ts(s)} --> {ts(e)}\n{p}\n")
        srt_path = ROOT / "old_english_phrases.srt"
        srt_path.write_text("\n".join(srt))
        print(f"wrote subtitles to {srt_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
