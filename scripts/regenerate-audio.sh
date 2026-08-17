#!/usr/bin/env bash
# Regenerate missing audio; on CUDA assert (context corruption), restart the
# Chatterbox container and resume until all files are generated.
set -u
cd "$(dirname "$0")/.."
MISSING_SPEAKER=$(ls server/public/audio/speaker 2>/dev/null | wc -l)
echo "existing: speaker=$MISSING_SPEAKER"

for round in $(seq 1 40); do
  OUT=$(npm run generate-audio 2>&1 | grep -vE "^npm notice")
  echo "$OUT" | grep -E "Generating|Done"
  if echo "$OUT" | grep -q "Done: [0-9]*/0"; then break; fi
  if echo "$OUT" | grep -qE "✗"; then
    echo "== round $round had failures — restarting chatterbox (CUDA reset)"
    docker restart chatterbox-tts-api > /dev/null
    for i in $(seq 1 60); do
      H=$(curl -s --max-time 3 http://localhost:4123/health 2>/dev/null)
      echo "$H" | grep -q '"healthy"' && break
      sleep 10
    done
    echo "health: $(echo "$H" | head -c 40)"
  fi
done
