import type { AuthSession } from '../domain/auth-session.js';
import type { AuthSessionRepository } from '../application/auth-session-repository.js';

export class InMemoryAuthSessionRepository implements AuthSessionRepository {
  private readonly sessions: AuthSession[] = [];

  async save(session: AuthSession): Promise<AuthSession> {
    // Check if session with same sessionId already exists
    const existingIndex = this.sessions.findIndex(s => s.sessionId === session.sessionId);
    
    if (existingIndex >= 0) {
      // Update existing session
      this.sessions[existingIndex] = { ...session };
      return { ...this.sessions[existingIndex] };
    } else {
      // Add new session
      const newSession = { ...session };
      this.sessions.push(newSession);
      return { ...newSession };
    }
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.find(s => s.sessionId === sessionId);
    return session ? { ...session } : null;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    const session = this.sessions.find(s => s.tokenHash === tokenHash);
    return session ? { ...session } : null;
  }
}