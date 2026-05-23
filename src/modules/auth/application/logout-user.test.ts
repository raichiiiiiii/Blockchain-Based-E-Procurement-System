import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomBytes, createHash } from 'node:crypto';
import { LogoutUserService } from './logout-user.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import type { AuthSession } from '../domain/auth-session.js';

function hashTestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    sessionId: `session_${randomBytes(16).toString('hex')}`,
    tokenHash: hashTestToken(randomBytes(32).toString('hex')),
    actorUserId: 'user-123',
    actorOrganizationId: 'org-123',
    actorRoleCodes: ['auditor'],
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
    ...overrides
  };
}

describe('LogoutUserService', () => {
  let logoutService: LogoutUserService;
  let sessionRepository: InMemoryAuthSessionRepository;

  beforeEach(() => {
    sessionRepository = new InMemoryAuthSessionRepository();
    logoutService = new LogoutUserService(sessionRepository);
  });

  it('should successfully logout with valid token', async () => {
    const session = createTestSession();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const authHeader = `Bearer ${token}`;
    await logoutService.logout(authHeader);

    const revokedSession = await sessionRepository.findByTokenHash(tokenHash);
    assert.ok(revokedSession);
    assert.equal(revokedSession.status, 'revoked');
    assert.ok(revokedSession.revokedAt);
  });

  it('should throw error when authorization header is missing', async () => {
    await assert.rejects(
      async () => await logoutService.logout(undefined),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Authentication required');
        return true;
      }
    );
  });

  it('should throw error when authorization header is malformed', async () => {
    await assert.rejects(
      async () => await logoutService.logout('InvalidHeader'),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid authorization header');
        return true;
      }
    );
  });

  it('should throw error when authorization header has unsupported scheme', async () => {
    await assert.rejects(
      async () => await logoutService.logout('Basic someToken'),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid authorization header');
        return true;
      }
    );
  });

  it('should throw error when token is empty', async () => {
    await assert.rejects(
      async () => await logoutService.logout('Bearer '),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid authorization header');
        return true;
      }
    );
  });

  it('should throw error when token is invalid', async () => {
    await assert.rejects(
      async () => await logoutService.logout('Bearer invalidToken'),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid or expired session');
        return true;
      }
    );
  });

  it('should throw error when session is already revoked', async () => {
    const session = createTestSession({ status: 'revoked' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await assert.rejects(
      async () => await logoutService.logout(`Bearer ${token}`),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid or expired session');
        return true;
      }
    );
  });

  it('should throw error when session is expired', async () => {
    const session = createTestSession({
      status: 'active',
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await assert.rejects(
      async () => await logoutService.logout(`Bearer ${token}`),
      (error) => {
        assert.ok(error instanceof LogoutUserService.LogoutUserError);
        assert.equal(error.code, 'UNAUTHORIZED');
        assert.equal(error.message, 'Invalid or expired session');
        return true;
      }
    );
  });

  it('should revoke session and set revokedAt timestamp', async () => {
    const session = createTestSession();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const beforeLogout = new Date();
    await logoutService.logout(`Bearer ${token}`);
    const afterLogout = new Date();

    const revokedSession = await sessionRepository.findByTokenHash(tokenHash);
    assert.ok(revokedSession);
    assert.equal(revokedSession.status, 'revoked');
    assert.ok(revokedSession.revokedAt);
    
    const revokedAt = new Date(revokedSession.revokedAt!);
    assert.ok(revokedAt >= beforeLogout);
    assert.ok(revokedAt <= afterLogout);
  });
});
