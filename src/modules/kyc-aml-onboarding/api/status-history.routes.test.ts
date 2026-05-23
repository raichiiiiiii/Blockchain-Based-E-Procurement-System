import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryOnboardingCaseRepository } from '../infrastructure/in-memory-onboarding-case-repository.js';
import { registerKYCAMLRoutes } from './routes.js';
import type { OnboardingCase } from '../domain/onboarding-case.js';

describe('GET /api/v1/kyc-aml-onboarding-cases/{caseId}/status-history', () => {
  test('should return status history for submitted case', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create a submitted case directly in repository
    const submittedCase: OnboardingCase = {
      id: 'test-case-123',
      memberOrganizationId: 'org_123',
      kyc: {
        legalName: 'Test Company',
        registrationNumber: '123456789',
        countryCode: 'MYS',
        businessType: 'Corporation'
      },
      aml: {
        declaredBusinessActivity: 'Import/Export',
        expectedMonthlyTransactionValue: '10000.00',
        declaredSanctionsExposure: false,
        declaredPepExposure: false
      },
      evidenceReferences: [],
      status: 'submitted',
      submittedByUserId: 'user_456',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z'
    };
    
    await repository.save(submittedCase);

    // Make request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-123/status-history',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    assert.strictEqual(responseBody.data.id, 'test-case-123');
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_123');
    assert.strictEqual(responseBody.data.currentStatus, 'submitted');
    assert.strictEqual(responseBody.data.isFinal, false);
    assert.strictEqual(responseBody.data.history.length, 1);
    
    const entry = responseBody.data.history[0];
    assert.strictEqual(entry.type, 'caseSubmitted');
    assert.strictEqual(entry.fromStatus, null);
    assert.strictEqual(entry.toStatus, 'submitted');
    assert.strictEqual(entry.actorUserId, 'user_456');
    assert.strictEqual(entry.occurredAt, '2023-01-01T10:00:00Z');
  });

  test('should return status history for decided flagged case', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create a flagged case with decision directly in repository
    const flaggedCase: OnboardingCase = {
      id: 'test-case-456',
      memberOrganizationId: 'org_456',
      kyc: {
        legalName: 'Flagged Company',
        registrationNumber: '987654321',
        countryCode: 'SGP',
        businessType: 'LLC'
      },
      aml: {
        declaredBusinessActivity: 'Consulting',
        expectedMonthlyTransactionValue: '5000.00',
        declaredSanctionsExposure: true,
        declaredPepExposure: false
      },
      evidenceReferences: [],
      status: 'flagged',
      submittedByUserId: 'user_789',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-02T15:30:00Z',
      decision: {
        outcome: 'flag',
        rationale: 'Requires manual review',
        reasonCodes: ['manual_compliance_concern', 'beneficial_ownership_unverified'],
        decidedByUserId: 'reviewer_123',
        decidedAt: '2023-01-02T15:30:00Z'
      }
    };
    
    await repository.save(flaggedCase);

    // Make request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-456/status-history',
      headers: {
        'x-actor-id': 'user_789'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    assert.strictEqual(responseBody.data.id, 'test-case-456');
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_456');
    assert.strictEqual(responseBody.data.currentStatus, 'flagged');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.history.length, 2);
    
    // First entry - case submission
    const submittedEntry = responseBody.data.history[0];
    assert.strictEqual(submittedEntry.type, 'caseSubmitted');
    assert.strictEqual(submittedEntry.fromStatus, null);
    assert.strictEqual(submittedEntry.toStatus, 'submitted');
    assert.strictEqual(submittedEntry.actorUserId, 'user_789');
    assert.strictEqual(submittedEntry.occurredAt, '2023-01-01T10:00:00Z');
    
    // Second entry - decision
    const decisionEntry = responseBody.data.history[1];
    assert.strictEqual(decisionEntry.type, 'decisionRecorded');
    assert.strictEqual(decisionEntry.fromStatus, 'submitted');
    assert.strictEqual(decisionEntry.toStatus, 'flagged');
    assert.strictEqual(decisionEntry.actorUserId, 'reviewer_123');
    assert.strictEqual(decisionEntry.occurredAt, '2023-01-02T15:30:00Z');
    assert.strictEqual(decisionEntry.outcome, 'flag');
    assert.strictEqual(decisionEntry.rationale, 'Requires manual review');
    assert.deepStrictEqual(decisionEntry.reasonCodes, ['manual_compliance_concern', 'beneficial_ownership_unverified']);
  });

  test('should return status history for decided approved case', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create an approved case with decision directly in repository
    const approvedCase: OnboardingCase = {
      id: 'test-case-789',
      memberOrganizationId: 'org_789',
      kyc: {
        legalName: 'Approved Company',
        registrationNumber: '111222333',
        countryCode: 'THA',
        businessType: 'Partnership'
      },
      aml: {
        declaredBusinessActivity: 'Manufacturing',
        expectedMonthlyTransactionValue: '15000.00',
        declaredSanctionsExposure: false,
        declaredPepExposure: true
      },
      evidenceReferences: [],
      status: 'approved',
      submittedByUserId: 'user_123',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-02T15:30:00Z',
      decision: {
        outcome: 'pass',
        rationale: 'All documents verified successfully',
        decidedByUserId: 'reviewer_456',
        decidedAt: '2023-01-02T15:30:00Z'
      }
    };
    
    await repository.save(approvedCase);

    // Make request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-789/status-history',
      headers: {
        'x-actor-id': 'user_123'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    assert.strictEqual(responseBody.data.id, 'test-case-789');
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_789');
    assert.strictEqual(responseBody.data.currentStatus, 'approved');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.history.length, 2);
    
    // First entry - case submission
    const submittedEntry = responseBody.data.history[0];
    assert.strictEqual(submittedEntry.type, 'caseSubmitted');
    assert.strictEqual(submittedEntry.fromStatus, null);
    assert.strictEqual(submittedEntry.toStatus, 'submitted');
    assert.strictEqual(submittedEntry.actorUserId, 'user_123');
    assert.strictEqual(submittedEntry.occurredAt, '2023-01-01T10:00:00Z');
    
    // Second entry - decision
    const decisionEntry = responseBody.data.history[1];
    assert.strictEqual(decisionEntry.type, 'decisionRecorded');
    assert.strictEqual(decisionEntry.fromStatus, 'submitted');
    assert.strictEqual(decisionEntry.toStatus, 'approved');
    assert.strictEqual(decisionEntry.actorUserId, 'reviewer_456');
    assert.strictEqual(decisionEntry.occurredAt, '2023-01-02T15:30:00Z');
    assert.strictEqual(decisionEntry.outcome, 'pass');
    assert.strictEqual(decisionEntry.rationale, 'All documents verified successfully');
  });

  test('should return status history for decided rejected case', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create a rejected case with decision directly in repository
    const rejectedCase: OnboardingCase = {
      id: 'test-case-101',
      memberOrganizationId: 'org_101',
      kyc: {
        legalName: 'Rejected Company',
        registrationNumber: '444555666',
        countryCode: 'IDN',
        businessType: 'Corporation'
      },
      aml: {
        declaredBusinessActivity: 'Trading',
        expectedMonthlyTransactionValue: '20000.00',
        declaredSanctionsExposure: false,
        declaredPepExposure: false
      },
      evidenceReferences: [],
      status: 'rejected',
      submittedByUserId: 'user_321',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-02T15:30:00Z',
      decision: {
        outcome: 'fail',
        rationale: 'Identity verification failed',
        reasonCodes: ['identity_verification_failed'],
        decidedByUserId: 'reviewer_654',
        decidedAt: '2023-01-02T15:30:00Z'
      }
    };
    
    await repository.save(rejectedCase);

    // Make request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-101/status-history',
      headers: {
        'x-actor-id': 'user_321'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    assert.strictEqual(responseBody.data.id, 'test-case-101');
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_101');
    assert.strictEqual(responseBody.data.currentStatus, 'rejected');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.history.length, 2);
    
    // First entry - case submission
    const submittedEntry = responseBody.data.history[0];
    assert.strictEqual(submittedEntry.type, 'caseSubmitted');
    assert.strictEqual(submittedEntry.fromStatus, null);
    assert.strictEqual(submittedEntry.toStatus, 'submitted');
    assert.strictEqual(submittedEntry.actorUserId, 'user_321');
    assert.strictEqual(submittedEntry.occurredAt, '2023-01-01T10:00:00Z');
    
    // Second entry - decision
    const decisionEntry = responseBody.data.history[1];
    assert.strictEqual(decisionEntry.type, 'decisionRecorded');
    assert.strictEqual(decisionEntry.fromStatus, 'submitted');
    assert.strictEqual(decisionEntry.toStatus, 'rejected');
    assert.strictEqual(decisionEntry.actorUserId, 'reviewer_654');
    assert.strictEqual(decisionEntry.occurredAt, '2023-01-02T15:30:00Z');
    assert.strictEqual(decisionEntry.outcome, 'fail');
    assert.strictEqual(decisionEntry.rationale, 'Identity verification failed');
    assert.deepStrictEqual(decisionEntry.reasonCodes, ['identity_verification_failed']);
  });

  test('should return status history for decided blocked case', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create a blocked case with decision directly in repository
    const blockedCase: OnboardingCase = {
      id: 'test-case-202',
      memberOrganizationId: 'org_202',
      kyc: {
        legalName: 'Blocked Company',
        registrationNumber: '777888999',
        countryCode: 'VNM',
        businessType: 'LLC'
      },
      aml: {
        declaredBusinessActivity: 'Crypto Trading',
        expectedMonthlyTransactionValue: '50000.00',
        declaredSanctionsExposure: true,
        declaredPepExposure: true
      },
      evidenceReferences: [],
      status: 'blocked',
      submittedByUserId: 'user_654',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-02T15:30:00Z',
      decision: {
        outcome: 'block',
        rationale: 'High risk activity detected',
        reasonCodes: ['high_risk_activity', 'sanctions_exposure'],
        decidedByUserId: 'reviewer_987',
        decidedAt: '2023-01-02T15:30:00Z'
      }
    };
    
    await repository.save(blockedCase);

    // Make request
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-202/status-history',
      headers: {
        'x-actor-id': 'user_654'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    assert.strictEqual(responseBody.data.id, 'test-case-202');
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_202');
    assert.strictEqual(responseBody.data.currentStatus, 'blocked');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.history.length, 2);
    
    // First entry - case submission
    const submittedEntry = responseBody.data.history[0];
    assert.strictEqual(submittedEntry.type, 'caseSubmitted');
    assert.strictEqual(submittedEntry.fromStatus, null);
    assert.strictEqual(submittedEntry.toStatus, 'submitted');
    assert.strictEqual(submittedEntry.actorUserId, 'user_654');
    assert.strictEqual(submittedEntry.occurredAt, '2023-01-01T10:00:00Z');
    
    // Second entry - decision
    const decisionEntry = responseBody.data.history[1];
    assert.strictEqual(decisionEntry.type, 'decisionRecorded');
    assert.strictEqual(decisionEntry.fromStatus, 'submitted');
    assert.strictEqual(decisionEntry.toStatus, 'blocked');
    assert.strictEqual(decisionEntry.actorUserId, 'reviewer_987');
    assert.strictEqual(decisionEntry.occurredAt, '2023-01-02T15:30:00Z');
    assert.strictEqual(decisionEntry.outcome, 'block');
    assert.strictEqual(decisionEntry.rationale, 'High risk activity detected');
    assert.deepStrictEqual(decisionEntry.reasonCodes, ['high_risk_activity', 'sanctions_exposure']);
  });

  test('should return 404 when case does not exist', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Make request for non-existent case
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/non-existent-case/status-history',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 404);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
  });

  test('should return 400 when actor context is missing', async () => {
    // Setup
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // Create a case directly in repository
    const submittedCase: OnboardingCase = {
      id: 'test-case-789',
      memberOrganizationId: 'org_789',
      kyc: {
        legalName: 'Test Company',
        registrationNumber: '111222333',
        countryCode: 'THA',
        businessType: 'Partnership'
      },
      aml: {
        declaredBusinessActivity: 'Manufacturing',
        expectedMonthlyTransactionValue: '15000.00',
        declaredSanctionsExposure: false,
        declaredPepExposure: true
      },
      evidenceReferences: [],
      status: 'submitted',
      submittedByUserId: 'user_123',
      createdAt: '2023-01-01T10:00:00Z',
      updatedAt: '2023-01-01T10:00:00Z'
    };
    
    await repository.save(submittedCase);

    // Make request without actor context
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding-cases/test-case-789/status-history'
      // No x-actor-id header
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Missing or invalid x-actor-id header'));
  });
});
