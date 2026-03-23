import type { FastifyPluginAsync } from 'fastify';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';
import { submitShariahReview, type SubmitShariahReviewInput } from '../application/submit-shariah-review.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { RoleAssignmentRepository } from '../../access-control/application/role-assignment-repository.js';

// Define plugin options interface
interface ShariahReviewRoutesOptions {
  repository: ShariahReviewRepository;
  roleAssignmentRepository: RoleAssignmentRepository;
}

// Create the Fastify plugin for shariah-review routes
const registerShariahReviewRoutes: FastifyPluginAsync<ShariahReviewRoutesOptions> = async (fastify, options) => {
  const { repository, roleAssignmentRepository } = options;

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
            summary: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      // Extract and validate x-actor-id header
      const rawActorId = request.headers['x-actor-id'];
      let actorId: string;

      if (typeof rawActorId === 'string') {
        actorId = rawActorId.trim();
      } else {
        actorId = ''; // Will be caught by the check below
      }

      if (!actorId) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing or invalid x-actor-id header'
          }
        });
      }

      // Check if user has active role assignment in the target organization
      const hasActiveAssignment = await roleAssignmentRepository.existsActiveAssignmentByUserAndOrganization(
        actorId,
        request.body.organizationId
      );

      if (!hasActiveAssignment) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User does not have required permissions for this organization'
          }
        });
      }

      // Construct the input for the application service
      const input: SubmitShariahReviewInput = {
        organizationId: request.body.organizationId,
        title: request.body.title,
        summary: request.body.summary,
        submittedByUserId: actorId
      };

      // Call the application service
      const result = await submitShariahReview(input, repository);

      // Map result to HTTP responses
      if (result.status === 'submitted') {
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
};

export { registerShariahReviewRoutes };
