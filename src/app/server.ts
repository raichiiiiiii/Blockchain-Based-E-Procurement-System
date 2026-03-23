import fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { registerMembershipRoutes } from '../modules/membership/api/routes.js';
import { InMemoryMemberOrganizationRepository } from '../modules/membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganizationRepository } from '../modules/membership/application/member-organization-repository.js';
import type { MemberOrgCreateAuditEvent } from '../modules/membership/api/routes.js';
import { registerAccessControlRoutes } from '../modules/access-control/api/routes.js';
import { InMemoryRoleRepository } from '../modules/access-control/infrastructure/in-memory-role-repository.js';
import type { RoleRepository } from '../modules/access-control/application/role-repository.js';
import type { RoleAuditEvent } from '../modules/access-control/api/routes.js';
import { InMemoryRoleAssignmentRepository } from '../modules/access-control/infrastructure/in-memory-role-assignment-repository.js';
import type { RoleAssignmentRepository } from '../modules/access-control/application/role-assignment-repository.js';
import { registerShariahReviewRoutes } from '../modules/shariah-review/api/routes.js';
import { InMemoryShariahReviewRepository } from '../modules/shariah-review/infrastructure/in-memory-shariah-review-repository.js';
import type { ShariahReviewRepository } from '../modules/shariah-review/application/shariah-review-repository.js';

// Factory function for creating testable servers
export function createTestableServer(options?: {
  audit?: (event: MemberOrgCreateAuditEvent) => void;
  memberRepository?: MemberOrganizationRepository;
  roleRepository?: RoleRepository;
  roleAudit?: (event: RoleAuditEvent) => void;
  roleAssignmentRepository?: RoleAssignmentRepository;
  shariahReviewRepository?: ShariahReviewRepository;
}) {
  const server = fastify();

  // Use provided dependencies or defaults
  const memberOrganizationRepository = options?.memberRepository ?? new InMemoryMemberOrganizationRepository();
  const roleRepository = options?.roleRepository ?? new InMemoryRoleRepository();
  const roleAssignmentRepository = options?.roleAssignmentRepository ?? new InMemoryRoleAssignmentRepository();
  const shariahReviewRepository = options?.shariahReviewRepository ?? new InMemoryShariahReviewRepository();
  const auditCallback = options?.audit ?? ((event: MemberOrgCreateAuditEvent) => {
    console.info('AUDIT EVENT:', JSON.stringify(event));
  });
  const roleAuditCallback = options?.roleAudit ?? ((event: RoleAuditEvent) => {
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
    assignmentRepository: roleAssignmentRepository,
    memberOrganizationRepository: memberOrganizationRepository,
    audit: roleAuditCallback
  });

  // Register shariah-review routes
  server.register(registerShariahReviewRoutes, {
    prefix: '/api/v1',
    repository: shariahReviewRepository,
    roleAssignmentRepository: roleAssignmentRepository
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
