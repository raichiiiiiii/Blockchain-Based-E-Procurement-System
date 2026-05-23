import type { AuthSessionRepository } from './auth-session-repository.js';
import type { AuthSession } from '../domain/auth-session.js';
import { hashToken, isSessionExpired } from './session-token.js';

export class LogoutUserError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'LogoutUserError';
  }
}

export class LogoutUserService {
  constructor(
    private readonly sessionRepository: AuthSessionRepository
  ) {}

  async logout(authorizationHeader: string | undefined): Promise<void> {
    if (!authorizationHeader) {
      throw new LogoutUserError('UNAUTHORIZED', 'Authentication required');
    }

    const bearerPrefix = 'Bearer ';
    if (!authorizationHeader.startsWith(bearerPrefix)) {
      throw new LogoutUserError('UNAUTHORIZED', 'Invalid authorization header');
    }

    const token = authorizationHeader.substring(bearerPrefix.length);
    if (!token.trim()) {
      throw new LogoutUserError('UNAUTHORIZED', 'Invalid authorization header');
    }

    const tokenHash = hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new LogoutUserError('UNAUTHORIZED', 'Invalid or expired session');
    }

    if (session.status === 'revoked' || session.status === 'expired' || isSessionExpired(session.expiresAt)) {
      throw new LogoutUserError('UNAUTHORIZED', 'Invalid or expired session');
    }

    const updatedSession: AuthSession = {
      ...session,
      status: 'revoked',
      revokedAt: new Date().toISOString()
    };

    await this.sessionRepository.save(updatedSession);
  }
}
