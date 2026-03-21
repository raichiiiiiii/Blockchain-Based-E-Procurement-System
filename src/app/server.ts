import fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { registerMembershipRoutes } from '../modules/membership/api/routes.js';
import { InMemoryMemberOrganizationRepository } from '../modules/membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganizationRepository } from '../modules/membership/application/member-organization-repository.js';
import type { MemberOrgCreateAuditEvent } from '../modules/membership/api/routes.js';
import { registerAccessControlRoutes } from '../modules/access-control/api/routes.js';
import { InMemoryRoleRepository } from '../modules/access-control/infrastructure/in-memory-role-repository.js';
import type { RoleRepository } from '../modules/access-control/application/role-repository.js';
import type { RoleCreateAuditEvent } from '../modules/access-control/api/routes.js';

// Factory function for creating testable servers
export function createTestableServer(options?: {
  audit?: (event: MemberOrgCreateAuditEvent) => void;
  memberRepository?: MemberOrganizationRepository;
  roleRepository?: RoleRepository;
  roleAudit?: (event: RoleCreateAuditEvent) => void;
}) {
  const server = fastify();
  
  // Use provided dependencies or defaults
  const memberOrganizationRepository = options?.memberRepository ?? new InMemoryMemberOrganizationRepository();
  const roleRepository = options?.roleRepository ?? new InMemoryRoleRepository();
  const auditCallback = options?.audit ?? ((event: MemberOrgCreateAuditEvent) => {
    console.info('AUDIT EVENT:', JSON.stringify(event));
  });
  const roleAuditCallback = options?.roleAudit ?? ((event: RoleCreateAuditEvent) => {
    console.info('ROLE AUDIT EVENT:', JSON.stringify(event));
  });

  // Register membership routes
  server.register(registerMembershipRoutes, { 
    prefix: '/api/v1',
    repository: memberOrganizationRepository,
    audit: auditCallback
  });

  // Register access-control routes
  server.register(registerAccessControlRoutes, {
    prefix: '/api/v1',
    repository: roleRepository,
    audit: roleAuditCallback
  });

  return server;
}

// Existing singleton server for normal runtime
const server = createTestableServer();

const PORT = Number(process.env.PORT ?? 3000);

const start = async () => {
  try {
    await server.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on port ${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export { server, start };

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start();
}
