import type { FastifyPluginAsync } from 'fastify';

interface CreateMemberOrgRequest {
  registrationNumber: string;
  legalName: string;
  displayName?: string;
  organizationType: string;
  businessType?: string;
  contactEmail?: string;
  contactPhone?: string;
  countryCode?: string;
  notes?: string;
}

const registerMembershipRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: CreateMemberOrgRequest }>(
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
    async (_request, reply) => {
      return reply.code(501).send({
        message: 'Membership organization creation endpoint registered but not yet implemented'
      });
    }
  );
};

export { registerMembershipRoutes };