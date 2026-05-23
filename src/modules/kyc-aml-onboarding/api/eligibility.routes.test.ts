import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryOnboardingCaseRepository } from '../infrastructure/in-memory-onboarding-case-repository.js';
import { registerKYCAMLRoutes } from './routes.js';
import type { OnboardingCase } from '../domain/onboarding-case.js';
import type { AccessAuditEvent } from '../../shared/application/access-audit-event.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';

// Helper to create in-memory access audit repository
const createInMemoryAccessAuditRepository = (): {
  repository: AccessAuditEventRepository;
  events: AccessAuditEvent[];
} => {
  const events: AccessAuditEvent[] = [];

  return {
    events,
    repository: {
      save: async (event: AccessAuditEvent): Promise<AccessAuditEvent> => {
        events.push(event);
        return event;
      },
      list: async (): Promise<AccessAuditEvent[]> => events
    }
  };
};

describe('GET /api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId', () => {
  test('approved case returns eligibility eligible', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create an approved case
    const approvedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'approved',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'pass',
        rationale: 'All documents verified successfully',
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(approvedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'eligible');
    assert.strictEqual(responseBody.data.onboardingStatus, 'approved');
    assert.strictEqual(responseBody.data.decisionOutcome, 'pass');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.sourceCaseId, 'case_123');
    assert.ok(responseBody.data.checkedAt);
    // Should not include sensitive data
    assert.strictEqual(responseBody.data.hasOwnProperty('kyc'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('aml'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('evidenceReferences'), false);
  });

  test('flagged case returns eligibility flagged with reasonCodes and rationale', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a flagged case
    const flaggedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'flagged',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'flag',
        rationale: 'Beneficial ownership evidence requires manual compliance follow-up',
        reasonCodes: ['beneficial_ownership_unverified', 'manual_compliance_concern'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(flaggedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'flagged');
    assert.strictEqual(responseBody.data.onboardingStatus, 'flagged');
    assert.strictEqual(responseBody.data.decisionOutcome, 'flag');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.sourceCaseId, 'case_123');
    assert.ok(responseBody.data.reasonCodes);
    assert.deepStrictEqual(responseBody.data.reasonCodes, ['beneficial_ownership_unverified', 'manual_compliance_concern']);
    assert.strictEqual(responseBody.data.rationale, 'Beneficial ownership evidence requires manual compliance follow-up');
    assert.ok(responseBody.data.checkedAt);
  });

  test('blocked case returns eligibility blocked with reasonCodes and rationale', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a blocked case
    const blockedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'blocked',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'block',
        rationale: 'High risk activity detected',
        reasonCodes: ['high_risk_activity'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(blockedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'blocked');
    assert.strictEqual(responseBody.data.onboardingStatus, 'blocked');
    assert.strictEqual(responseBody.data.decisionOutcome, 'block');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.sourceCaseId, 'case_123');
    assert.ok(responseBody.data.reasonCodes);
    assert.deepStrictEqual(responseBody.data.reasonCodes, ['high_risk_activity']);
    assert.strictEqual(responseBody.data.rationale, 'High risk activity detected');
    assert.ok(responseBody.data.checkedAt);
  });

  test('rejected case returns eligibility notEligible with reasonCodes and rationale', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a rejected case
    const rejectedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'rejected',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'fail',
        rationale: 'Identity verification failed',
        reasonCodes: ['identity_verification_failed'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(rejectedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'notEligible');
    assert.strictEqual(responseBody.data.onboardingStatus, 'rejected');
    assert.strictEqual(responseBody.data.decisionOutcome, 'fail');
    assert.strictEqual(responseBody.data.isFinal, true);
    assert.strictEqual(responseBody.data.sourceCaseId, 'case_123');
    assert.ok(responseBody.data.reasonCodes);
    assert.deepStrictEqual(responseBody.data.reasonCodes, ['identity_verification_failed']);
    assert.strictEqual(responseBody.data.rationale, 'Identity verification failed');
    assert.ok(responseBody.data.checkedAt);
  });

  test('submitted case returns eligibility pendingReview', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a submitted case
    const submittedCase: OnboardingCase = {
      id: 'case_123',
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await repository.save(submittedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'pendingReview');
    assert.strictEqual(responseBody.data.onboardingStatus, 'submitted');
    assert.strictEqual(responseBody.data.decisionOutcome, null);
    assert.strictEqual(responseBody.data.isFinal, false);
    assert.strictEqual(responseBody.data.sourceCaseId, 'case_123');
    assert.ok(responseBody.data.checkedAt);
  });

  test('no case returns 200 with eligibility unknown', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_missing',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.eligibility, 'unknown');
    assert.strictEqual(responseBody.data.onboardingStatus, null);
    assert.strictEqual(responseBody.data.decisionOutcome, null);
    assert.strictEqual(responseBody.data.isFinal, false);
    assert.strictEqual(responseBody.data.sourceCaseId, null);
    assert.ok(responseBody.data.checkedAt);
  });

  test('missing actor context returns 400 VALIDATION_ERROR', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123'
      // No x-actor-id header
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('response does not include kyc, aml, or evidenceReferences', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create an approved case with all data
    const approvedCase: OnboardingCase = {
      id: 'case_123',
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
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf'
        }
      ],
      status: 'approved',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'pass',
        rationale: 'All documents verified successfully',
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(approvedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    // Should not include sensitive data
    assert.strictEqual(responseBody.data.hasOwnProperty('kyc'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('aml'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('evidenceReferences'), false);
  });

  test('latest case is selected when multiple cases exist for the same organization', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create an older approved case
    const oldCase: OnboardingCase = {
      id: 'old_case',
      memberOrganizationId: 'org_123',
      kyc: {
        legalName: 'Old Company',
        registrationNumber: '111111111',
        countryCode: 'MYS',
        businessType: 'Corporation'
      },
      aml: {
        declaredBusinessActivity: 'Import',
        expectedMonthlyTransactionValue: '5000.00',
        declaredSanctionsExposure: false,
        declaredPepExposure: false
      },
      evidenceReferences: [],
      status: 'approved',
      submittedByUserId: 'user_456',
      createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    };
    
    // Create a newer rejected case
    const newCase: OnboardingCase = {
      id: 'new_case',
      memberOrganizationId: 'org_123',
      kyc: {
        legalName: 'New Company',
        registrationNumber: '222222222',
        countryCode: 'SGP',
        businessType: 'LLC'
      },
      aml: {
        declaredBusinessActivity: 'Export',
        expectedMonthlyTransactionValue: '15000.00',
        declaredSanctionsExposure: true,
        declaredPepExposure: false
      },
      evidenceReferences: [],
      status: 'rejected',
      submittedByUserId: 'user_789',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await repository.save(oldCase);
    await repository.save(newCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    // Should return the newer case
    assert.strictEqual(responseBody.data.eligibility, 'notEligible');
    assert.strictEqual(responseBody.data.sourceCaseId, 'new_case');
    assert.strictEqual(responseBody.data.onboardingStatus, 'rejected');
  });

  test('unauthorized eligibility check returns 403 FORBIDDEN', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register with denied authorization
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      authorizeEligibility: async (): Promise<boolean> => false
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User is not authorized to retrieve KYC/AML onboarding eligibility');
  });

  test('unauthorized eligibility check does not call eligibility repository/service', async () => {
    // Create a fake repository that tracks method calls
    const fakeRepository = {
      findLatestByOrganizationId: async (memberOrganizationId: string) => {
        throw new Error('Repository method should not be called for unauthorized requests');
      }
    } as any;

    const server = createTestableServer();
    
    // Register with denied authorization
    await server.register(registerKYCAMLRoutes, { 
      repository: fakeRepository,
      prefix: '/api/v1',
      authorizeEligibility: async (): Promise<boolean> => false
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    // Should return 403 without calling the repository
    assert.strictEqual(response.statusCode, 403);
  });

  test('unauthorized eligibility check emits forbidden audit event when accessAuditEventRepository is provided', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with denied authorization and audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      authorizeEligibility: async (): Promise<boolean> => false,
      accessAuditEventRepository: auditRepo.repository
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'unauthorized_user');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'eligibility_authorization_required');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('missing actor context emits validationError audit event when accessAuditEventRepository is provided', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123'
      // No x-actor-id header
    });

    assert.strictEqual(response.statusCode, 400);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'unknown');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.reason, 'missing_actor_context');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('successful eligible check emits success audit event with reason eligibility_eligible', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // Create an approved case
    const approvedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'approved',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'pass',
        rationale: 'All documents verified successfully',
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(approvedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.reason, 'eligibility_eligible');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('successful flagged check emits success audit event with reason eligibility_flagged', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // Create a flagged case
    const flaggedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'flagged',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'flag',
        rationale: 'Beneficial ownership evidence requires manual compliance follow-up',
        reasonCodes: ['beneficial_ownership_unverified', 'manual_compliance_concern'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(flaggedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.reason, 'eligibility_flagged');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('successful blocked check emits success audit event with reason eligibility_blocked', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // Create a blocked case
    const blockedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'blocked',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'block',
        rationale: 'High risk activity detected',
        reasonCodes: ['high_risk_activity'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(blockedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.reason, 'eligibility_blocked');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('successful notEligible check emits success audit event with reason eligibility_not_eligible', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register with audit repository
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // Create a rejected case
    const rejectedCase: OnboardingCase = {
      id: 'case_123',
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
      status: 'rejected',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'fail',
        rationale: 'Identity verification failed',
        reasonCodes: ['identity_verification_failed'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(rejectedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    
    // Check that audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'checkKycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingEligibility');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.reason, 'eligibility_not_eligible');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.route, '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId');
    assert.strictEqual(auditEvent.method, 'GET');
  });

  test('blocked response preserves reasonCodes/rationale and does not include kyc/aml/evidenceReferences', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a blocked case
    const blockedCase: OnboardingCase = {
      id: 'case_123',
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
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf'
        }
      ],
      status: 'blocked',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'block',
        rationale: 'High risk activity detected',
        reasonCodes: ['high_risk_activity'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(blockedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    // Check blocked response structure
    assert.strictEqual(responseBody.data.eligibility, 'blocked');
    assert.strictEqual(responseBody.data.onboardingStatus, 'blocked');
    assert.strictEqual(responseBody.data.decisionOutcome, 'block');
    assert.ok(responseBody.data.reasonCodes);
    assert.deepStrictEqual(responseBody.data.reasonCodes, ['high_risk_activity']);
    assert.strictEqual(responseBody.data.rationale, 'High risk activity detected');
    
    // Should not include sensitive data
    assert.strictEqual(responseBody.data.hasOwnProperty('kyc'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('aml'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('evidenceReferences'), false);
  });

  test('flagged response preserves reasonCodes/rationale and does not include kyc/aml/evidenceReferences', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    // Create a flagged case
    const flaggedCase: OnboardingCase = {
      id: 'case_123',
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
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf'
        }
      ],
      status: 'flagged',
      submittedByUserId: 'user_456',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      decision: {
        outcome: 'flag',
        rationale: 'Beneficial ownership evidence requires manual compliance follow-up',
        reasonCodes: ['beneficial_ownership_unverified', 'manual_compliance_concern'],
        decidedByUserId: 'reviewer_789',
        decidedAt: new Date().toISOString()
      }
    };
    
    await repository.save(flaggedCase);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/kyc-aml-onboarding/eligibility/org_123',
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const responseBody = response.json();
    
    // Check flagged response structure
    assert.strictEqual(responseBody.data.eligibility, 'flagged');
    assert.strictEqual(responseBody.data.onboardingStatus, 'flagged');
    assert.strictEqual(responseBody.data.decisionOutcome, 'flag');
    assert.ok(responseBody.data.reasonCodes);
    assert.deepStrictEqual(responseBody.data.reasonCodes, ['beneficial_ownership_unverified', 'manual_compliance_concern']);
    assert.strictEqual(responseBody.data.rationale, 'Beneficial ownership evidence requires manual compliance follow-up');
    
    // Should not include sensitive data
    assert.strictEqual(responseBody.data.hasOwnProperty('kyc'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('aml'), false);
    assert.strictEqual(responseBody.data.hasOwnProperty('evidenceReferences'), false);
  });
});
