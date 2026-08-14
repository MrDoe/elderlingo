import { useEffect, useState } from 'react';
import { HEARTS_PER_LESSON } from '../../../shared/types';

export function HeartBar({ hearts }: { hearts: number }) {
  const [lostIdx, setLostIdx] = useState<number | null>(null);

  useEffect(() => {
    if (hearts >= HEARTS_PER_LESSON) return;
    setLostIdx(hearts);
    const t = setTimeout(() => setLostIdx(null), 900);
    return () => clearTimeout(t);
  }, [hearts]);

  return (
    <div className="hearts" aria-label={`${hearts} hearts left`}>
      {Array.from({ length: HEARTS_PER_LESSON }, (_, i) => {
        const cls = i < hearts ? 'heart heart--full' : 'heart';
        return (
          <span key={i} className={`${cls}${i === lostIdx ? ' heart--lost' : ''}`}>
            {i < hearts ? '❤️' : '🤍'}
          </span>
        );
      })}
    </div>
  );
}
