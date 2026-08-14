import type { UserPublic, Voice } from '../../shared/types';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export type UserRow = {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  xp: number;
  streak: number;
  last_activity_date: string | null;
  voice: Voice;
};

export function toUserPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    xp: row.xp,
    streak: row.streak,
    voice: row.voice,
  };
}
