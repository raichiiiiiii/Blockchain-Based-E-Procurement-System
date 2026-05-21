import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryOnboardingCaseRepository } from '../infrastructure/in-memory-onboarding-case-repository.js';
import { registerKYCAMLRoutes } from './routes.js';

describe('POST /api/v1/kyc-aml-onboarding-cases', () => {
  test('should create onboarding case with valid data', async () => {
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
});
