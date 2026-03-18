import type { FastifyPluginAsync } from 'fastify';
import type { CreateMemberOrgInput } from '../application/create-member-organization.js';
import { createMemberOrganization } from '../application/create-member-organization.js';

const registerMembershipRoutes: FastifyPluginAsync = async (fastify) => {
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
      const result = await createMemberOrganization(request.body);
      
      // Check if the operation is not implemented
      if (result.status === 'notImplemented') {
        return reply.code(501).send({
          message: 'Membership organization creation endpoint registered but not yet implemented'
        });
      }
      
      // This shouldn't be reached with the current stub implementation
      return reply.code(501).send({
        message: 'Membership organization creation endpoint registered but not yet implemented'
      });
    }
  );
};

export { registerMembershipRoutes };
