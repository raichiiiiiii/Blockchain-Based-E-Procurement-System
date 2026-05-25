import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { CreateMemberOrgInput } from '../application/create-member-organization.js';
import { createMemberOrganization } from '../application/create-member-organization.js';
import type { MemberOrganizationRepository, PersistedMemberOrganizationDraft } from '../application/member-organization-repository.js';
import { isMemberOrganizationStatus } from '../domain/member-organization.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import { recordAccessAuditEvent } from '../../shared/application/record-access-audit-event.js';
import { getRequestActorContext } from '../../auth/api/request-actor-context.js';

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
  accessAuditEventRepository?: AccessAuditEventRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
}

function toMemberOrganizationResponse(organization: PersistedMemberOrganizationDraft) {
  return {
    id: organization.id,
    registrationNumber: organization.registrationNumber,
    legalName: organization.legalName,
    displayName: organization.displayName,
    organizationType: organization.organizationType,
    businessType: organization.businessType,
    status: organization.status,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt
  };
}

function hasAdministratorRole(actorRoles: readonly string[] | undefined): boolean {
  return actorRoles?.some(role => role === 'administrator' || role === 'admin') ?? false;
}

async function recordMembershipAccessEvent(
  repository: AccessAuditEventRepository | undefined,
  request: FastifyRequest,
  input: {
    actorUserId: string;
    action: string;
    targetId: string;
    outcome: 'success' | 'forbidden' | 'validationError' | 'notFound';
    reason?: string;
    route: string;
    method: string;
  }
) {
  await recordAccessAuditEvent(repository, {
    requestId: request.id,
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: 'memberOrganization',
    targetId: input.targetId,
    outcome: input.outcome,
    reason: input.reason,
    module: 'membership',
    route: input.route,
    method: input.method
  });
}

// Update the route plugin type/signature so it accepts the typed options
const registerMembershipRoutes: FastifyPluginAsync<MembershipRoutesOptions> = async (fastify, options) => {
  async function requireAdministrator(
    request: FastifyRequest,
    reply: FastifyReply,
    auditContext: {
      action: string;
      targetId: string;
      route: string;
      method: string;
    }
  ): Promise<boolean> {
    if (options.authenticatedPreHandler) {
      await options.authenticatedPreHandler(request, reply);
      if (reply.sent) {
        return false;
      }
    }

    const actorRoles = request.actorContext?.authorizationContext.roles;
    if (hasAdministratorRole(actorRoles)) {
      return true;
    }

    const actorContext = getRequestActorContext(request);
    const actorId = actorContext.actorUserId || request.actorContext?.userId || 'unknown';

    await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
      actorUserId: actorId,
      action: auditContext.action,
      targetId: auditContext.targetId,
      outcome: 'forbidden',
      reason: 'administrator_required',
      route: auditContext.route,
      method: auditContext.method
    });

    reply.code(403).send({
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator access required'
      }
    });

    return false;
  }

  fastify.get(
    '/member-organizations',
    {
      preHandler: async (request, reply) => {
        await requireAdministrator(request, reply, {
          action: 'listMemberOrganizations',
          targetId: 'all',
          route: '/api/v1/member-organizations',
          method: 'GET'
        });
      }
    },
    async (_request, reply) => {
      const organizations = await options.repository.findAll();

      return reply.code(200).send({
        data: {
          items: organizations.map(toMemberOrganizationResponse)
        }
      });
    }
  );

  fastify.get<{ Params: { organizationId: string } }>(
    '/member-organizations/:organizationId',
    {
      preHandler: async (request, reply) => {
        await requireAdministrator(request, reply, {
          action: 'getMemberOrganization',
          targetId: request.params.organizationId,
          route: '/api/v1/member-organizations/:organizationId',
          method: 'GET'
        });
      }
    },
    async (request, reply) => {
      const organization = await options.repository.findById(request.params.organizationId);
      const actorContext = getRequestActorContext(request);
      const actorId = actorContext.actorUserId || request.actorContext?.userId || 'unknown';

      if (!organization) {
        await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
          actorUserId: actorId,
          action: 'getMemberOrganization',
          targetId: request.params.organizationId,
          outcome: 'notFound',
          reason: 'member_organization_not_found',
          route: '/api/v1/member-organizations/:organizationId',
          method: 'GET'
        });

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Member organization not found'
          }
        });
      }

      await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
        actorUserId: actorId,
        action: 'getMemberOrganization',
        targetId: organization.id,
        outcome: 'success',
        route: '/api/v1/member-organizations/:organizationId',
        method: 'GET'
      });

      return reply.code(200).send({
        data: toMemberOrganizationResponse(organization)
      });
    }
  );

  fastify.patch<{ Params: { organizationId: string }; Body: { status: string } }>(
    '/member-organizations/:organizationId/status',
    {
      preHandler: async (request, reply) => {
        await requireAdministrator(request, reply, {
          action: 'updateMemberOrganizationStatus',
          targetId: request.params.organizationId,
          route: '/api/v1/member-organizations/:organizationId/status',
          method: 'PATCH'
        });
      },
      schema: {
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const actorContext = getRequestActorContext(request);
      const actorId = actorContext.actorUserId || request.actorContext?.userId || 'unknown';

      if (!isMemberOrganizationStatus(request.body.status)) {
        await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
          actorUserId: actorId,
          action: 'updateMemberOrganizationStatus',
          targetId: request.params.organizationId,
          outcome: 'validationError',
          reason: 'invalid_status',
          route: '/api/v1/member-organizations/:organizationId/status',
          method: 'PATCH'
        });

        return reply.code(400).send(createApplicationValidationError('Invalid organization status', [
          {
            path: 'status',
            message: 'Status must be one of: pendingReview, active, inactive, suspended, deleted'
          }
        ]));
      }

      const organization = await options.repository.updateStatus(request.params.organizationId, request.body.status);

      if (!organization) {
        await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
          actorUserId: actorId,
          action: 'updateMemberOrganizationStatus',
          targetId: request.params.organizationId,
          outcome: 'notFound',
          reason: 'member_organization_not_found',
          route: '/api/v1/member-organizations/:organizationId/status',
          method: 'PATCH'
        });

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Member organization not found'
          }
        });
      }

      await recordMembershipAccessEvent(options.accessAuditEventRepository, request, {
        actorUserId: actorId,
        action: 'updateMemberOrganizationStatus',
        targetId: organization.id,
        outcome: 'success',
        route: '/api/v1/member-organizations/:organizationId/status',
        method: 'PATCH'
      });

      return reply.code(200).send({
        data: toMemberOrganizationResponse(organization)
      });
    }
  );

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
      // Extract actor context using the new helper
      const actorContext = getRequestActorContext(request);
      const actorId = actorContext.actorUserId || request.actorContext?.userId || 'unknown';

      const result = await createMemberOrganization(request.body, options.repository);

      // Handle invalid input
      if (result.status === 'invalidInput') {
        const errorResponse = createApplicationValidationError('Invalid input', result.issues);
        
        // Record validation error audit event
        await recordAccessAuditEvent(options.accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createMemberOrganization',
          targetType: 'memberOrganization',
          targetId: 'unknown',
          outcome: 'validationError',
          reason: 'invalid_input',
          module: 'membership',
          route: '/api/v1/member-organizations',
          method: 'POST'
        });
        
        return reply.code(400).send(errorResponse);
      }

      // Handle duplicate registration number
      if (result.status === 'duplicate') {
        // Record conflict audit event
        await recordAccessAuditEvent(options.accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createMemberOrganization',
          targetType: 'memberOrganization',
          targetId: 'unknown',
          outcome: 'conflict',
          reason: 'duplicate_registration',
          module: 'membership',
          route: '/api/v1/member-organizations',
          method: 'POST'
        });
        
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'A member organization with this registration number already exists'
          }
        });
      }

      // Handle draft prepared
      if (result.status === 'draftPrepared') {
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
        
        // Record success audit event
        await recordAccessAuditEvent(options.accessAuditEventRepository, {
          requestId: request.id,
          actorUserId: actorId,
          action: 'createMemberOrganization',
          targetType: 'memberOrganization',
          targetId: result.organization.id,
          outcome: 'success',
          module: 'membership',
          route: '/api/v1/member-organizations',
          method: 'POST'
        });

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
