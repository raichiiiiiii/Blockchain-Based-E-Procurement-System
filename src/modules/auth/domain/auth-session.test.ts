import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import type { AuthSession } from './auth-session.js';

describe('AuthSession', () => {
  let repository: InMemoryAuthSessionRepository;

  beforeEach(() => {
    repository = new InMemoryAuthSessionRepository();
  });

  it('should save and retrieve session by sessionId', async () => {
    const session: AuthSession = {
      sessionId: 'session-123',
      tokenHash: 'token-hash-123',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    const result = await repository.findById('session-123');

    assert.ok(result);
    assert.equal(result?.sessionId, 'session-123');
    assert.equal(result?.tokenHash, 'token-hash-123');
    assert.equal(result?.actorUserId, 'user-123');
    assert.deepEqual(result?.actorRoleCodes, ['auditor']);
    assert.equal(result?.status, 'active');
    assert.equal(result?.authenticationMethod, 'localPassword');
  });

  it('should return null for non-existent sessionId', async () => {
    const result = await repository.findById('nonexistent');
    assert.equal(result, null);
  });

  it('should retrieve session by tokenHash', async () => {
    const session: AuthSession = {
      sessionId: 'session-123',
      tokenHash: 'token-hash-123',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    const result = await repository.findByTokenHash('token-hash-123');

    assert.ok(result);
    assert.equal(result?.sessionId, 'session-123');
    assert.equal(result?.tokenHash, 'token-hash-123');
  });

  it('should return null for non-existent tokenHash', async () => {
    const result = await repository.findByTokenHash('nonexistent');
    assert.equal(result, null);
  });

  it('should handle active session status', async () => {
    const session: AuthSession = {
      sessionId: 'session-active',
      tokenHash: 'token-hash-active',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    const result = await repository.findById('session-active');

    assert.ok(result);
    assert.equal(result?.status, 'active');
  });

  it('should handle revoked session status', async () => {
    const session: AuthSession = {
      sessionId: 'session-revoked',
      tokenHash: 'token-hash-revoked',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'revoked',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      revokedAt: new Date().toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    const result = await repository.findById('session-revoked');

    assert.ok(result);
    assert.equal(result?.status, 'revoked');
    assert.ok(result?.revokedAt);
  });

  it('should handle expired session status', async () => {
    const session: AuthSession = {
      sessionId: 'session-expired',
      tokenHash: 'token-hash-expired',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'expired',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    const result = await repository.findById('session-expired');

    assert.ok(result);
    assert.equal(result?.status, 'expired');
  });

  it('should update existing session when saving with same sessionId', async () => {
    const initialSession: AuthSession = {
      sessionId: 'session-123',
      tokenHash: 'old-token-hash',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    const updatedSession: AuthSession = {
      sessionId: 'session-123',
      tokenHash: 'new-token-hash',
      actorUserId: 'user-123',
      actorRoleCodes: ['admin'],
      status: 'revoked',
      issuedAt: initialSession.issuedAt,
      expiresAt: initialSession.expiresAt,
      revokedAt: new Date().toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(initialSession);
    await repository.save(updatedSession);

    const result = await repository.findById('session-123');
    assert.equal(result?.tokenHash, 'new-token-hash');
    assert.deepEqual(result?.actorRoleCodes, ['admin']);
    assert.equal(result?.status, 'revoked');
  });

  it('should return defensive copies to prevent mutation', async () => {
    const session: AuthSession = {
      sessionId: 'session-123',
      tokenHash: 'token-hash-123',
      actorUserId: 'user-123',
      actorRoleCodes: ['auditor'],
      status: 'active',
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      authenticationMethod: 'localPassword'
    };

    await repository.save(session);
    
    const result1 = await repository.findById('session-123');
    if (result1) {
      result1.status = 'revoked';
    }

    const result2 = await repository.findById('session-123');
    assert.equal(result2?.status, 'active');
  });
});