import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryOnboardingCaseRepository } from '../infrastructure/in-memory-onboarding-case-repository.js';
import { registerKYCAMLRoutes } from './routes.js';
import type { AccessAuditEvent } from '../../shared/application/access-audit-event.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';

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
