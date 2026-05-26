import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';
import { submitShariahReview, type SubmitShariahReviewInput } from '../application/submit-shariah-review.js';
import type { ShariahReview, ChecklistItemDefinition } from '../domain/shariah-review.js';
import type { RoleAssignmentRepository } from '../../access-control/application/role-assignment-repository.js';
import type { RoleRepository } from '../../access-control/application/role-repository.js';
import type { Checklist } from '../domain/shariah-review.js';
import { recordShariahReviewDecision, type DecisionInput, type DecisionResult } from '../application/record-shariah-review-decision.js';
import { getShariahReviewHistory, type GetShariahReviewHistoryResult } from '../application/get-shariah-review-history.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import { recordAccessAuditEvent } from '../../shared/application/record-access-audit-event.js';

// Define the audit event interface for shariah review submission
export interface ShariahReviewSubmitAuditEvent {
  action: 'submitShariahReview';
  targetType: 'shariahReview';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for checklist operations
export interface ShariahReviewChecklistAuditEvent {
  action: 'saveShariahReviewChecklist';
  targetType: 'shariahReview';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden' | 'validationError' | 'notFound' | 'invalidState';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for decision operations
export interface ShariahReviewDecisionAuditEvent {
  action: 'recordShariahReviewDecision';
  targetType: 'shariahReview';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden' | 'validationError' | 'notFound' | 'invalidState';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for history read operations
export interface ShariahReviewHistoryAuditEvent {
  action: 'viewShariahReviewHistory';
  targetType: 'shariahReview';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden';
  actorId: string;
  reason?: string;
  historyEntryCount?: number;
}

// Define plugin options interface
interface ShariahReviewRoutesOptions {
  repository: ShariahReviewRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  roleRepository: RoleRepository;
  audit: (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent | ShariahReviewHistoryAuditEvent) => void;
  accessAuditEventRepository?: AccessAuditEventRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
}

// Seeded checklist item definitions
const SEDED_CHECKLIST_ITEMS: ChecklistItemDefinition[] = [
  { itemCode: 'item1', isMandatory: true, requiresEvidence: false },
  { itemCode: 'item2', isMandatory: true, requiresEvidence: true },
  { itemCode: 'item3', isMandatory: false, requiresEvidence: false },
  { itemCode: 'item4', isMandatory: true, requiresEvidence: false }
];

// Coordinator role code constant
const COORDINATOR_ROLE_CODE = 'coordinator';

// Allowed role codes for history view
const HISTORY_VIEW_ALLOWED_ROLE_CODES = ['coordinator'];

// Valid states for saving checklist
const VALID_STATES_FOR_CHECKLIST_SAVE: ShariahReview['status'][] = ['submitted', 'checklistInProgress'];

// Create the Fastify plugin for shariah-review routes
const registerShariahReviewRoutes: FastifyPluginAsync<ShariahReviewRoutesOptions> = async (fastify, options) => {
  const {
    repository,
    roleAssignmentRepository,
    roleRepository,
    audit,
    accessAuditEventRepository,
    authenticatedPreHandler
  } = options;

  if (authenticatedPreHandler) {
    fastify.addHook('preHandler', authenticatedPreHandler);
  }

  // GET /api/v1/shariah-reviews/:reviewId/history - Get review history
  fastify.get<{ Params: { reviewId: string } }>(
    '/shariah-reviews/:reviewId/history',
    {
      schema: {
        params: {
          type: 'object',
          required: ['reviewId'],
          properties: {
            reviewId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        // Extract and validate actorId from trusted actor context
        const actorId = request.actorContext?.userId;

        if (!actorId) {
          return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
        }

        // Find the review
        const review = await repository.findById(request.params.reviewId);

        if (!review) {
          // Record shared access audit event for not found review
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'notFound',
            reason: 'review_not_found',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/history',
            method: 'GET'
          });

          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Review not found'
            }
          });
        }

        // Check if user has allowed role assignment for the review organization
        const allowedRoles = await roleRepository.findAll();
        const allowedRoleIds = allowedRoles
          .filter(role => HISTORY_VIEW_ALLOWED_ROLE_CODES.includes(role.roleCode) && role.status === 'active')
          .map(role => role.id);

        let hasAllowedRole = false;
        for (const roleId of allowedRoleIds) {
          const assignment = await roleAssignmentRepository.findActiveByUserOrganizationRole(
            actorId,
            review.organizationId,
            roleId
          );

          if (assignment) {
            hasAllowedRole = true;
            break;
          }
        }

        if (!hasAllowedRole) {
          // Emit audit event for forbidden history read attempt
          const auditEvent: ShariahReviewHistoryAuditEvent = {
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId: actorId,
            reason: 'insufficient_permissions'
          };

          audit(auditEvent);

          // Record shared access audit event for forbidden history read attempt
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'forbidden',
            reason: 'insufficient_permissions',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/history',
            method: 'GET'
          });

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Not authorized to view Shariah review history'
            }
          });
        }

        // Call the history service
        const result: GetShariahReviewHistoryResult = await getShariahReviewHistory(
          request.params.reviewId,
          repository
        );

        // Map result to HTTP responses
        if (result.status === 'found') {
          // Emit audit event for successful history read
          const auditEvent: ShariahReviewHistoryAuditEvent = {
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'success',
            actorId: actorId,
            historyEntryCount: result.history.history.length
          };

          audit(auditEvent);

          // Record shared access audit event for successful history read
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'success',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/history',
            method: 'GET'
          });

          return reply.code(200).send({
            data: result.history
          });
        } else {
          // Record shared access audit event for not found review in service
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'viewShariahReviewHistory',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'notFound',
            reason: 'review_not_found',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/history',
            method: 'GET'
          });

          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Review not found'
            }
          });
        }
      } catch (error) {
        // Record shared access audit event for unexpected error during history read
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'viewShariahReviewHistory',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'error',
          reason: 'history_read_failed',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/history',
          method: 'GET'
        });

        throw error;
      }
    }
  );

  // POST /api/v1/shariah-reviews - Submit a new Shariah review
  fastify.post<{ Body: Omit<SubmitShariahReviewInput, 'submittedByUserId'> }>(
    '/shariah-reviews',
    {
      schema: {
        body: {
          type: 'object',
          required: ['organizationId', 'title', 'summary'],
          properties: {
            organizationId: { type: 'string' },
            title: { type: 'string' },
            summary: { type: 'string' },
            references: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  name: { type: 'string' },
                  uri: { type: 'string' },
                  description: { type: 'string' },
                  mediaType: { type: 'string' }
                },
                required: ['type', 'name', 'uri', 'description', 'mediaType']
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
        // Record shared access audit event for missing actor context
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: 'unknown',
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: 'unknown',
          outcome: 'validationError',
          reason: 'missing_actor_context',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      // Find the coordinator role
      const coordinatorRole = await roleRepository.findByRoleCode(COORDINATOR_ROLE_CODE, 'organization');

      if (!coordinatorRole) {
        // If coordinator role doesn't exist, deny access
        const auditEvent: ShariahReviewSubmitAuditEvent = {
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: 'unknown',
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_role_not_found'
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Coordinator role not configured'
          }
        });
      }

      // Check if user has active coordinator role assignment in the target organization
      const coordinatorAssignment = await roleAssignmentRepository.findActiveByUserOrganizationRole(
        actorId,
        request.body.organizationId,
        coordinatorRole.id
      );

      if (!coordinatorAssignment) {
        // Emit audit event for forbidden submission
        const auditEvent: ShariahReviewSubmitAuditEvent = {
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: 'unknown',
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_required'
        };

        audit(auditEvent);

        // Record shared access audit event for coordinator denial
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: 'unknown',
          outcome: 'forbidden',
          reason: 'coordinator_required',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews',
          method: 'POST'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have coordinator role to submit reviews'
          }
        });
      }

      // Construct the input for the application service
      const input: SubmitShariahReviewInput = {
        organizationId: request.body.organizationId,
        title: request.body.title,
        summary: request.body.summary,
        submittedByUserId: actorId,
        ...(request.body.references && { references: request.body.references })
      };

      // Call the application service
      const result = await submitShariahReview(input, repository);

      // Map result to HTTP responses
      if (result.status === 'submitted') {
        // Emit audit event for successful submission
        const auditEvent: ShariahReviewSubmitAuditEvent = {
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: result.review.id,
          timestamp: result.review.createdAt,
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        // Record shared access audit event for success
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: result.review.id,
          outcome: 'success',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews',
          method: 'POST'
        });

        // Prepare response data including references if they exist
        const responseData: any = {
          id: result.review.id,
          organizationId: result.review.organizationId,
          title: result.review.title,
          summary: result.review.summary,
          status: result.review.status,
          submittedByUserId: result.review.submittedByUserId,
          createdAt: result.review.createdAt
        };

        // Include references in response if they exist
        if (result.review.references && result.review.references.length > 0) {
          responseData.references = result.review.references;
        }

        return reply.code(201).send({
          data: responseData
        });
      } else if (result.status === 'invalidInput') {
        // Record shared access audit event for invalid input
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'submitShariahReview',
          targetType: 'shariahReview',
          targetId: 'unknown',
          outcome: 'validationError',
          reason: 'invalid_input',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Invalid review submission input'));
      }
    }
  );

  // PUT /api/v1/shariah-reviews/:reviewId/checklist - Save checklist for a review
  fastify.put<{
    Params: { reviewId: string },
    Body: { entries: any[]; reviewerComment?: string; completeChecklist?: boolean }
  }>(
    '/shariah-reviews/:reviewId/checklist',
    {
      schema: {
        params: {
          type: 'object',
          required: ['reviewId'],
          properties: {
            reviewId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['entries'],
          properties: {
            entries: {
              type: 'array',
              items: {
                type: 'object',
                required: ['itemCode', 'outcome'],
                properties: {
                  itemCode: { type: 'string' },
                  outcome: { type: 'string', enum: ['pass', 'fail', 'notApplicable'] },
                  comment: { type: 'string' },
                  evidenceRefs: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            },
            reviewerComment: { type: 'string' },
            completeChecklist: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      // Extract and validate actorId from trusted actor context
      const actorId = request.actorContext?.userId;

      if (!actorId) {
        // Emit audit event for forbidden checklist save attempt due to missing actor
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: 'unknown',
          reason: 'missing_actor_id'
        };

        audit(auditEvent);

        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      // Find the review
      const review = await repository.findById(request.params.reviewId);

      if (!review) {
        // Emit audit event for forbidden checklist save attempt due to missing review
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId,
          reason: 'review_not_found'
        };

        audit(auditEvent);

        // Record shared access audit event for not found review
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'updateShariahChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'notFound',
          reason: 'review_not_found',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/checklist',
          method: 'PUT'
        });

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found'
          }
        });
      }

      // Check if review is in a valid state for checklist operations
      if (!VALID_STATES_FOR_CHECKLIST_SAVE.includes(review.status)) {
        // Emit audit event for blocked checklist save attempt due to wrong state
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId,
          reason: `invalid_review_status_${review.status}`
        };

        audit(auditEvent);

        // Record shared access audit event for invalid state
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'updateShariahChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'validationError',
          reason: 'invalid_review_status',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/checklist',
          method: 'PUT'
        });

        return reply.code(400).send(createApplicationValidationError(`Cannot save checklist for review in status: ${review.status}`));
      }

      // Find the coordinator role
      const coordinatorRole = await roleRepository.findByRoleCode(COORDINATOR_ROLE_CODE, 'organization');

      if (!coordinatorRole) {
        // Emit audit event for forbidden checklist save attempt due to missing coordinator role
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_role_not_found'
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Coordinator role not configured'
          }
        });
      }

      // Check if user has active coordinator role assignment in the target organization
      const coordinatorAssignment = await roleAssignmentRepository.findActiveByUserOrganizationRole(
        actorId,
        review.organizationId,
        coordinatorRole.id
      );

      if (!coordinatorAssignment) {
        // Emit audit event for forbidden checklist save attempt
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_required'
        };

        audit(auditEvent);

        // Record shared access audit event for reviewer denial
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'updateShariahChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'forbidden',
          reason: 'reviewer_required',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/checklist',
          method: 'PUT'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have coordinator role to save checklists'
          }
        });
      }

      // Validate checklist entries
      const entries = request.body.entries;

      // Check for duplicate itemCodes
      const itemCodes = entries.map(entry => entry.itemCode);
      const uniqueItemCodes = new Set(itemCodes);
      if (itemCodes.length !== uniqueItemCodes.size) {
        // Emit audit event for failed checklist save due to validation error
        const auditEvent: ShariahReviewChecklistAuditEvent = {
          action: 'saveShariahReviewChecklist',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId,
          reason: 'duplicate_item_codes'
        };

        audit(auditEvent);

        // Record shared access audit event for validation error
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'updateShariahChecklist',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'validationError',
          reason: 'invalid_checklist_input',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/checklist',
          method: 'PUT'
        });

        return reply.code(400).send(createApplicationValidationError('Duplicate itemCode entries are not allowed'));
      }

      // Validate each entry against seeded checklist items
      for (const entry of entries) {
        // Check if itemCode exists in seeded items
        const seededItem = SEDED_CHECKLIST_ITEMS.find(item => item.itemCode === entry.itemCode);
        if (!seededItem) {
          // Emit audit event for failed checklist save due to validation error
          const auditEvent: ShariahReviewChecklistAuditEvent = {
            action: 'saveShariahReviewChecklist',
            targetType: 'shariahReview',
            targetId: review.id,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: `unknown_checklist_item_${entry.itemCode}`
          };

          audit(auditEvent);

          // Record shared access audit event for validation error
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'updateShariahChecklist',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_checklist_input',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/checklist',
            method: 'PUT'
          });

          return reply.code(400).send(createApplicationValidationError(`Unknown checklist item code: ${entry.itemCode}`));
        }

        // Check if fail outcome has comment
        if (entry.outcome === 'fail' && (!entry.comment || entry.comment.trim() === '')) {
          // Emit audit event for failed checklist save due to validation error
          const auditEvent: ShariahReviewChecklistAuditEvent = {
            action: 'saveShariahReviewChecklist',
            targetType: 'shariahReview',
            targetId: review.id,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: `missing_comment_for_failed_item_${entry.itemCode}`
          };

          audit(auditEvent);

          // Record shared access audit event for validation error
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'updateShariahChecklist',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_checklist_input',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/checklist',
            method: 'PUT'
          });

          return reply.code(400).send(createApplicationValidationError(`Failed checklist item '${entry.itemCode}' must have a comment`));
        }

        // Check if evidence is required but missing
        if (seededItem.requiresEvidence && (!entry.evidenceRefs || entry.evidenceRefs.length === 0)) {
          // Emit audit event for failed checklist save due to validation error
          const auditEvent: ShariahReviewChecklistAuditEvent = {
            action: 'saveShariahReviewChecklist',
            targetType: 'shariahReview',
            targetId: review.id,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: `missing_evidence_for_item_${entry.itemCode}`
          };

          audit(auditEvent);

          // Record shared access audit event for validation error
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'updateShariahChecklist',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_checklist_input',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/checklist',
            method: 'PUT'
          });

          return reply.code(400).send(createApplicationValidationError(`Checklist item '${entry.itemCode}' requires evidence`));
        }
      }

      // Check if all mandatory items are present
      const mandatoryItems = SEDED_CHECKLIST_ITEMS.filter(item => item.isMandatory);
      const providedItemCodes = new Set(entries.map(entry => entry.itemCode));
      const allMandatoryItemsPresent = mandatoryItems.every(item => providedItemCodes.has(item.itemCode));

      // Handle completion intent
      const isCompletionIntent = request.body.completeChecklist === true;

      if (isCompletionIntent) {
        // If completion intent is requested, validate all completion rules
        if (!allMandatoryItemsPresent) {
          // Emit audit event for failed checklist save due to validation error
          const auditEvent: ShariahReviewChecklistAuditEvent = {
            action: 'saveShariahReviewChecklist',
            targetType: 'shariahReview',
            targetId: review.id,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: 'missing_mandatory_items_for_completion'
          };

          audit(auditEvent);

          // Record shared access audit event for validation error
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'updateShariahChecklist',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_checklist_input',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/checklist',
            method: 'PUT'
          });

          return reply.code(400).send(createApplicationValidationError('All mandatory checklist items must be provided for completion'));
        }

        // Check if all failed items have comments
        for (const entry of entries) {
          if (entry.outcome === 'fail' && (!entry.comment || entry.comment.trim() === '')) {
            // Emit audit event for failed checklist save due to validation error
            const auditEvent: ShariahReviewChecklistAuditEvent = {
              action: 'saveShariahReviewChecklist',
              targetType: 'shariahReview',
              targetId: review.id,
              timestamp: new Date().toISOString(),
              requestId: request.id,
              outcome: 'validationError',
              actorId: actorId,
              reason: `missing_comment_for_failed_item_${entry.itemCode}_on_completion`
            };

            audit(auditEvent);

            // Record shared access audit event for validation error
            await recordAccessAuditEvent(accessAuditEventRepository, {
              requestId: request.id,
              actorUserId: request.actorContext?.userId ?? 'unknown',
              action: 'updateShariahChecklist',
              targetType: 'shariahReview',
              targetId: request.params.reviewId,
              outcome: 'validationError',
              reason: 'invalid_checklist_input',
              module: 'shariah-review',
              route: '/api/v1/shariah-reviews/:reviewId/checklist',
              method: 'PUT'
            });

            return reply.code(400).send(createApplicationValidationError(`Failed checklist item '${entry.itemCode}' must have a comment for completion`));
          }
        }

        // Check if all evidence-required items have evidence
        for (const entry of entries) {
          const seededItem = SEDED_CHECKLIST_ITEMS.find(item => item.itemCode === entry.itemCode);
          if (seededItem && seededItem.requiresEvidence && (!entry.evidenceRefs || entry.evidenceRefs.length === 0)) {
            // Emit audit event for failed checklist save due to validation error
            const auditEvent: ShariahReviewChecklistAuditEvent = {
              action: 'saveShariahReviewChecklist',
              targetType: 'shariahReview',
              targetId: review.id,
              timestamp: new Date().toISOString(),
              requestId: request.id,
              outcome: 'validationError',
              actorId: actorId,
              reason: `missing_evidence_for_item_${entry.itemCode}_on_completion`
            };

            audit(auditEvent);

            // Record shared access audit event for validation error
            await recordAccessAuditEvent(accessAuditEventRepository, {
              requestId: request.id,
              actorUserId: request.actorContext?.userId ?? 'unknown',
              action: 'updateShariahChecklist',
              targetType: 'shariahReview',
              targetId: request.params.reviewId,
              outcome: 'validationError',
              reason: 'invalid_checklist_input',
              module: 'shariah-review',
              route: '/api/v1/shariah-reviews/:reviewId/checklist',
              method: 'PUT'
            });

            return reply.code(400).send(createApplicationValidationError(`Checklist item '${entry.itemCode}' requires evidence for completion`));
          }
        }
      }

      // Determine status based on checklist completeness
      const status: ShariahReview['status'] = allMandatoryItemsPresent ? 'checklistComplete' : 'checklistInProgress';

      // Create checklist object
      const checklist: Checklist = {
        entries: entries.map(entry => ({
          itemCode: entry.itemCode,
          outcome: entry.outcome as any,
          ...(entry.comment && { comment: entry.comment }),
          ...(entry.evidenceRefs && { evidenceRefs: entry.evidenceRefs })
        })),
        status,
        ...(request.body.reviewerComment && { reviewerComment: request.body.reviewerComment })
      };

      // Update review with checklist
      const updatedReview: ShariahReview = {
        ...review,
        status,
        checklist
      };

      // Save updated review
      await repository.save(updatedReview);

      // Emit audit event for successful checklist save
      const auditEvent: ShariahReviewChecklistAuditEvent = {
        action: 'saveShariahReviewChecklist',
        targetType: 'shariahReview',
        targetId: updatedReview.id,
        timestamp: new Date().toISOString(),
        requestId: request.id,
        outcome: 'success',
        actorId: actorId
      };

      audit(auditEvent);

      // Record shared access audit event for success
      await recordAccessAuditEvent(accessAuditEventRepository, {
        requestId: request.id,
        actorUserId: request.actorContext?.userId ?? 'unknown',
        action: 'updateShariahChecklist',
        targetType: 'shariahReview',
        targetId: request.params.reviewId,
        outcome: 'success',
        module: 'shariah-review',
        route: '/api/v1/shariah-reviews/:reviewId/checklist',
        method: 'PUT'
      });

      // Return success response
      return reply.code(200).send({
        data: {
          reviewId: updatedReview.id,
          status: updatedReview.status
        }
      });
    }
  );

  // POST /api/v1/shariah-reviews/:reviewId/decision - Record a decision for a review
  fastify.post<{
    Params: { reviewId: string },
    Body: Omit<DecisionInput, 'reviewId'>
  }>(
    '/shariah-reviews/:reviewId/decision',
    {
      schema: {
        params: {
          type: 'object',
          required: ['reviewId'],
          properties: {
            reviewId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          required: ['outcome', 'rationale'],
          properties: {
            outcome: {
              type: 'string',
              enum: ['approved', 'rejected', 'conditionalApproved']
            },
            rationale: { type: 'string' },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['description', 'dueDate'],
                properties: {
                  description: { type: 'string' },
                  dueDate: { type: 'string' }
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
        // Emit audit event for forbidden decision attempt due to missing actor
        const auditEvent: ShariahReviewDecisionAuditEvent = {
          action: 'recordShariahReviewDecision',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: 'unknown',
          reason: 'missing_actor_id'
        };

        audit(auditEvent);

        // Record shared access audit event for missing actor context
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: 'unknown',
          action: 'recordShariahDecision',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'validationError',
          reason: 'missing_actor_context',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/decision',
          method: 'POST'
        });

        return reply.code(400).send(createApplicationValidationError('Missing or invalid x-actor-id header'));
      }

      // Find the review
      const review = await repository.findById(request.params.reviewId);

      if (!review) {
        // Emit audit event for not found decision attempt
        const auditEvent: ShariahReviewDecisionAuditEvent = {
          action: 'recordShariahReviewDecision',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'notFound',
          actorId: actorId,
          reason: 'review_not_found'
        };

        audit(auditEvent);

        // Record shared access audit event for not found decision attempt
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'recordShariahDecision',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'notFound',
          reason: 'review_not_found',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/decision',
          method: 'POST'
        });

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found'
          }
        });
      }

      // Find the coordinator role
      const coordinatorRole = await roleRepository.findByRoleCode(COORDINATOR_ROLE_CODE, 'organization');

      if (!coordinatorRole) {
        // Emit audit event for forbidden decision attempt due to missing coordinator role
        const auditEvent: ShariahReviewDecisionAuditEvent = {
          action: 'recordShariahReviewDecision',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_role_not_found'
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Coordinator role not configured'
          }
        });
      }

      // Check if user has active coordinator role assignment in the target organization
      const coordinatorAssignment = await roleAssignmentRepository.findActiveByUserOrganizationRole(
        actorId,
        review.organizationId,
        coordinatorRole.id
      );

      if (!coordinatorAssignment) {
        // Emit audit event for forbidden decision attempt
        const auditEvent: ShariahReviewDecisionAuditEvent = {
          action: 'recordShariahReviewDecision',
          targetType: 'shariahReview',
          targetId: review.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: 'coordinator_required'
        };

        audit(auditEvent);

        // Record shared access audit event for reviewer denial
        await recordAccessAuditEvent(accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: request.actorContext?.userId ?? 'unknown',
          action: 'recordShariahDecision',
          targetType: 'shariahReview',
          targetId: request.params.reviewId,
          outcome: 'forbidden',
          reason: 'reviewer_required',
          module: 'shariah-review',
          route: '/api/v1/shariah-reviews/:reviewId/decision',
          method: 'POST'
        });

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have coordinator role to record decisions'
          }
        });
      }

      // Prepare decision input
      const decisionInput: DecisionInput = {
        reviewId: request.params.reviewId,
        outcome: request.body.outcome,
        rationale: request.body.rationale,
        ...(request.body.conditions && { conditions: request.body.conditions })
      };

      // Call the decision service
      const result: DecisionResult = await recordShariahReviewDecision(decisionInput, repository);

      // Map result to HTTP responses and emit audit events
      switch (result.status) {
        case 'success':
          // Emit audit event for successful decision recording
          const successAuditEvent: ShariahReviewDecisionAuditEvent = {
            action: 'recordShariahReviewDecision',
            targetType: 'shariahReview',
            targetId: result.review.id,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'success',
            actorId: actorId
          };

          audit(successAuditEvent);

          // Record shared access audit event for success
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'recordShariahDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'success',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/decision',
            method: 'POST'
          });

          return reply.code(200).send({
            data: {
              reviewId: result.review.id,
              status: result.review.status,
              decidedAt: result.review.decidedAt
            }
          });

        case 'notFound':
          // Emit audit event for not found decision attempt
          const notFoundAuditEvent: ShariahReviewDecisionAuditEvent = {
            action: 'recordShariahReviewDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'notFound',
            actorId: actorId,
            reason: 'review_not_found_after_validation'
          };

          audit(notFoundAuditEvent);

          // Record shared access audit event for not found decision attempt
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'recordShariahDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'notFound',
            reason: 'review_not_found_after_validation',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/decision',
            method: 'POST'
          });

          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Review not found'
            }
          });

        case 'invalidState':
          // Emit audit event for invalid state decision attempt
          const invalidStateAuditEvent: ShariahReviewDecisionAuditEvent = {
            action: 'recordShariahReviewDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: `invalid_review_status_${result.currentStatus}`
          };

          audit(invalidStateAuditEvent);

          // Record shared access audit event for invalid state
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'recordShariahDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_review_status',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/decision',
            method: 'POST'
          });

          return reply.code(400).send(createApplicationValidationError(`Cannot record decision for review in status: ${result.currentStatus}`));

        case 'validationError':
          // Emit audit event for validation error decision attempt
          const validationErrorAuditEvent: ShariahReviewDecisionAuditEvent = {
            action: 'recordShariahReviewDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'validationError',
            actorId: actorId,
            reason: 'decision_validation_failed'
          };

          audit(validationErrorAuditEvent);

          // Record shared access audit event for validation error
          await recordAccessAuditEvent(accessAuditEventRepository, {
            requestId: request.id,
            actorUserId: request.actorContext?.userId ?? 'unknown',
            action: 'recordShariahDecision',
            targetType: 'shariahReview',
            targetId: request.params.reviewId,
            outcome: 'validationError',
            reason: 'invalid_decision_input',
            module: 'shariah-review',
            route: '/api/v1/shariah-reviews/:reviewId/decision',
            method: 'POST'
          });

          return reply.code(400).send(createApplicationValidationError('Decision validation failed', result.issues));
      }
    }
  );
};

export { registerShariahReviewRoutes };
