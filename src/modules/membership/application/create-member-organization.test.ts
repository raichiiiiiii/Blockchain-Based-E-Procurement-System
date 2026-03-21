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
  
  async findById(id: string): Promise<PersistedMemberOrganizationDraft | null> {
    return null;
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

test('should preserve Unicode characters in all string fields and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: '  REGüñíçóðé123  ',
    legalName: '  Tëst Örgänizåtiön  ',
    organizationType: '  Cörpöråtiön  ',
    displayName: '  Dispłày Nâmé  ',
    businessType: '  LLÇ  '
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, 'REGüñíçóðé123');
  assert.strictEqual(result.organization.legalName, 'Tëst Örgänizåtiön');
  assert.strictEqual(result.organization.organizationType, 'Cörpöråtiön');
  assert.strictEqual(result.organization.displayName, 'Dispłày Nâmé');
  assert.strictEqual(result.organization.businessType, 'LLÇ');
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should preserve ordinary special characters in string fields and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: '  REG-123#456  ',
    legalName: '  Test "Organization" & Co.  ',
    organizationType: '  Corp/Division (Ltd.)  ',
    displayName: '  Display: Name; Division  ',
    businessType: '  LLC & Partners  '
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, 'REG-123#456');
  assert.strictEqual(result.organization.legalName, 'Test "Organization" & Co.');
  assert.strictEqual(result.organization.organizationType, 'Corp/Division (Ltd.)');
  assert.strictEqual(result.organization.displayName, 'Display: Name; Division');
  assert.strictEqual(result.organization.businessType, 'LLC & Partners');
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should accept long strings without truncation and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const longString = 'A'.repeat(1000);
  const longOptionalString = 'B'.repeat(500);
  
  const result = await createMemberOrganization({
    registrationNumber: `  ${longString}  `,
    legalName: `  ${longString}  `,
    organizationType: `  ${longString}  `,
    displayName: `  ${longOptionalString}  `,
    businessType: `  ${longOptionalString}  `
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, longString);
  assert.strictEqual(result.organization.legalName, longString);
  assert.strictEqual(result.organization.organizationType, longString);
  assert.strictEqual(result.organization.displayName, longOptionalString);
  assert.strictEqual(result.organization.businessType, longOptionalString);
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should normalize complex whitespace consistently and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: '  \t REG123 \n  ',
    legalName: '  \n Test\tOrganization  \r\n  ',
    organizationType: '  \r Corporation \t  ',
    displayName: '  \t Display \n Name \r  ',
    businessType: '  \r\n LLC \t  '
  }, repository);

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, 'REG123');
  assert.strictEqual(result.organization.legalName, 'Test\tOrganization');
  assert.strictEqual(result.organization.organizationType, 'Corporation');
  assert.strictEqual(result.organization.displayName, 'Display \n Name');
  assert.strictEqual(result.organization.businessType, 'LLC');
  
  // Verify saveDraft was called exactly once
  assert.strictEqual(repository.saveDraftCallCount, 1);
});

test('should normalize optional empty/whitespace-only strings to undefined and call saveDraft once', async () => {
  const repository = new TestMemberOrganizationRepository();
  
  const result = await createMemberOrganization({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    displayName: '   \t\n  ',
    businessType: '   \r\n  ',
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
