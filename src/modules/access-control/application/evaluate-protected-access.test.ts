import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProtectedAccess } from './evaluate-protected-access.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Test double implementations
class TestUserStatusLookup implements UserStatusLookup {
  private readonly statuses: Map<string, 'active' | 'inactive' | null>;
  
  constructor(statuses: Map<string, 'active' | 'inactive' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getUserStatus(userId: string): Promise<'active' | 'inactive' | null> {
    return this.statuses.get(userId) ?? null;
  }
}

class TestMemberStatusLookup implements MemberStatusLookup {
  private readonly statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null>;
  
  constructor(statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getMemberOrganizationStatus(organizationId: string): Promise<'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> {
    return this.statuses.get(organizationId) ?? null;
  }
}

describe('evaluateProtectedAccess', () => {
  test('should allow access for active user and active organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'active']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, { status: 'allowed' });
  });
  
  test('should deny access for inactive user with active organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'inactive']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'active']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'userInactive',
      message: 'User account is inactive'
    });
  });
  
  test('should deny access for active user with inactive organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'inactive']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'organizationInactive',
      message: 'Organization is inactive'
    });
  });
  
  test('should deny access for active user with suspended organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'suspended']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'organizationSuspended',
      message: 'Organization is suspended'
    });
  });
  
  test('should deny access for active user with deleted organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'deleted']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'organizationDeleted',
      message: 'Organization is deleted'
    });
  });
  
  test('should deny access for active user with pending review organization', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'pendingReview']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'organizationNotActive',
      message: 'Organization is not active'
    });
  });
  
  test('should deny access when user is not found', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', null]]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', 'active']]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'userNotFound',
      message: 'User not found'
    });
  });
  
  test('should deny access when organization is not found', async () => {
    const userStatusLookup = new TestUserStatusLookup(new Map([['user1', 'active']]));
    const memberStatusLookup = new TestMemberStatusLookup(new Map([['org1', null]]));
    
    const result = await evaluateProtectedAccess({
      userId: 'user1',
      organizationId: 'org1',
      userStatusLookup,
      memberStatusLookup
    });
    
    assert.deepStrictEqual(result, {
      status: 'denied',
      reason: 'organizationNotFound',
      message: 'Organization not found'
    });
  });
});
