export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited';

const SPEECH: Record<MascotMood, string> = {
  idle: '',
  happy: 'Wundorlīc!',
  sad: 'Nā nā!',
  excited: 'Wēs hāl!',
};

interface MascotProps {
  mood: MascotMood;
  text?: string;
  speaking?: boolean;
  onClick?: () => void;
  variant?: 'lesson' | 'summary';
}

export function Mascot({ mood, text, speaking, onClick, variant }: MascotProps) {
  const bubble = mood === 'idle' ? (text ?? '') : SPEECH[mood];
  const bird = <span className="mascot-bird">🦉</span>;
  return (
    <div
      className={`mascot mascot--${mood}${speaking ? ' mascot--speaking' : ''}${onClick ? ' mascot--clickable' : ''}${
        variant ? ` mascot--${variant}` : ''
      }`}
      aria-hidden={!onClick}
    >
      {bubble && <div className="mascot-speech">{bubble}</div>}
      {onClick ? (
        <button type="button" className="mascot-btn" onClick={onClick} aria-label="Play audio" title="Play audio">
          {bird}
        </button>
      ) : (
        bird
      )}
    </div>
  );
}
