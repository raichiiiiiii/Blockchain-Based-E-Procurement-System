import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { OnboardingCaseRepository } from '../application/create-onboarding-case.js';
import { createOnboardingCase, type CreateOnboardingCaseInput } from '../application/create-onboarding-case.js';
import { recordOnboardingReviewDecision, type RecordOnboardingReviewDecisionInput } from '../application/record-onboarding-review-decision.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import { recordAccessAuditEvent } from '../../shared/application/record-access-audit-event.js';
import { getOnboardingStatusHistory } from '../application/get-onboarding-status-history.js';
import { getOnboardingEligibility } from '../application/get-onboarding-eligibility.js';

// Define the audit event interface for kyc/aml onboarding case creation
export interface KycAmlOnboardingCaseCreateAuditEvent {
  action: 'createKycAmlOnboardingCase';
  targetType: 'kycAmlOnboardingCase';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden' | 'conflict' | 'validationError';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for kyc/aml onboarding case decision
export interface KycAmlOnboardingCaseDecisionAuditEvent {
  action: 'recordKycAmlOnboardingCaseDecision';
  targetType: 'kycAmlOnboardingCase';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden' | 'notFound' | 'validationError' | 'conflict';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for kyc/aml onboarding eligibility check
export interface KycAmlOnboardingEligibilityCheckAuditEvent {
  action: 'checkKycAmlOnboardingEligibility';
  targetType: 'kycAmlOnboardingEligibility';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden' | 'validationError';
  actorId: string;
  reason?: string;
}

// Authorization seam type definition for submission
export type OnboardingSubmissionAuthorization = (
  actorId: string,
  organizationId: string
) => Promise<boolean>;

// Authorization seam type definition for decision
export type OnboardingDecisionAuthorization = (
  actorId: string,
  caseId: string
) => Promise<boolean>;

// Authorization seam type definition for status history retrieval
export type OnboardingStatusHistoryAuthorization = (
  actorId: string,
  caseId: string
) => Promise<boolean>;

// Authorization seam type definition for eligibility check
export type OnboardingEligibilityAuthorization = (
  actorId: string,
  memberOrganizationId: string
) => Promise<boolean>;

// Default authorization function for submission
export const allowAuthenticatedSubmission: OnboardingSubmissionAuthorization = async (
  actorId,
  organizationId
): Promise<boolean> => actorId.trim().length > 0 && organizationId.trim().length > 0;

// Default authorization function for decision
export const allowAuthenticatedDecision: OnboardingDecisionAuthorization = async (
  actorId,
  caseId
): Promise<boolean> => actorId.trim().length > 0 && caseId.trim().length > 0;

// Default authorization function for status history retrieval
export const allowAuthenticatedStatusHistory: OnboardingStatusHistoryAuthorization = async (
  actorId,
  caseId
): Promise<boolean> => actorId.trim().length > 0 && caseId.trim().length > 0;

// Default authorization function for eligibility check
export const allowAuthenticatedEligibility: OnboardingEligibilityAuthorization = async (
  actorId,
  memberOrganizationId
): Promise<boolean> => actorId.trim().length > 0 && memberOrganizationId.trim().length > 0;

interface KYCAMLRoutesOptions {
  repository: OnboardingCaseRepository;
  accessAuditEventRepository?: AccessAuditEventRepository;
  authorizeSubmission?: OnboardingSubmissionAuthorization;
  authorizeDecision?: OnboardingDecisionAuthorization;
  authorizeStatusHistory?: OnboardingStatusHistoryAuthorization;
  authorizeEligibility?: OnboardingEligibilityAuthorization;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
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

interface RecordOnboardingReviewDecisionRequest {
  outcome?: string;
  rationale?: string;
  reasonCodes?: string[];
}

const registerKYCAMLRoutes: FastifyPluginAsync<KYCAMLRoutesOptions> = async (fastify, options) => {
  const {
    repository,
    accessAuditEventRepository,
    authorizeSubmission = allowAuthenticatedSubmission,
    authorizeDecision = allowAuthenticatedDecision,
    authorizeStatusHistory = allowAuthenticatedStatusHistory,
    authorizeEligibility = allowAuthenticatedEligibility,
    authenticatedPreHandler
  } = options;

  const authenticatedRouteOptions = authenticatedPreHandler
    ? { preHandler: authenticatedPreHandler }
    : {};

  // GET /api/v1/kyc-aml-onboarding/eligibility/{memberOrganizationId} - Get onboarding eligibility for an organization
  fastify.get<{ Params: { memberOrganizationId: string } }>(
    '/kyc-aml-onboarding/eligibility/:memberOrganizationId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['memberOrganizationId'],
          properties: {
            memberOrganizationId: { type: 'string' }
          }
        }
      },
      ...authenticatedRouteOptions
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;

      if (!actorId) {
        // Record audit event for missing actor context
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: 'unknown',
          action: 'checkKycAmlOnboardingEligibility',
          targetType: 'kycAmlOnboardingEligibility',
          targetId: request.params.memberOrganizationId,
          outcome: 'validationError',
          reason: 'missing_actor_context',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId',
          method: 'GET'
        });

        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      const memberOrganizationId = request.params.memberOrganizationId;
      
      // Check authorization for eligibility retrieval
      const isAuthorized = await authorizeEligibility(actorId, memberOrganizationId);
      if (!isAuthorized) {
        // Record audit event for unauthorized eligibility check
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'checkKycAmlOnboardingEligibility',
          targetType: 'kycAmlOnboardingEligibility',
          targetId: memberOrganizationId,
          outcome: 'forbidden',
          reason: 'eligibility_authorization_required',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId',
          method: 'GET'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User is not authorized to retrieve KYC/AML onboarding eligibility'
          }
        });
      }
      
      const result = await getOnboardingEligibility(memberOrganizationId, repository);
      
      // Record audit event for successful eligibility check with specific reason
      let auditReason: string;
      switch (result.eligibility) {
        case 'eligible':
          auditReason = 'eligibility_eligible';
          break;
        case 'flagged':
          auditReason = 'eligibility_flagged';
          break;
        case 'blocked':
          auditReason = 'eligibility_blocked';
          break;
        case 'notEligible':
          auditReason = 'eligibility_not_eligible';
          break;
        case 'pendingReview':
          auditReason = 'eligibility_pending_review';
          break;
        case 'unknown':
          auditReason = 'eligibility_unknown';
          break;
        default:
          auditReason = 'eligibility_unknown';
      }
      
      await recordAccessAuditEvent(accessAuditEventRepository, {
        requestId: request.id,
        actorUserId: actorId,
        action: 'checkKycAmlOnboardingEligibility',
        targetType: 'kycAmlOnboardingEligibility',
        targetId: memberOrganizationId,
        outcome: 'success',
        reason: auditReason,
        module: 'kyc-aml-onboarding',
        route: '/api/v1/kyc-aml-onboarding/eligibility/:memberOrganizationId',
        method: 'GET'
      });
      
      return reply.code(200).send({
        data: result
      });
    }
  );

  // GET /api/v1/kyc-aml-onboarding-cases/{caseId}/status-history - Get status history for a KYC/AML onboarding case
  fastify.get<{ Params: { caseId: string } }>(
    '/kyc-aml-onboarding-cases/:caseId/status-history',
    {
      schema: {
        params: {
          type: 'object',
          required: ['caseId'],
          properties: {
            caseId: { type: 'string' }
          }
        }
      },
      ...authenticatedRouteOptions
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;

      if (!actorId) {
        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      const caseId = request.params.caseId;
      
      // Check authorization for status history retrieval
      const isAuthorized = await authorizeStatusHistory(actorId, caseId);
      if (!isAuthorized) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User is not authorized to retrieve KYC/AML onboarding status history'
          }
        });
      }
      
      const result = await getOnboardingStatusHistory(caseId, repository);
      
      if (result.status === 'notFound') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: result.message
          }
        });
      }
      
      return reply.code(200).send({
        data: result.data
      });
    }
  );

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
      },
      ...authenticatedRouteOptions
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;

      if (!actorId) {
        // Record audit event for missing actor context
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: 'unknown',
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: 'unknown',
          outcome: 'validationError',
          reason: 'missing_actor_context',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      // Validate evidenceReferences is not empty
      if (!request.body.evidenceReferences || request.body.evidenceReferences.length === 0) {
        // Record audit event for empty evidence references
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: request.body.memberOrganizationId,
          outcome: 'validationError',
          reason: 'empty_evidence_references',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Evidence references must not be empty'));
      }

      // Validate each evidence reference has required metadata
      for (const [index, ref] of request.body.evidenceReferences.entries()) {
        if (!ref.type || !ref.name || !ref.uri || !ref.mediaType) {
          // Record audit event for invalid evidence reference
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: actorId,
            action: 'createKycAmlOnboardingCase',
            targetType: 'kycAmlOnboardingCase',
            targetId: request.body.memberOrganizationId,
            outcome: 'validationError',
            reason: `invalid_evidence_reference_${index}`,
            module: 'kyc-aml-onboarding',
            route: '/api/v1/kyc-aml-onboarding-cases',
            method: 'POST'
          });

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

      // Call the application service with the injected authorization seam
      const result = await createOnboardingCase(input, repository, authorizeSubmission);

      // Map result to HTTP responses
      if (result.status === 'created') {
        // Record audit event for successful creation
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: result.onboardingCase.id,
          outcome: 'success',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

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
        // Record audit event for invalid input
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: request.body.memberOrganizationId,
          outcome: 'validationError',
          reason: 'invalid_input',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Invalid onboarding case input', result.issues));
      } else if (result.status === 'forbidden') {
        // Record audit event for forbidden access
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: request.body.memberOrganizationId,
          outcome: 'forbidden',
          reason: 'unauthorized_submission',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: result.message
          }
        });
      } else if (result.status === 'conflict') {
        // Record audit event for conflict
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createKycAmlOnboardingCase',
          targetType: 'kycAmlOnboardingCase',
          targetId: request.body.memberOrganizationId,
          outcome: 'conflict',
          reason: 'duplicate_open_case',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases',
          method: 'POST'
        });

        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: result.message
          }
        });
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

  // POST /api/v1/kyc-aml-onboarding-cases/{caseId}/decision - Record a KYC/AML review decision
  fastify.post<{ 
    Params: { caseId: string }, 
    Body: RecordOnboardingReviewDecisionRequest 
  }>(
    '/kyc-aml-onboarding-cases/:caseId/decision',
    {
      schema: {
        params: {
          type: 'object',
          required: ['caseId'],
          properties: {
            caseId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            outcome: { type: 'string' },
            rationale: { type: 'string' },
            reasonCodes: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          additionalProperties: true
        }
      },
      ...authenticatedRouteOptions
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;
      const caseId = request.params.caseId;

      if (!actorId) {
        // Record audit event for missing actor context
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: 'unknown',
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: caseId,
          outcome: 'validationError',
          reason: 'missing_actor_context',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Missing or invalid actor context'));
      }

      // Check authorization for decision
      const isAuthorized = await authorizeDecision(actorId, caseId);
      if (!isAuthorized) {
        // Record audit event for unauthorized reviewer
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: caseId,
          outcome: 'forbidden',
          reason: 'reviewer_authorization_required',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User is not authorized to record KYC/AML onboarding decision'
          }
        });
      }

      // Construct the input for the application service
      const input: RecordOnboardingReviewDecisionInput = {
        caseId: caseId,
        outcome: request.body.outcome,
        rationale: request.body.rationale,
        reasonCodes: request.body.reasonCodes,
        decidedByUserId: actorId
      };

      // Call the application service
      const result = await recordOnboardingReviewDecision(input, repository);

      // Map result to HTTP responses
      if (result.status === 'recorded') {
        // Record audit event for successful decision
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: result.onboardingCase.id,
          outcome: 'success',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(200).send({
          data: {
            id: result.onboardingCase.id,
            memberOrganizationId: result.onboardingCase.memberOrganizationId,
            status: result.onboardingCase.status,
            decision: result.onboardingCase.decision,
            updatedAt: result.onboardingCase.updatedAt
          }
        });
      } else if (result.status === 'invalidInput') {
        // Record audit event for invalid input
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: caseId,
          outcome: 'validationError',
          reason: 'invalid_decision_input',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Invalid decision input', result.issues));
      } else if (result.status === 'notFound') {
        // Record audit event for not found case
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: caseId,
          outcome: 'notFound',
          reason: 'case_not_found',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: result.message
          }
        });
      } else if (result.status === 'conflict') {
        // Record audit event for conflict/invalid state transition
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'recordKycAmlOnboardingCaseDecision',
          targetType: 'kycAmlOnboardingCase',
          targetId: caseId,
          outcome: 'conflict',
          reason: 'invalid_state_transition',
          module: 'kyc-aml-onboarding',
          route: '/api/v1/kyc-aml-onboarding-cases/:caseId/decision',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError(result.message));
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
