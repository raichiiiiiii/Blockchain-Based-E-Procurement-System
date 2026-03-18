import { test } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createMemberOrganization } from './create-member-organization.js';

test('should return invalidInput for whitespace-only required fields', async () => {
  const result = await createMemberOrganization({
    registrationNumber: '   ',
    legalName: '   ',
    organizationType: '   '
  });

  assert.strictEqual(result.status, 'invalidInput');
  assert.ok(Array.isArray(result.issues));
  assert.ok(result.issues.length > 0);
});

test('should return draftPrepared with pendingReview status for valid input', async () => {
  const result = await createMemberOrganization({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation'
  });

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.status, 'pendingReview');
});

test('should trim whitespace from all string fields', async () => {
  const result = await createMemberOrganization({
    registrationNumber: '  REG123  ',
    legalName: '  Test Organization  ',
    organizationType: '  Corporation  ',
    displayName: '  Display Name  ',
    businessType: '  LLC  '
  });

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.registrationNumber, 'REG123');
  assert.strictEqual(result.organization.legalName, 'Test Organization');
  assert.strictEqual(result.organization.organizationType, 'Corporation');
  assert.strictEqual(result.organization.displayName, 'Display Name');
  assert.strictEqual(result.organization.businessType, 'LLC');
});

test('should normalize empty optional fields to undefined', async () => {
  const result = await createMemberOrganization({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    displayName: '',
    businessType: '   ',
    contactEmail: '',
    contactPhone: '   '
  });

  assert.strictEqual(result.status, 'draftPrepared');
  assert.strictEqual(result.organization.displayName, undefined);
  assert.strictEqual(result.organization.businessType, undefined);
  assert.strictEqual(result.organization.contactEmail, undefined);
  assert.strictEqual(result.organization.contactPhone, undefined);
});
