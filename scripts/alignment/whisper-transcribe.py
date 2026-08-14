#!/usr/bin/env python3
"""Transcribe narrator-sample.wav with faster-whisper, dump word timestamps as JSON."""
import json
import sys
from faster_whisper import WhisperModel

SRC = sys.argv[1] if len(sys.argv) > 1 else "narrator-sample.wav"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/tmp/opencode/whisper_words.json"
MODEL = "large-v3"

model = WhisperModel(MODEL, device="cuda", compute_type="float16")
segments, info = model.transcribe(SRC, language="en", word_timestamps=True, vad_filter=False)

words = []
for seg in segments:
    for w in seg.words:
        words.append({"w": w.word, "s": round(w.start, 3), "e": round(w.end, 3)})

with open(OUT, "w") as f:
    json.dump(words, f)
print(f"{len(words)} words -> {OUT}")