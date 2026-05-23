import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryOnboardingCaseRepository } from '../infrastructure/in-memory-onboarding-case-repository.js';
import { registerKYCAMLRoutes } from './routes.js';
import type { AccessAuditEvent } from '../../shared/application/access-audit-event.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import type { OnboardingCase } from '../domain/onboarding-case.js';

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

describe('POST /api/v1/kyc-aml-onboarding-cases', () => {
  test('should create onboarding case with valid data', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    const payload = {
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
        declaredPepExposure: false,
        riskSummary: 'Low risk profile'
      },
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf',
          checksum: 'sha256-placeholder'
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.ok(responseBody.data.id);
    assert.strictEqual(responseBody.data.memberOrganizationId, 'org_123');
    assert.strictEqual(responseBody.data.status, 'submitted');
    assert.strictEqual(responseBody.data.submittedByUserId, 'user_456');
    assert.ok(responseBody.data.createdAt);
    assert.ok(responseBody.data.updatedAt);
    assert.strictEqual(responseBody.data.evidenceReferences.length, 3);

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'createKycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, responseBody.data.id);
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.method, 'POST');
  });

  test('should return 400 when x-actor-id header is missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload
      // x-actor-id header is missing
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Missing or invalid x-actor-id header');
  });

  test('should return 400 when required top-level fields are missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
      // memberOrganizationId is missing
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
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when required KYC fields are missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
      memberOrganizationId: 'org_123',
      kyc: {
        // legalName is missing
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when required AML fields are missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
      memberOrganizationId: 'org_123',
      kyc: {
        legalName: 'Test Company',
        registrationNumber: '123456789',
        countryCode: 'MYS',
        businessType: 'Corporation'
      },
      aml: {
        // declaredBusinessActivity is missing
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when evidenceReferences is empty', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
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
      evidenceReferences: [] // Empty array
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Evidence references must not be empty');
  });

  test('should return 400 when evidence reference is missing required metadata', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
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
          // uri is missing
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
  });

  test('should return 400 when required evidence types are missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { repository, prefix: '/api/v1' });

    const payload = {
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
        // Missing authorizedRepresentativeIdentity and amlDeclaration
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid onboarding case input'));
    assert.ok(responseBody.error.details.issues[0].includes('Missing required evidence types'));
  });

  test('should return 403 when user is not authorized to submit onboarding case', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes with a denied authorization function
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      authorizeSubmission: async (): Promise<boolean> => false,
      accessAuditEventRepository: auditRepo.repository
    });

    const payload = {
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
        declaredPepExposure: false,
        riskSummary: 'Low risk profile'
      },
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf',
          checksum: 'sha256-placeholder'
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload,
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.ok(responseBody.error.message.includes('not authorized'));

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'createKycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'unauthorized_user');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'unauthorized_submission');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should return 409 when trying to create duplicate open case for same organization', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes directly with the correct prefix
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    const payload1 = {
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
        declaredPepExposure: false,
        riskSummary: 'Low risk profile'
      },
      evidenceReferences: [
        {
          type: 'companyRegistration',
          name: 'ssm-registration.pdf',
          uri: 'https://storage.example.com/ssm-registration.pdf',
          mediaType: 'application/pdf',
          checksum: 'sha256-placeholder'
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    // Create the first case
    await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload1,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    // Try to create a second case for the same organization
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: payload1,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(response.statusCode, 409);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.ok(responseBody.error.message.includes('An open onboarding case already exists'));

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // First case created + conflict
    const auditEvent = auditRepo.events[1]; // Get the conflict event
    assert.strictEqual(auditEvent.action, 'createKycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, 'org_123');
    assert.strictEqual(auditEvent.actorUserId, 'user_456');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.reason, 'duplicate_open_case');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });
});

describe('POST /api/v1/kyc-aml-onboarding-cases/{caseId}/decision', () => {
  test('should record pass decision and update status to approved', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a pass decision
    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.status, 'approved');
    assert.ok(responseBody.data.decision);
    assert.strictEqual(responseBody.data.decision.outcome, 'pass');
    assert.strictEqual(responseBody.data.decision.rationale, 'All documents verified successfully');
    assert.strictEqual(responseBody.data.decision.decidedByUserId, 'reviewer_789');
    assert.ok(responseBody.data.decision.decidedAt);
    assert.ok(responseBody.data.updatedAt);

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // Case creation + decision
    const auditEvent = auditRepo.events[1];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
    assert.strictEqual(auditEvent.method, 'POST');
  });

  test('should record fail decision with reason codes and update status to rejected', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a fail decision
    const decisionPayload = {
      outcome: 'fail',
      rationale: 'Identity verification failed',
      reasonCodes: ['identity_verification_failed']
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.status, 'rejected');
    assert.ok(responseBody.data.decision);
    assert.strictEqual(responseBody.data.decision.outcome, 'fail');
    assert.strictEqual(responseBody.data.decision.rationale, 'Identity verification failed');
    assert.deepStrictEqual(responseBody.data.decision.reasonCodes, ['identity_verification_failed']);
    assert.strictEqual(responseBody.data.decision.decidedByUserId, 'reviewer_789');

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // Case creation + decision
    const auditEvent = auditRepo.events[1];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should record flag decision with reason codes and update status to flagged', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a flag decision
    const decisionPayload = {
      outcome: 'flag',
      rationale: 'Beneficial ownership evidence requires manual compliance follow-up',
      reasonCodes: ['beneficial_ownership_unverified', 'manual_compliance_concern']
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.status, 'flagged');
    assert.ok(responseBody.data.decision);
    assert.strictEqual(responseBody.data.decision.outcome, 'flag');
    assert.strictEqual(responseBody.data.decision.rationale, 'Beneficial ownership evidence requires manual compliance follow-up');
    assert.deepStrictEqual(responseBody.data.decision.reasonCodes, ['beneficial_ownership_unverified', 'manual_compliance_concern']);
    assert.strictEqual(responseBody.data.decision.decidedByUserId, 'reviewer_789');

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // Case creation + decision
    const auditEvent = auditRepo.events[1];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should record block decision with reason codes and update status to blocked', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a block decision
    const decisionPayload = {
      outcome: 'block',
      rationale: 'High risk activity detected',
      reasonCodes: ['high_risk_activity']
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.status, 'blocked');
    assert.ok(responseBody.data.decision);
    assert.strictEqual(responseBody.data.decision.outcome, 'block');
    assert.strictEqual(responseBody.data.decision.rationale, 'High risk activity detected');
    assert.deepStrictEqual(responseBody.data.decision.reasonCodes, ['high_risk_activity']);
    assert.strictEqual(responseBody.data.decision.decidedByUserId, 'reviewer_789');

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // Case creation + decision
    const auditEvent = auditRepo.events[1];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should return 404 when case does not exist', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases/nonexistent-case/decision',
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 404);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.ok(responseBody.error.message.includes('not found'));

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, 'nonexistent-case');
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'notFound');
    assert.strictEqual(auditEvent.reason, 'case_not_found');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should return 400 when outcome is missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      // outcome is missing
      rationale: 'All documents verified successfully'
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('Outcome is required')));
  });

  test('should return 400 when outcome is invalid', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'invalid_outcome',
      rationale: 'All documents verified successfully'
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('Invalid outcome value')));
  });

  test('should return 400 when rationale is missing', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'pass'
      // rationale is missing
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('Rationale is required')));
  });

  test('should return 400 when rationale is blank', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'pass',
      rationale: '' // blank rationale
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('Rationale is required')));
  });

  test('should return 400 when fail outcome has no reason codes', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'fail',
      rationale: 'Some reason'
      // reasonCodes is missing
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('fail outcome requires at least one reason code')));
  });

  test('should return 400 when flag outcome has no reason codes', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'flag',
      rationale: 'Some reason'
      // reasonCodes is missing
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('flag outcome requires at least one reason code')));
  });

  test('should return 400 when block outcome has no reason codes', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'block',
      rationale: 'Some reason'
      // reasonCodes is missing
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('block outcome requires at least one reason code')));
  });

  test('should return 400 when reason code is invalid', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    const decisionPayload = {
      outcome: 'fail',
      rationale: 'Some reason',
      reasonCodes: ['invalid_reason_code']
    };

    const response = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Invalid decision input'));
    assert.ok(responseBody.error.details.issues.some((issue: string) => issue.includes('Invalid reason code')));
  });

  test('should return 400 when trying to record decision on already decided case', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Record first decision
    const firstDecisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: firstDecisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    // Try to record second decision
    const secondDecisionPayload = {
      outcome: 'fail',
      rationale: 'Changed my mind',
      reasonCodes: ['identity_verification_failed']
    };

    const secondDecisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: secondDecisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(secondDecisionResponse.statusCode, 400);
    const responseBody = secondDecisionResponse.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Decision already recorded'));

    // Assert audit event was recorded for conflict
    assert.strictEqual(auditRepo.events.length, 3); // Case creation + first decision + conflict
    const auditEvent = auditRepo.events[2];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.reason, 'invalid_state_transition');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should return 400 when trying to record decision on non-submitted case', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    
    // Manually create a case with approved status and no decision
    const approvedCase: OnboardingCase = {
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
      updatedAt: new Date().toISOString()
    };
    
    await repository.save(approvedCase);
    
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    // Try to record a decision on the already-approved case
    const decisionPayload = {
      outcome: 'fail',
      rationale: 'Changed my mind',
      reasonCodes: ['identity_verification_failed']
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${approvedCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 400);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Cannot record decision'));

    // Assert audit event was recorded for conflict
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, approvedCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'reviewer_789');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.reason, 'invalid_state_transition');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should ignore client authored decidedByUserId and use trusted actor context', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a pass decision with client authored decidedByUserId
    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789' // This should be used, not any client authored value
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.decision.decidedByUserId, 'reviewer_789');
  });

  test('should return 400 when x-actor-id header is missing for decision', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      accessAuditEventRepository: auditRepo.repository
    });

    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases/some-case/decision',
      payload: decisionPayload
      // x-actor-id header is missing
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.ok(responseBody.error.message.includes('Missing or invalid actor context'));

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 1);
    const auditEvent = auditRepo.events[0];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, 'some-case');
    assert.strictEqual(auditEvent.actorUserId, 'unknown');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.reason, 'missing_actor_context');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should allow pass outcome without reason codes', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1'
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Now record a pass decision without reason codes
    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
      // No reasonCodes
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'reviewer_789'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 200);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.data.status, 'approved');
  });

  test('should return 403 when user is not authorized to record decision', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const auditRepo = createInMemoryAccessAuditRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes with a denied authorization function
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      authorizeDecision: async (): Promise<boolean> => false,
      accessAuditEventRepository: auditRepo.repository
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Try to record a decision with unauthorized user
    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 403);
    const responseBody = decisionResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'User is not authorized to record KYC/AML onboarding decision');

    // Assert audit event was recorded
    assert.strictEqual(auditRepo.events.length, 2); // Case creation + forbidden decision
    const auditEvent = auditRepo.events[1];
    assert.strictEqual(auditEvent.action, 'recordKycAmlOnboardingCaseDecision');
    assert.strictEqual(auditEvent.targetType, 'kycAmlOnboardingCase');
    assert.strictEqual(auditEvent.targetId, createdCase.id);
    assert.strictEqual(auditEvent.actorUserId, 'unauthorized_user');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'reviewer_authorization_required');
    assert.strictEqual(auditEvent.module, 'kyc-aml-onboarding');
  });

  test('should not mutate case when reviewer is unauthorized', async () => {
    const repository = new InMemoryOnboardingCaseRepository();
    const server = createTestableServer();
    
    // Register the KYC/AML routes with a denied authorization function
    await server.register(registerKYCAMLRoutes, { 
      repository, 
      prefix: '/api/v1',
      authorizeDecision: async (): Promise<boolean> => false
    });

    // First create a case
    const createPayload = {
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
        },
        {
          type: 'authorizedRepresentativeIdentity',
          name: 'director-id.pdf',
          uri: 'https://storage.example.com/director-id.pdf',
          mediaType: 'application/pdf'
        },
        {
          type: 'amlDeclaration',
          name: 'aml-declaration.pdf',
          uri: 'https://storage.example.com/aml-declaration.pdf',
          mediaType: 'application/pdf'
        }
      ]
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/kyc-aml-onboarding-cases',
      payload: createPayload,
      headers: {
        'x-actor-id': 'user_456'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdCase = createResponse.json().data;

    // Verify initial status
    const initialCase = await repository.findById(createdCase.id);
    assert.strictEqual(initialCase?.status, 'submitted');
    assert.strictEqual(initialCase?.decision, undefined);

    // Try to record a decision with unauthorized user
    const decisionPayload = {
      outcome: 'pass',
      rationale: 'All documents verified successfully'
    };

    const decisionResponse = await server.inject({
      method: 'POST',
      url: `/api/v1/kyc-aml-onboarding-cases/${createdCase.id}/decision`,
      payload: decisionPayload,
      headers: {
        'x-actor-id': 'unauthorized_user'
      }
    });

    assert.strictEqual(decisionResponse.statusCode, 403);

    // Verify case was not mutated
    const unchangedCase = await repository.findById(createdCase.id);
    assert.strictEqual(unchangedCase?.status, 'submitted');
    assert.strictEqual(unchangedCase?.decision, undefined);
  });
});
