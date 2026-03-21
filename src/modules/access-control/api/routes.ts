import type { FastifyPluginAsync } from 'fastify';
import { createRole } from '../application/create-role.js';
import { updateRole } from '../application/update-role.js';
import type { RoleRepository } from '../application/role-repository.js';
import type { Role } from '../domain/role.js';
import { createRoleAssignment } from '../application/create-role-assignment.js';
import type { RoleAssignmentRepository } from '../application/role-assignment-repository.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import type { MemberOrganizationRepository } from '../../membership/application/member-organization-repository.js';

// Define the audit event interface for role creation
export interface RoleCreateAuditEvent {
  action: 'createRole';
  targetType: 'role';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'conflict';
  actorId: string;
}

// Define the audit event interface for role updates
export interface RoleUpdateAuditEvent {
  action: 'updateRole';
  targetType: 'role';
  targetId: string;
  timestamp: string;
  requestId: string;
  outcome: 'success' | 'notFound';
  actorId: string;
}

// Union type for all role audit events
export type RoleAuditEvent = RoleCreateAuditEvent | RoleUpdateAuditEvent;

// Define plugin options interface
interface AccessControlRoutesOptions {
  repository: RoleRepository;
  assignmentRepository: RoleAssignmentRepository;
  memberOrganizationRepository: MemberOrganizationRepository;
  audit: (event: RoleAuditEvent) => void;
}

// Create the Fastify plugin for access-control routes
const registerAccessControlRoutes: FastifyPluginAsync<AccessControlRoutesOptions> = async (fastify, options) => {
  const { repository, assignmentRepository, memberOrganizationRepository, audit } = options;

  // POST /api/v1/roles - Create a new role
  fastify.post<{ Body: Role }>(
    '/roles',
    {
      preHandler: async (request, reply) => {
        // Check if the actor is an admin
        const actorRole = request.headers['x-actor-role'];
        if (actorRole !== 'admin') {
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
        // Check if the actor is an admin
        const actorRole = request.headers['x-actor-role'];
        if (actorRole !== 'admin') {
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
            return reply.code(400).send({
              error: {
                code: 'VALIDATION_ERROR',
                message: `Cannot update immutable field: ${field}`
              }
            });
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

      // Call the application service
      const result = await createRoleAssignment(assignment, assignmentRepository, repository, memberOrganizationRepository);

      // Map result to HTTP responses
      if (result.status === 'created') {
        return reply.code(201).send({
          data: result.assignment
        });
      } else if (result.status === 'duplicate') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Role assignment already exists'
          }
        });
      } else if (result.status === 'roleNotFound') {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid roleId: Role does not exist'
          }
        });
      } else if (result.status === 'organizationNotFound') {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid organizationId: Member organization does not exist'
          }
        });
      }
    }
  );
};
export { registerAccessControlRoutes };
