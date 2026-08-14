export const TTS_URL = process.env.CHATTERBOX_URL ?? 'http://localhost:4123';

export async function chatterboxOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${TTS_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listVoices(): Promise<string[]> {
  try {
    const res = await fetch(`${TTS_URL}/voices`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return [];
    const body = (await res.json()) as { voices?: { name: string }[] };
    return body.voices?.map((v) => v.name) ?? [];
  } catch {
    return [];
  }
}