import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomBytes, createHash } from 'node:crypto';
import { LogoutUserError, LogoutUserService } from './logout-user.js';
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

async function assertLogoutUnauthorized(
  action: () => Promise<unknown>,
  expectedMessage: string
): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown) => error instanceof LogoutUserError
      && error.code === 'UNAUTHORIZED'
      && error.message === expectedMessage
  );
}

describe('LogoutUserService', () => {
  let logoutService: LogoutUserService;
  let sessionRepository: InMemoryAuthSessionRepository;

  beforeEach(() => {
    sessionRepository = new InMemoryAuthSessionRepository();
    logoutService = new LogoutUserService(sessionRepository);
  });

  it('successfully logs out with valid token', async () => {
    const session = createTestSession();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await logoutService.logout(`Bearer ${token}`);

    const revokedSession = await sessionRepository.findByTokenHash(tokenHash);
    assert.ok(revokedSession);
    assert.equal(revokedSession.status, 'revoked');
    assert.ok(revokedSession.revokedAt);
  });

  it('throws error when authorization header is missing', async () => {
    await assertLogoutUnauthorized(
      () => logoutService.logout(undefined),
      'Authentication required'
    );
  });

  it('throws error when authorization header is malformed', async () => {
    await assertLogoutUnauthorized(
      () => logoutService.logout('InvalidHeader'),
      'Invalid authorization header'
    );
  });

  it('throws error when authorization header has unsupported scheme', async () => {
    await assertLogoutUnauthorized(
      () => logoutService.logout('Basic someToken'),
      'Invalid authorization header'
    );
  });

  it('throws error when token is empty', async () => {
    await assertLogoutUnauthorized(
      () => logoutService.logout('Bearer '),
      'Invalid authorization header'
    );
  });

  it('throws error when token is invalid', async () => {
    await assertLogoutUnauthorized(
      () => logoutService.logout('Bearer invalidToken'),
      'Invalid or expired session'
    );
  });

  it('throws error when session is already revoked', async () => {
    const session = createTestSession({ status: 'revoked' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await assertLogoutUnauthorized(
      () => logoutService.logout(`Bearer ${token}`),
      'Invalid or expired session'
    );
  });

  it('throws error when session status is expired', async () => {
    const session = createTestSession({ status: 'expired' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await assertLogoutUnauthorized(
      () => logoutService.logout(`Bearer ${token}`),
      'Invalid or expired session'
    );
  });

  it('throws error when active session is past expiresAt', async () => {
    const session = createTestSession({
      status: 'active',
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    await assertLogoutUnauthorized(
      () => logoutService.logout(`Bearer ${token}`),
      'Invalid or expired session'
    );
  });

  it('revokes session and sets revokedAt timestamp', async () => {
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

    const revokedAt = new Date(revokedSession.revokedAt);
    assert.ok(revokedAt >= beforeLogout);
    assert.ok(revokedAt <= afterLogout);
  });
});
