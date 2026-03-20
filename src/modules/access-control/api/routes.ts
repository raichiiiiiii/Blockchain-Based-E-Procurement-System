import type { FastifyPluginAsync } from 'fastify';
import { createRole } from '../application/create-role.js';
import type { RoleRepository } from '../application/role-repository.js';
import type { Role } from '../domain/role.js';

// Define plugin options interface
interface AccessControlRoutesOptions {
  repository: RoleRepository;
}

// Create the Fastify plugin for access-control routes
const registerAccessControlRoutes: FastifyPluginAsync<AccessControlRoutesOptions> = async (fastify, options) => {
  const { repository } = options;

  // POST /api/v1/roles - Create a new role
  fastify.post<{ Body: Role }>(
    '/roles',
    {
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
      
      // Map result to HTTP responses
      if (result.status === 'created') {
        return reply.code(201).send({
          data: result.role
        });
      } else if (result.status === 'duplicate') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Role already exists'
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
};
export { registerAccessControlRoutes };
