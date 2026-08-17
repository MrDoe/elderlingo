import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { isMuted, toggleMuted } from '../sfx';

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [muted, setMutedState] = useState(isMuted());
  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        🏰 Elderlingo
      </Link>
      <div className="navbar-right">
        <span className="badge" title="XP">
          ⚡ {user.xp}
        </span>
        <span className="badge" title="Day streak">
          🔥 {user.streak}
        </span>
        <button
          type="button"
          className="nav-link nav-link--btn"
          title={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          onClick={() => setMutedState(toggleMuted())}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <Link to="/chat" className="nav-link">
          Chat
        </Link>
        <Link to="/profile" className="nav-link">
          Profl
        </Link>
        <button
          type="button"
          className="nav-link nav-link--btn"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  );
}