import type { AuthSession } from '../domain/auth-session.js';

export interface AuthSessionRepository {
  save(session: AuthSession): Promise<AuthSession>;
  findById(sessionId: string): Promise<AuthSession | null>;
  findByTokenHash(tokenHash: string): Promise<AuthSession | null>;
}