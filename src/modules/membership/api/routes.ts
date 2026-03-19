import type { FastifyPluginAsync } from 'fastify';
import type { CreateMemberOrgInput } from '../application/create-member-organization.js';
import { createMemberOrganization } from '../application/create-member-organization.js';
import type { MemberOrganizationRepository } from '../application/member-organization-repository.js';

// Define the audit event interface for member organization creation
export interface MemberOrgCreateAuditEvent {
  action: 'createMemberOrganization';
  targetType: 'memberOrganization';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success';
  actorId: string;
}

// Extend the plugin options interface to include typed audit callback
interface MembershipRoutesOptions {
  repository: MemberOrganizationRepository;
  audit: (event: MemberOrgCreateAuditEvent) => void;
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
        // Normalize x-actor-id header to always be a string
        const rawActorId = request.headers['x-actor-id'];
        let actorId: string;
        
        if (Array.isArray(rawActorId)) {
          // Take the first value if it's an array
          actorId = rawActorId[0] || 'unknown';
        } else if (typeof rawActorId === 'string') {
          // Use the string value
          actorId = rawActorId;
        } else {
          // Default to 'unknown' for undefined/null cases
          actorId = 'unknown';
        }
        
        // Emit provisional audit event with typed interface
        const auditEvent: MemberOrgCreateAuditEvent = {
          action: 'createMemberOrganization',
          targetType: 'memberOrganization',
          targetId: result.organization.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
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
