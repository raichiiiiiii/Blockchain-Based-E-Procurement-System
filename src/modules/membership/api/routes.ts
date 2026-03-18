import type { FastifyPluginAsync } from 'fastify';
import type { CreateMemberOrgInput } from '../application/create-member-organization.js';
import { createMemberOrganization } from '../application/create-member-organization.js';
import type { MemberOrganizationRepository } from '../application/member-organization-repository.js';

// Introduce a typed plugin options interface for the membership routes
interface MembershipRoutesOptions {
  repository: MemberOrganizationRepository;
}

// Update the route plugin type/signature so it accepts the typed options
const registerMembershipRoutes: FastifyPluginAsync<MembershipRoutesOptions> = async (fastify, options) => {
  // Access the repository through options.repository (not used yet)
  // Keeping the repository in options for future use
  
  fastify.post<{ Body: CreateMemberOrgInput }>(
    '/member-organizations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['registrationNumber', 'legalName', 'organizationType'],
          properties: {
            registrationNumber: { type: 'string' },
            legalName: { type: 'string' },
            displayName: { type: 'string' },
            organizationType: { type: 'string' },
            businessType: { type: 'string' },
            contactEmail: { type: 'string' },
            contactPhone: { type: 'string' },
            countryCode: { type: 'string' },
            notes: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const result = await createMemberOrganization(request.body, options.repository);
      
      // Handle invalid input
      if (result.status === 'invalidInput') {
        return reply.code(400).send({
          message: 'Invalid input',
          issues: result.issues
        });
      }
      
      // Handle draft prepared
      if (result.status === 'draftPrepared') {
        // Still not implemented - return the same placeholder response
        return reply.code(501).send({
          message: 'Membership organization creation endpoint registered but not yet implemented'
        });
      }
    }
  );
};

export { registerMembershipRoutes };
