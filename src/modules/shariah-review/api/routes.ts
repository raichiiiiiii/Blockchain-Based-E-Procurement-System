import type { FastifyPluginAsync } from 'fastify';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';
import { submitShariahReview, type SubmitShariahReviewInput } from '../application/submit-shariah-review.js';
import type { ShariahReview, ChecklistItemDefinition } from '../domain/shariah-review.js';
import type { RoleAssignmentRepository } from '../../access-control/application/role-assignment-repository.js';
import type { RoleRepository } from '../../access-control/application/role-repository.js';
import type { Checklist } from '../domain/shariah-review.js';

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

// Define plugin options interface
interface ShariahReviewRoutesOptions {
  repository: ShariahReviewRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
  roleRepository: RoleRepository;
  audit: (event: ShariahReviewSubmitAuditEvent) => void;
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

// Create the Fastify plugin for shariah-review routes
const registerShariahReviewRoutes: FastifyPluginAsync<ShariahReviewRoutesOptions> = async (fastify, options) => {
  const { repository, roleAssignmentRepository, roleRepository, audit } = options;

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
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing or invalid x-actor-id header'
          }
        });
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
        
        return reply.code(201).send({
          data: result.review
        });
      } else if (result.status === 'invalidInput') {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid review submission input'
          }
        });
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
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing or invalid x-actor-id header'
          }
        });
      }

      // Find the review
      const review = await repository.findById(request.params.reviewId);
      
      if (!review) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Review not found'
          }
        });
      }

      // Validate checklist entries
      const entries = request.body.entries;
      
      // Check for duplicate itemCodes
      const itemCodes = entries.map(entry => entry.itemCode);
      const uniqueItemCodes = new Set(itemCodes);
      if (itemCodes.length !== uniqueItemCodes.size) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Duplicate itemCode entries are not allowed'
          }
        });
      }

      // Validate each entry against seeded checklist items
      for (const entry of entries) {
        // Check if itemCode exists in seeded items
        const seededItem = SEDED_CHECKLIST_ITEMS.find(item => item.itemCode === entry.itemCode);
        if (!seededItem) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Unknown checklist item code: ${entry.itemCode}`
            }
          });
        }

        // Check if fail outcome has comment
        if (entry.outcome === 'fail' && (!entry.comment || entry.comment.trim() === '')) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Failed checklist item '${entry.itemCode}' must have a comment`
            }
          });
        }

        // Check if evidence is required but missing
        if (seededItem.requiresEvidence && (!entry.evidenceRefs || entry.evidenceRefs.length === 0)) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: `Checklist item '${entry.itemCode}' requires evidence`
            }
          });
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
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'All mandatory checklist items must be provided for completion'
            }
          });
        }

        // Check if all failed items have comments
        for (const entry of entries) {
          if (entry.outcome === 'fail' && (!entry.comment || entry.comment.trim() === '')) {
            return reply.code(400).send({
              error: {
                code: 'VALIDATION_ERROR',
                message: `Failed checklist item '${entry.itemCode}' must have a comment for completion`
              }
            });
          }
        }

        // Check if all evidence-required items have evidence
        for (const entry of entries) {
          const seededItem = SEDED_CHECKLIST_ITEMS.find(item => item.itemCode === entry.itemCode);
          if (seededItem && seededItem.requiresEvidence && (!entry.evidenceRefs || entry.evidenceRefs.length === 0)) {
            return reply.code(400).send({
              error: {
                code: 'VALIDATION_ERROR',
                message: `Checklist item '${entry.itemCode}' requires evidence for completion`
              }
            });
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

      // Return success response
      return reply.code(200).send({
        data: {
          reviewId: updatedReview.id,
          status: updatedReview.status
        }
      });
    }
  );
};

export { registerShariahReviewRoutes };
