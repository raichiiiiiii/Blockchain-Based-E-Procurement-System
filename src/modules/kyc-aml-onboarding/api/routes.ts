import type { FastifyPluginAsync } from 'fastify';
import type { OnboardingCaseRepository } from '../application/create-onboarding-case.js';
import { createOnboardingCase, type CreateOnboardingCaseInput } from '../application/create-onboarding-case.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';

interface KYCAMLRoutesOptions {
  repository: OnboardingCaseRepository;
}

interface CreateOnboardingCaseRequest {
  memberOrganizationId: string;
  kyc: {
    legalName: string;
    registrationNumber: string;
    countryCode: string;
    businessType: string;
  };
  aml: {
    declaredBusinessActivity: string;
    expectedMonthlyTransactionValue: string;
    declaredSanctionsExposure: boolean;
    declaredPepExposure: boolean;
    riskSummary?: string;
  };
  evidenceReferences: Array<{
    type: 'companyRegistration' | 'authorizedRepresentativeIdentity' | 'beneficialOwnership' | 'amlDeclaration' | 'supportingDocument';
    name: string;
    uri: string;
    mediaType: string;
    checksum?: string;
  }>;
}

const registerKYCAMLRoutes: FastifyPluginAsync<KYCAMLRoutesOptions> = async (fastify, options) => {
  const { repository } = options;

  // POST /api/v1/kyc-aml-onboarding-cases - Submit a new KYC/AML onboarding case
  fastify.post<{ Body: CreateOnboardingCaseRequest }>(
    '/kyc-aml-onboarding-cases',
    {
      schema: {
        body: {
          type: 'object',
          required: ['memberOrganizationId', 'kyc', 'aml', 'evidenceReferences'],
          properties: {
            memberOrganizationId: { type: 'string' },
            kyc: {
              type: 'object',
              required: ['legalName', 'registrationNumber', 'countryCode', 'businessType'],
              properties: {
                legalName: { type: 'string' },
                registrationNumber: { type: 'string' },
                countryCode: { type: 'string' },
                businessType: { type: 'string' }
              }
            },
            aml: {
              type: 'object',
              required: ['declaredBusinessActivity', 'expectedMonthlyTransactionValue', 'declaredSanctionsExposure', 'declaredPepExposure'],
              properties: {
                declaredBusinessActivity: { type: 'string' },
                expectedMonthlyTransactionValue: { type: 'string' },
                declaredSanctionsExposure: { type: 'boolean' },
                declaredPepExposure: { type: 'boolean' },
                riskSummary: { type: 'string' }
              }
            },
            evidenceReferences: {
              type: 'array',
              items: {
                type: 'object',
                required: ['type', 'name', 'uri', 'mediaType'],
                properties: {
                  type: { 
                    type: 'string', 
                    enum: ['companyRegistration', 'authorizedRepresentativeIdentity', 'beneficialOwnership', 'amlDeclaration', 'supportingDocument'] 
                  },
                  name: { type: 'string' },
                  uri: { type: 'string' },
                  mediaType: { type: 'string' },
                  checksum: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;

      if (!actorId) {
        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      // Validate evidenceReferences is not empty
      if (!request.body.evidenceReferences || request.body.evidenceReferences.length === 0) {
        return reply.code(400).send(createApplicationValidationError('Evidence references must not be empty'));
      }

      // Validate each evidence reference has required metadata
      for (const [index, ref] of request.body.evidenceReferences.entries()) {
        if (!ref.type || !ref.name || !ref.uri || !ref.mediaType) {
          return reply.code(400).send(createApplicationValidationError(`Evidence reference at index ${index} missing required metadata`));
        }
      }

      // Construct the input for the application service
      const input: CreateOnboardingCaseInput = {
        memberOrganizationId: request.body.memberOrganizationId,
        kyc: request.body.kyc,
        aml: request.body.aml,
        evidenceReferences: request.body.evidenceReferences,
        submittedByUserId: actorId
      };

      // Call the application service
      const result = await createOnboardingCase(input, repository);

      // Map result to HTTP responses
      if (result.status === 'created') {
        return reply.code(201).send({
          data: {
            id: result.onboardingCase.id,
            memberOrganizationId: result.onboardingCase.memberOrganizationId,
            status: result.onboardingCase.status,
            submittedByUserId: result.onboardingCase.submittedByUserId,
            createdAt: result.onboardingCase.createdAt,
            updatedAt: result.onboardingCase.updatedAt,
            evidenceReferences: result.onboardingCase.evidenceReferences
          }
        });
      } else if (result.status === 'invalidInput') {
        return reply.code(400).send(createApplicationValidationError('Invalid onboarding case input', result.issues));
      }
      
      // This should never happen, but TypeScript requires handling all cases
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected error occurred'
        }
      });
    }
  );
};

export { registerKYCAMLRoutes };
