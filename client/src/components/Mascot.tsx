export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited';

const SPEECH: Record<MascotMood, string> = {
  idle: '',
  happy: 'Wundorlīc!',
  sad: 'Nā nā!',
  excited: 'Wēs hāl!',
};

export function Mascot({ mood }: { mood: MascotMood }) {
  const text = SPEECH[mood];
  return (
    <div className={`mascot mascot--${mood}`} aria-hidden="true">
      {text && <div className="mascot-speech">{text}</div>}
      <div className="mascot-bird">🦉</div>
    </div>
  );
}
