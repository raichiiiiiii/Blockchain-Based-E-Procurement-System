import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createMemberOrganization } from './create-member-organization.js';
import type { MemberOrganizationRepository, PersistedMemberOrganizationDraft } from './member-organization-repository.js';

// Simple test stub repository that tracks call count
class TestMemberOrganizationRepository implements MemberOrganizationRepository {
  public saveDraftCallCount = 0;
  
  async saveDraft(organization: any): Promise<PersistedMemberOrganizationDraft> {
    this.saveDraftCallCount++;
    return {
      ...organization,
      id: 'test-id',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    };
  }
}

test('should return invalidInput for whitespace-only required fields and not call saveDraft', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: '   ',
    legalName: '   ',
    organizationType: '   '
  }, repository);

  assert.strictEqual(result.status, 'invalidInput');
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.length > 0);
  
  // Verify saveDraft was not called
  assert.strictEqual(repository.saveDraftCallCount, 0);
});

test('should return draftPrepared with pendingReview status for valid input and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation'
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.status, 'pendingReview');
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should trim whitespace from all string fields and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: '  REG123  ',
    legalName: '  Test Organization  ',
    organizationType: '  Corporation  ',
    displayName: '  Display Name  ',
    businessType: '  LLC  '
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, 'REG123');
  assert.strictEqual(result.organization.legalName, 'Test Organization');
  assert.strictEqual(result.organization.organizationType, 'Corporation');
  assert.strictEqual(result.organization.displayName, 'Display Name');
  assert.strictEqual(result.organization.businessType, 'LLC');
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should normalize empty optional fields to undefined and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    displayName: '',
    businessType: '   ',
    contactEmail: '',
    contactPhone: '   '
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.displayName, undefined);
  assert.strictEqual(result.organization.businessType, undefined);
  assert.strictEqual(result.organization.contactEmail, undefined);
  assert.strictEqual(result.organization.contactPhone, undefined);
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});
