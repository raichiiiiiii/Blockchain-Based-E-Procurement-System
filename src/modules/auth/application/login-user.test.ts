import { beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { LoginUserError, LoginUserService } from './login-user.js';
import type { PlatformUserCredentialRepository } from './platform-user-credential-repository.js';
import type { AuthSessionRepository } from './auth-session-repository.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import type { AuthSession } from '../domain/auth-session.js';

class MockCredentialRepository implements PlatformUserCredentialRepository {
  private readonly credentials: Map<string, PlatformUserCredential> = new Map();

  async save(credential: PlatformUserCredential): Promise<PlatformUserCredential> {
    this.credentials.set(credential.username, { ...credential });
    return { ...credential };
  }

  async findByUsername(username: string): Promise<PlatformUserCredential | null> {
    const credential = this.credentials.get(username);
    return credential ? { ...credential } : null;
  }

  async findByUserId(userId: string): Promise<PlatformUserCredential | null> {
    for (const credential of this.credentials.values()) {
      if (credential.userId === userId) {
        return { ...credential };
      }
    }

    return null;
  }

  addCredential(credential: PlatformUserCredential): void {
    this.credentials.set(credential.username, { ...credential });
  }
}

class MockSessionRepository implements AuthSessionRepository {
  private readonly sessions: Map<string, AuthSession> = new Map();
  readonly savedSessions: AuthSession[] = [];

  async save(session: AuthSession): Promise<AuthSession> {
    this.sessions.set(session.sessionId, { ...session });
    this.savedSessions.push({ ...session });
    return { ...session };
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    const session = this.sessions.get(sessionId);
    return session ? { ...session } : null;
  }

  async findByTokenHash(tokenHash: string): Promise<AuthSession | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenHash === tokenHash) {
        return { ...session };
      }
    }

    return null;
  }
}

async function assertLoginUnauthorized(action: () => Promise<unknown>): Promise<void> {
  await assert.rejects(
    action,
    (error: unknown) => error instanceof LoginUserError
      && error.code === 'UNAUTHORIZED'
      && error.message === 'Invalid username or password'
  );
}

describe('LoginUserService', () => {
  let credentialRepository: MockCredentialRepository;
  let sessionRepository: MockSessionRepository;
  let loginService: LoginUserService;

  const validUsername = 'testuser';
  const validPassword = 'testpassword';
  const hashedPassword = createHash('sha256').update(validPassword).digest('hex');

  beforeEach(() => {
    credentialRepository = new MockCredentialRepository();
    sessionRepository = new MockSessionRepository();
    loginService = new LoginUserService(credentialRepository, sessionRepository);

    credentialRepository.addCredential({
      userId: 'user123',
      username: validUsername,
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });

  it('succeeds with valid username/password hash match', async () => {
    const result = await loginService.login({
      username: validUsername,
      password: validPassword
    });

    assert.ok(result.sessionToken);
    assert.match(result.sessionId, /^session_/);
    assert.ok(result.expiresAt);
    assert.equal(result.actor.actorUserId, 'user123');
    assert.equal(result.actor.authenticationSessionId, result.sessionId);
    assert.equal(result.actor.authenticationMethod, 'localPassword');
  });

  it('creates an active auth session', async () => {
    await loginService.login({
      username: validUsername,
      password: validPassword
    });

    assert.equal(sessionRepository.savedSessions.length, 1);
    assert.equal(sessionRepository.savedSessions[0]?.status, 'active');
  });

  it('stores only tokenHash in the session repository', async () => {
    const result = await loginService.login({
      username: validUsername,
      password: validPassword
    });

    assert.equal(sessionRepository.savedSessions.length, 1);
    const session = sessionRepository.savedSessions[0];
    assert.ok(session);
    assert.ok(session.tokenHash);
    assert.notEqual(session.tokenHash, result.sessionToken);

    const expectedHash = createHash('sha256').update(result.sessionToken).digest('hex');
    assert.equal(session.tokenHash, expectedHash);
  });

  it('returns raw sessionToken only in the success result', async () => {
    const result = await loginService.login({
      username: validUsername,
      password: validPassword
    });

    assert.ok(result.sessionToken);
    assert.equal(sessionRepository.savedSessions.length, 1);
    assert.notEqual(sessionRepository.savedSessions[0]?.tokenHash, result.sessionToken);
  });

  it('rejects unknown username with UNAUTHORIZED', async () => {
    await assertLoginUnauthorized(() => loginService.login({
      username: 'unknownuser',
      password: validPassword
    }));
  });

  it('rejects wrong password with UNAUTHORIZED', async () => {
    await assertLoginUnauthorized(() => loginService.login({
      username: validUsername,
      password: 'wrongpassword'
    }));
  });

  it('does not reveal whether username or password failed', async () => {
    await assertLoginUnauthorized(() => loginService.login({
      username: 'unknownuser',
      password: 'anypassword'
    }));

    await assertLoginUnauthorized(() => loginService.login({
      username: validUsername,
      password: 'wrongpassword'
    }));
  });

  it('trims username before lookup', async () => {
    credentialRepository.addCredential({
      userId: 'user456',
      username: 'userwithspace',
      passwordHash: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = await loginService.login({
      username: '  userwithspace  ',
      password: validPassword
    });

    assert.equal(result.actor.actorUserId, 'user456');
  });

  it('does not trim password before verification', async () => {
    const passwordWithSpaces = ' password with spaces ';
    const hashedPasswordWithSpaces = createHash('sha256').update(passwordWithSpaces).digest('hex');

    credentialRepository.addCredential({
      userId: 'user789',
      username: 'userwithpasswordspaces',
      passwordHash: hashedPasswordWithSpaces,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const result = await loginService.login({
      username: 'userwithpasswordspaces',
      password: passwordWithSpaces
    });

    assert.equal(result.actor.actorUserId, 'user789');
  });

  it('rejects blank username with VALIDATION_ERROR', async () => {
    await assert.rejects(
      () => loginService.login({
        username: '',
        password: validPassword
      }),
      (error: unknown) => typeof error === 'object'
        && error !== null
        && 'error' in error
        && (error as { error?: { code?: unknown } }).error?.code === 'VALIDATION_ERROR'
    );
  });

  it('rejects blank password with VALIDATION_ERROR', async () => {
    await assert.rejects(
      () => loginService.login({
        username: validUsername,
        password: ''
      }),
      (error: unknown) => typeof error === 'object'
        && error !== null
        && 'error' in error
        && (error as { error?: { code?: unknown } }).error?.code === 'VALIDATION_ERROR'
    );
  });

  it('does not create a session for invalid credentials', async () => {
    await assertLoginUnauthorized(() => loginService.login({
      username: 'unknownuser',
      password: 'wrongpassword'
    }));

    assert.equal(sessionRepository.savedSessions.length, 0);
  });
});