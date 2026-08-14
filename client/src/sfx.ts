let ctx: AudioContext | null = null;
let muted = localStorage.getItem('elderlingo.muted') === '1';

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  glideTo?: number,
) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env);
  env.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  click() {
    tone(880, 0, 0.06, 'sine', 0.05);
  },
  correct() {
    tone(659.25, 0, 0.12, 'sine', 0.18);
    tone(987.77, 0.09, 0.24, 'sine', 0.18);
  },
  wrong() {
    tone(196, 0, 0.18, 'sawtooth', 0.07, 147);
    tone(147, 0.15, 0.26, 'sawtooth', 0.07, 98);
  },
  heartLost() {
    tone(392, 0, 0.16, 'sine', 0.12, 311);
    tone(311, 0.14, 0.26, 'sine', 0.12, 233);
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.16));
    tone(1318.51, 0.46, 0.55, 'triangle', 0.18);
  },
};

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  localStorage.setItem('elderlingo.muted', muted ? '1' : '0');
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
