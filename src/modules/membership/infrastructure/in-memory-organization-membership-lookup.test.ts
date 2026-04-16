import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { InMemoryOrganizationMembershipLookup } from './in-memory-organization-membership-lookup.js';

test('InMemoryOrganizationMembershipLookup should return true for valid memberships', async () => {
  const lookup = new InMemoryOrganizationMembershipLookup({
    memberships: [
      { userId: 'user1', organizationId: 'org1' },
      { userId: 'user2', organizationId: 'org2' }
    ]
  });

  const result = await lookup.isUserMemberOfOrganization('user1', 'org1');
  assert.equal(result, true);
});

test('InMemoryOrganizationMembershipLookup should return false for invalid user-organization pairs', async () => {
  const lookup = new InMemoryOrganizationMembershipLookup({
    memberships: [
      { userId: 'user1', organizationId: 'org1' }
    ]
  });

  const result = await lookup.isUserMemberOfOrganization('user1', 'org2');
  assert.equal(result, false);
});

test('InMemoryOrganizationMembershipLookup should return false for non-existent users', async () => {
  const lookup = new InMemoryOrganizationMembershipLookup({
    memberships: [
      { userId: 'user1', organizationId: 'org1' }
    ]
  });

  const result = await lookup.isUserMemberOfOrganization('user2', 'org1');
  assert.equal(result, false);
});

test('InMemoryOrganizationMembershipLookup should return false when no memberships exist', async () => {
  const lookup = new InMemoryOrganizationMembershipLookup();

  const result = await lookup.isUserMemberOfOrganization('user1', 'org1');
  assert.equal(result, false);
});
