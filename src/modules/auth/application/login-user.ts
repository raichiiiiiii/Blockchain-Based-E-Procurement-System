import type { PlatformUserCredentialRepository } from './platform-user-credential-repository.js';
import type { AuthSessionRepository } from './auth-session-repository.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import type { AuthSession } from '../domain/auth-session.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import { randomBytes, timingSafeEqual, createHash } from 'node:crypto';

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResult {
  sessionToken: string;
  sessionId: string;
  expiresAt: string;
  actor: {
    actorUserId: string;
    actorOrganizationId?: string;
    actorRoleCodes: string[];
    authenticationSessionId: string;
    authenticationMethod: 'localPassword';
  };
}

export class LoginUserError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'LoginUserError';
  }
}

export class LoginUserService {
  constructor(
    private readonly credentialRepository: PlatformUserCredentialRepository,
    private readonly sessionRepository: AuthSessionRepository
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    // Validate input
    if (!input.username || input.username.trim() === '') {
      throw createApplicationValidationError('Username is required');
    }

    if (!input.password) {
      throw createApplicationValidationError('Password is required');
    }

    // Trim username but not password as per contract
    const trimmedUsername = input.username.trim();

    // Find credential
    const credential = await this.credentialRepository.findByUsername(trimmedUsername);
    if (!credential) {
      // Don't reveal that username doesn't exist
      throw new LoginUserError('UNAUTHORIZED', 'Invalid username or password');
    }

    // Verify password
    if (!this.verifyPassword(input.password, credential.passwordHash)) {
      throw new LoginUserError('UNAUTHORIZED', 'Invalid username or password');
    }

    // Create session
    const sessionToken = this.generateSessionToken();
    const tokenHash = this.hashToken(sessionToken);
    
    // Calculate expiry (8 hours from now as per contract)
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + 8 * 60 * 60 * 1000);

    const session: AuthSession = {
      sessionId: `session_${randomBytes(16).toString('hex')}`,
      tokenHash,
      actorUserId: credential.userId,
      actorOrganizationId: undefined, // Not available in current credential model
      actorRoleCodes: [], // No roles in current model
      status: 'active',
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      authenticationMethod: 'localPassword'
    };

    // Save session
    await this.sessionRepository.save(session);

    // Return result with raw token only in response
    return {
      sessionToken,
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      actor: {
        actorUserId: session.actorUserId,
        actorOrganizationId: session.actorOrganizationId,
        actorRoleCodes: session.actorRoleCodes,
        authenticationSessionId: session.sessionId,
        authenticationMethod: session.authenticationMethod
      }
    };
  }

  private verifyPassword(password: string, hash: string): boolean {
    try {
      const hashedPassword = createHash('sha256').update(password).digest('hex');
      return timingSafeEqual(
        Buffer.from(hashedPassword, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch {
      return false;
    }
  }

  private generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
