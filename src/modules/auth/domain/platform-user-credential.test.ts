import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryPlatformUserCredentialRepository } from '../infrastructure/in-memory-platform-user-credential-repository.js';
import type { PlatformUserCredential } from './platform-user-credential.js';

describe('PlatformUserCredential', () => {
  let repository: InMemoryPlatformUserCredentialRepository;

  beforeEach(() => {
    repository = new InMemoryPlatformUserCredentialRepository();
  });

  it('should save and retrieve credential by username', async () => {
    const credential: PlatformUserCredential = {
      userId: 'user-123',
      username: 'testuser',
      passwordHash: 'hashed-password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await repository.save(credential);
    const result = await repository.findByUsername('testuser');

    assert.ok(result);
    assert.equal(result?.userId, 'user-123');
    assert.equal(result?.username, 'testuser');
    assert.equal(result?.passwordHash, 'hashed-password');
  });

  it('should return null for non-existent username', async () => {
    const result = await repository.findByUsername('nonexistent');
    assert.equal(result, null);
  });

  it('should retrieve credential by userId', async () => {
    const credential: PlatformUserCredential = {
      userId: 'user-123',
      username: 'testuser',
      passwordHash: 'hashed-password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await repository.save(credential);
    const result = await repository.findByUserId('user-123');

    assert.ok(result);
    assert.equal(result?.userId, 'user-123');
    assert.equal(result?.username, 'testuser');
  });

  it('should return null for non-existent userId', async () => {
    const result = await repository.findByUserId('nonexistent');
    assert.equal(result, null);
  });

  it('should update existing credential when saving with same username', async () => {
    const initialCredential: PlatformUserCredential = {
      userId: 'user-123',
      username: 'testuser',
      passwordHash: 'old-hash',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedCredential: PlatformUserCredential = {
      userId: 'user-123',
      username: 'testuser',
      passwordHash: 'new-hash',
      createdAt: initialCredential.createdAt,
      updatedAt: new Date().toISOString()
    };

    await repository.save(initialCredential);
    await repository.save(updatedCredential);

    const result = await repository.findByUsername('testuser');
    assert.equal(result?.passwordHash, 'new-hash');
  });

  it('should return defensive copies to prevent mutation', async () => {
    const credential: PlatformUserCredential = {
      userId: 'user-123',
      username: 'testuser',
      passwordHash: 'hashed-password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await repository.save(credential);
    
    const result1 = await repository.findByUsername('testuser');
    if (result1) {
      result1.passwordHash = 'modified-hash';
    }

    const result2 = await repository.findByUsername('testuser');
    assert.equal(result2?.passwordHash, 'hashed-password');
  });
});