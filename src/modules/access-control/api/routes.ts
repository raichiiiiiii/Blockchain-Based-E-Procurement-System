import type { FastifyPluginAsync } from 'fastify';
import { createRole } from '../application/create-role.js';
import { updateRole } from '../application/update-role.js';
import type { RoleRepository } from '../application/role-repository.js';
import type { Role } from '../domain/role.js';
import { createRoleAssignment } from '../application/create-role-assignment.js';
import { removeRoleAssignment } from '../application/remove-role-assignment.js';
import { changeRoleAssignment } from '../application/change-role-assignment.js';
import type { RoleAssignmentRepository } from '../application/role-assignment-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { MemberOrganizationRepository } from '../../membership/application/member-organization-repository.js';
import type { UserExistenceLookup } from '../../shared/application/user-existence-lookup.js';
import type { OrganizationMembershipLookup } from '../../shared/application/organization-membership-lookup.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';

// Define the audit event interface for role creation
export interface RoleCreateAuditEvent {
  action: 'createRole';
  targetType: 'role';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'conflict' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for role updates
export interface RoleUpdateAuditEvent {
  action: 'updateRole';
  targetType: 'role';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'notFound' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for role assignment creation
export interface RoleAssignmentCreateAuditEvent {
  action: 'createRoleAssignment';
  targetType: 'roleAssignment';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'conflict' | 'validationError' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for role assignment removal
export interface RoleAssignmentRemoveAuditEvent {
  action: 'removeRoleAssignment';
  targetType: 'roleAssignment';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Define the audit event interface for role assignment change
export interface RoleAssignmentChangeAuditEvent {
  action: 'changeRoleAssignment';
  targetType: 'roleAssignment';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'forbidden';
  actorId: string;
  reason?: string;
}

// Union type for all role audit events
export type RoleAuditEvent =
  | RoleCreateAuditEvent
  | RoleUpdateAuditEvent
  | RoleAssignmentCreateAuditEvent
  | RoleAssignmentRemoveAuditEvent
  | RoleAssignmentChangeAuditEvent;

// Define plugin options interface
interface AccessControlRoutesOptions {
  repository: RoleRepository;
  assignmentRepository: RoleAssignmentRepository;
  memberOrganizationRepository: MemberOrganizationRepository;
  audit: (event: RoleAuditEvent) => void;
  userExistenceLookup?: UserExistenceLookup;
  organizationMembershipLookup?: OrganizationMembershipLookup;
  userStatusLookup?: UserStatusLookup;
  memberStatusLookup?: MemberStatusLookup;
}

// Create the Fastify plugin for access-control routes
const registerAccessControlRoutes: FastifyPluginAsync<AccessControlRoutesOptions> = async (fastify, options) => {
  const { 
    repository, 
    assignmentRepository, 
    memberOrganizationRepository, 
    audit, 
    userExistenceLookup, 
    organizationMembershipLookup,
    userStatusLookup,
    memberStatusLookup
  } = options;

  // POST /api/v1/roles - Create a new role
  fastify.post<{ Body: Role }>(
    '/roles',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('admin')) {
          // Emit audit event for forbidden access
          const actorId = request.actorContext?.userId || 'unknown';
          const auditEvent: RoleCreateAuditEvent = {
            action: 'createRole',
            targetType: 'role',
            targetId: 'unknown',
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId,
            reason: 'admin_required'
          };
          audit(auditEvent);

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
      },
      schema: {
        body: {
          type: 'object',
          required: ['roleCode', 'displayName', 'scope', 'permissions', 'status', 'isSystemReserved'],
          properties: {
            roleCode: { type: 'string' },
            displayName: { type: 'string' },
            scope: { type: 'string', enum: ['organization'] },
            permissions: {
              type: 'array',
              items: { type: 'string' }
            },
            status: { type: 'string', enum: ['active', 'inactive'] },
            description: { type: 'string' },
            isSystemReserved: { type: 'boolean' }
          }
        }
      }
    },
    async (request, reply) => {
      // Call the application service directly with the request body
      const result = await createRole(request.body, repository);

      // Get actorId from trusted actor context
      const actorId = request.actorContext?.userId || 'unknown';

      // Map result to HTTP responses
      if (result.status === 'created') {
        // Emit audit event for successful creation
        const auditEvent: RoleCreateAuditEvent = {
          action: 'createRole',
          targetType: 'role',
          targetId: result.role.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(201).send({
          data: result.role
        });
      } else if (result.status === 'duplicate') {
        // Emit audit event for conflict
        const auditEvent: RoleCreateAuditEvent = {
          action: 'createRole',
          targetType: 'role',
          targetId: 'unknown', // No persisted target exists for conflict
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'conflict',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Role already exists'
          }
        });
      }
    }
  );

  // PATCH /api/v1/roles/{roleId} - Update an existing role
  fastify.patch<{ Params: { roleId: string }; Body: Partial<Role> }>(
    '/roles/:roleId',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('admin')) {
          // Emit audit event for forbidden access
          const actorId = request.actorContext?.userId || 'unknown';
          const auditEvent: RoleUpdateAuditEvent = {
            action: 'updateRole',
            targetType: 'role',
            targetId: request.params.roleId,
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId,
            reason: 'admin_required'
          };
          audit(auditEvent);

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
      },
      preValidation: async (request, reply) => {
        // Check for immutable fields in the request body before schema validation
        const immutableFields = ['roleCode', 'scope', 'isSystemReserved'];
        const requestBody = request.body as Record<string, unknown>;

        for (const field of immutableFields) {
          if (field in requestBody) {
            return reply.code(400).send(
              createApplicationValidationError(`Cannot update immutable field: ${field}`)
            );
          }
        }
      },
      schema: {
        params: {
          type: 'object',
          required: ['roleId'],
          properties: {
            roleId: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            displayName: { type: 'string' },
            description: { type: 'string' },
            permissions: {
              type: 'array',
              items: { type: 'string' }
            },
            status: { type: 'string', enum: ['active', 'inactive'] }
          }
        }
      }
    },
    async (request, reply) => {
      // Call the application service directly with the request params and body
      const result = await updateRole(request.params.roleId, request.body, repository);

      // Get actorId from trusted actor context
      const actorId = request.actorContext?.userId || 'unknown';

      // Map result to HTTP responses
      if (result.status === 'updated') {
        // Emit audit event for successful update
        const auditEvent: RoleUpdateAuditEvent = {
          action: 'updateRole',
          targetType: 'role',
          targetId: result.role.id,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(200).send({
          data: result.role
        });
      } else if (result.status === 'notFound') {
        // Emit audit event for not found
        const auditEvent: RoleUpdateAuditEvent = {
          action: 'updateRole',
          targetType: 'role',
          targetId: request.params.roleId,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'notFound',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Role not found'
          }
        });
      }
    }
  );

  // GET /api/v1/roles - List all roles
  fastify.get(
    '/roles',
    async (_request, reply) => {
      const roles = await repository.findAll();
      return reply.code(200).send({
        data: roles
      });
    }
  );

  // POST /api/v1/role-assignments - Create a new role assignment
  fastify.post<{ Body: { userId: string; organizationId: string; roleId: string } }>(
    '/role-assignments',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('admin')) {
          // Emit audit event for forbidden access
          const actorId = request.actorContext?.userId || 'unknown';
          const auditEvent: RoleAssignmentCreateAuditEvent = {
            action: 'createRoleAssignment',
            targetType: 'roleAssignment',
            targetId: 'unknown',
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId,
            reason: 'admin_required'
          };
          audit(auditEvent);

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
      },
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'organizationId', 'roleId'],
          properties: {
            userId: { type: 'string' },
            organizationId: { type: 'string' },
            roleId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      // Construct a RoleAssignment with status 'active'
      const assignment: RoleAssignment = {
        userId: request.body.userId,
        organizationId: request.body.organizationId,
        roleId: request.body.roleId,
        status: 'active'
      };

      // Prepare lookup dependencies if both are provided
      const lookups = userExistenceLookup && organizationMembershipLookup ? {
        userExistence: userExistenceLookup,
        organizationMembership: organizationMembershipLookup
      } : undefined;

      // Prepare protected access dependencies if both are provided
      const protectedAccess = userStatusLookup && memberStatusLookup && request.actorContext?.userId ? {
        actorUserId: request.actorContext.userId,
        userStatusLookup,
        memberStatusLookup
      } : undefined;

      // Call the application service
      const result = await createRoleAssignment(
        assignment, 
        assignmentRepository, 
        repository, 
        memberOrganizationRepository, 
        lookups,
        protectedAccess
      );

      // Get actorId from trusted actor context
      const actorId = request.actorContext?.userId || 'unknown';

      // Map result to HTTP responses
      if (result.status === 'created') {
        // Emit audit event for successful creation
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(201).send({
          data: result.assignment
        });
      } else if (result.status === 'duplicate') {
        // Emit audit event for conflict
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'conflict',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Role assignment already exists'
          }
        });
      } else if (result.status === 'roleNotFound') {
        // Emit audit event for validation error
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(400).send(
          createApplicationValidationError('Invalid roleId: Role does not exist')
        );
      } else if (result.status === 'organizationNotFound') {
        // Emit audit event for validation error
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(400).send(
          createApplicationValidationError('Invalid organizationId: Member organization does not exist')
        );
      } else if (result.status === 'userNotFound') {
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(400).send(
          createApplicationValidationError('Invalid userId: User does not exist')
        );
      } else if (result.status === 'userNotMember') {
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'validationError',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(400).send(
          createApplicationValidationError('Invalid userId: User is not a member of the specified organization')
        );
      } else if (result.status === 'accessDenied') {
        // Emit audit event for forbidden access due to deactivation
        const auditEvent: RoleAssignmentCreateAuditEvent = {
          action: 'createRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${assignment.userId}:${assignment.organizationId}:${assignment.roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: result.reason
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: result.message
          }
        });
      }
    }
  );

  // DELETE /api/v1/role-assignments - Remove (revoke) a role assignment
  fastify.delete(
    '/role-assignments',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('admin')) {
          // Emit audit event for forbidden access
          const actorId = request.actorContext?.userId || 'unknown';
          const auditEvent: RoleAssignmentRemoveAuditEvent = {
            action: 'removeRoleAssignment',
            targetType: 'roleAssignment',
            targetId: 'unknown',
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId,
            reason: 'admin_required'
          };
          audit(auditEvent);

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
      },
      schema: {
        querystring: {
          type: 'object',
          required: ['userId', 'organizationId', 'roleId'],
          properties: {
            userId: { type: 'string' },
            organizationId: { type: 'string' },
            roleId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { userId, organizationId, roleId } = request.query as {
        userId: string;
        organizationId: string;
        roleId: string;
      };

      // Prepare protected access dependencies if both are provided
      const protectedAccess = userStatusLookup && memberStatusLookup && request.actorContext?.userId ? {
        actorUserId: request.actorContext.userId,
        userStatusLookup,
        memberStatusLookup
      } : undefined;

      // Call the remove role assignment service
      const result = await removeRoleAssignment(userId, organizationId, roleId, assignmentRepository, protectedAccess);

      // Get actorId from trusted actor context
      const actorId = request.actorContext?.userId || 'unknown';

      // Map result to HTTP responses
      if (result.status === 'removed' || result.status === 'alreadyRevoked') {
        // Emit audit event for successful removal
        const auditEvent: RoleAssignmentRemoveAuditEvent = {
          action: 'removeRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${userId}:${organizationId}:${roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(200).send({
          data: result.assignment
        });
      } else if (result.status === 'notFound') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Role assignment not found'
          }
        });
      } else if (result.status === 'accessDenied') {
        // Emit audit event for forbidden access due to deactivation
        const auditEvent: RoleAssignmentRemoveAuditEvent = {
          action: 'removeRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${userId}:${organizationId}:${roleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: result.reason
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: result.message
          }
        });
      }
    }
  );

  // PATCH /api/v1/role-assignments/change - Change a role assignment
  fastify.patch<{ Body: { userId: string; organizationId: string; currentRoleId: string; newRoleId: string } }>(
    '/role-assignments/change',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin using actorContext
        const actorRoles = request.actorContext?.authorizationContext.roles;
        if (!actorRoles || !actorRoles.includes('admin')) {
          // Emit audit event for forbidden access
          const actorId = request.actorContext?.userId || 'unknown';
          const auditEvent: RoleAssignmentChangeAuditEvent = {
            action: 'changeRoleAssignment',
            targetType: 'roleAssignment',
            targetId: 'unknown',
            timestamp: new Date().toISOString(),
            requestId: request.id,
            outcome: 'forbidden',
            actorId,
            reason: 'admin_required'
          };
          audit(auditEvent);

          return reply.code(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'Admin access required'
            }
          });
        }
      },
      schema: {
        body: {
          type: 'object',
          required: ['userId', 'organizationId', 'currentRoleId', 'newRoleId'],
          properties: {
            userId: { type: 'string' },
            organizationId: { type: 'string' },
            currentRoleId: { type: 'string' },
            newRoleId: { type: 'string' }
          }
        }
      }
    },
    async (request, reply) => {
      const { userId, organizationId, currentRoleId, newRoleId } = request.body;

      // Prepare protected access dependencies if both are provided
      const protectedAccess = userStatusLookup && memberStatusLookup && request.actorContext?.userId ? {
        actorUserId: request.actorContext.userId,
        userStatusLookup,
        memberStatusLookup
      } : undefined;

      // Call the change role assignment service
      const result = await changeRoleAssignment(
        userId,
        organizationId,
        currentRoleId,
        newRoleId,
        assignmentRepository,
        repository,
        protectedAccess
      );

      // Get actorId from trusted actor context
      const actorId = request.actorContext?.userId || 'unknown';

      // Map result to HTTP responses
      if (result.status === 'changed') {
        // Emit audit event for successful change
        const auditEvent: RoleAssignmentChangeAuditEvent = {
          action: 'changeRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${userId}:${organizationId}:${newRoleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'success',
          actorId: actorId
        };

        audit(auditEvent);

        return reply.code(200).send({
          data: {
            oldAssignment: result.oldAssignment,
            newAssignment: result.newAssignment
          }
        });
      } else if (result.status === 'notFound') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Role assignment not found'
          }
        });
      } else if (result.status === 'roleNotFound') {
        return reply.code(400).send(
          createApplicationValidationError('Invalid newRoleId: Role does not exist')
        );
      } else if (result.status === 'duplicate') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Target role assignment already exists'
          }
        });
      } else if (result.status === 'sameRole') {
        return reply.code(400).send(
          createApplicationValidationError('Current and new role IDs must be different')
        );
      } else if (result.status === 'accessDenied') {
        // Emit audit event for forbidden access due to deactivation
        const auditEvent: RoleAssignmentChangeAuditEvent = {
          action: 'changeRoleAssignment',
          targetType: 'roleAssignment',
          targetId: `${userId}:${organizationId}:${newRoleId}`,
          timestamp: new Date().toISOString(),
          requestId: request.id,
          outcome: 'forbidden',
          actorId: actorId,
          reason: result.reason
        };

        audit(auditEvent);

        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: result.message
          }
        });
      }
    }
  );
};
export { registerAccessControlRoutes };
