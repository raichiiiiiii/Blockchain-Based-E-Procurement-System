import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { InMemoryUserExistenceLookup } from './in-memory-user-existence-lookup.js';

test('InMemoryUserExistenceLookup should return true for existing users', async () => {
  const lookup = new InMemoryUserExistenceLookup({
    existingUserIds: ['user1', 'user2']
  });

  const result = await lookup.userExists('user1');
  assert.equal(result, true);
});

test('InMemoryUserExistenceLookup should return false for non-existing users', async () => {
  const lookup = new InMemoryUserExistenceLookup({
    existingUserIds: ['user1', 'user2']
  });

  const result = await lookup.userExists('user3');
  assert.equal(result, false);
});

test('InMemoryUserExistenceLookup should return false when no users exist', async () => {
  const lookup = new InMemoryUserExistenceLookup();

  const result = await lookup.userExists('user1');
  assert.equal(result, false);
});
