import type { ApiUnit, AudioStatus, Lesson, LessonCompleteRequest, LessonCompleteResult, UserPublic } from '../../shared/types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  register: (email: string, name: string, password: string) =>
    request<UserPublic>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),
  login: (email: string, password: string) =>
    request<UserPublic>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => request<UserPublic>('/api/auth/me'),
  setVoice: (voice: 'en' | 'de') =>
    request<UserPublic>('/api/auth/voice', {
      method: 'POST',
      body: JSON.stringify({ voice }),
    }),
  units: () => request<ApiUnit[]>('/api/units'),
  lesson: (id: string) => request<Lesson>(`/api/lessons/${id}`),
  completeLesson: (id: string, payload: LessonCompleteRequest) =>
    request<LessonCompleteResult>(`/api/lessons/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  audioStatus: () => request<AudioStatus>('/api/audio/status'),
};

export function audioUrl(voice: 'en' | 'de', slug: string): string {
  return `/api/audio/${voice}/${slug}.mp3`;
}