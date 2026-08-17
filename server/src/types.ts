import type { ChatTurn, UserPublic } from '../../shared/types';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    turns?: ChatTurn[];
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
};

export function toUserPublic(row: UserRow): UserPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    xp: row.xp,
    streak: row.streak,
  };
}
