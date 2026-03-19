import type { FastifyPluginAsync } from 'fastify';
import type { CreateMemberOrgInput } from '../application/create-member-organization.js';
import { createMemberOrganization } from '../application/create-member-organization.js';
import type { MemberOrganizationRepository } from '../application/member-organization-repository.js';

// Extend the plugin options interface to include audit callback
interface MembershipRoutesOptions {
  repository: MemberOrganizationRepository;
  audit: (event: any) => void;
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
        // Emit provisional audit event
        const auditEvent = {
          action: 'createMemberOrganization',
          targetType: 'memberOrganization',
          targetId: result.organization.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: request.headers['x-actor-id'] || 'unknown'
        };
        
        // Call the audit callback
        options.audit(auditEvent);
        
        // Return the created organization with proper API contract format
        return reply.code(201).send({
          data: {
            id: result.organization.id,
            registrationNumber: result.organization.registrationNumber,
            legalName: result.organization.legalName,
            displayName: result.organization.displayName,
            organizationType: result.organization.organizationType,
            businessType: result.organization.businessType,
            status: result.organization.status,
            createdAt: result.organization.createdAt,
            updatedAt: result.organization.updatedAt
          }
        });
      }
    }
  );
};

export { registerMembershipRoutes };
