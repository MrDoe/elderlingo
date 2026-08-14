import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { UserPublic, Voice } from '../../shared/types';
import { api } from './api';
import { NavBar } from './components/NavBar';
import { LessonPage } from './pages/LessonPage';
import { LoginPage } from './pages/LoginPage';
import { PathPage } from './pages/PathPage';
import { ProfilePage } from './pages/ProfilePage';
import { RegisterPage } from './pages/RegisterPage';

interface AuthContextValue {
  user: UserPublic | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setVoice: (voice: Voice) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await api.login(email, password));
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    setUser(await api.register(email, name, password));
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const setVoice = useCallback(async (voice: Voice) => {
    setUser(await api.setVoice(voice));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setVoice }}>
      {children}
    </AuthContext.Provider>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-center">Ġehiert þæt…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <NavBar />
              <PathPage />
            </Protected>
          }
        />
        <Route
          path="/lesson/:id"
          element={
            <Protected>
              <LessonPage />
            </Protected>
          }
        />
        <Route
          path="/profile"
          element={
            <Protected>
              <NavBar />
              <ProfilePage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}