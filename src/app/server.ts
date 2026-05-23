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
import type { ShariahReviewSubmitAuditEvent, ShariahReviewChecklistAuditEvent, ShariahReviewDecisionAuditEvent, ShariahReviewHistoryAuditEvent } from '../modules/shariah-review/api/routes.js';
import type { UserExistenceLookup } from '../modules/shared/application/user-existence-lookup.js';
import type { OrganizationMembershipLookup } from '../modules/shared/application/organization-membership-lookup.js';
import actorContextPlugin from './plugins/actor-context-plugin.js';
import { mapFastifyValidationError } from '../modules/shared/api/validation-error-helper.js';
import type { UserStatusLookup } from '../modules/shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../modules/shared/application/member-status-lookup.js';
import type { AccessAuditEventRepository } from '../modules/shared/application/access-audit-event-repository.js';
import { registerAccessHistoryRoutes } from '../modules/shared/api/access-history.routes.js';
import authRoutes from '../modules/auth/api/auth.routes.js';
import { InMemoryPlatformUserCredentialRepository } from '../modules/auth/infrastructure/in-memory-platform-user-credential-repository.js';
import { InMemoryAuthSessionRepository } from '../modules/auth/infrastructure/in-memory-auth-session-repository.js';
import type { PlatformUserCredentialRepository } from '../modules/auth/application/platform-user-credential-repository.js';
import type { AuthSessionRepository } from '../modules/auth/application/auth-session-repository.js';

// Factory function for creating testable servers
export function createTestableServer(options?: {
  audit?: (event: MemberOrgCreateAuditEvent) => void;
  memberRepository?: MemberOrganizationRepository;
  roleRepository?: RoleRepository;
  roleAudit?: (event: RoleAuditEvent) => void;
  roleAssignmentRepository?: RoleAssignmentRepository;
  shariahReviewRepository?: ShariahReviewRepository;
  shariahReviewAudit?: (event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent | ShariahReviewHistoryAuditEvent) => void;
  userExistenceLookup?: UserExistenceLookup;
  organizationMembershipLookup?: OrganizationMembershipLookup;
  userStatusLookup?: UserStatusLookup;
  memberStatusLookup?: MemberStatusLookup;
  accessAuditEventRepository?: AccessAuditEventRepository;
  credentialRepository?: PlatformUserCredentialRepository;
  sessionRepository?: AuthSessionRepository;
}) {
  const server = fastify();

  // Register the actor context plugin
  server.register(actorContextPlugin);

  // Add server-level validation error handler
  server.setErrorHandler((error, request, reply) => {
    // Handle Fastify validation errors
    if (error.validation) {
      const validationError = mapFastifyValidationError(error);
      return reply.status(400).send(validationError);
    }
    
    // For all other errors, send a generic 500 response
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal server error occurred'
      }
    });
  });

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
  const shariahReviewAuditCallback = options?.shariahReviewAudit ?? ((event: ShariahReviewSubmitAuditEvent | ShariahReviewChecklistAuditEvent | ShariahReviewDecisionAuditEvent | ShariahReviewHistoryAuditEvent) => {
    console.info('SHARIAH REVIEW AUDIT EVENT:', JSON.stringify(event));
  });
  const userExistenceLookup = options?.userExistenceLookup;
  const organizationMembershipLookup = options?.organizationMembershipLookup;
  const userStatusLookup = options?.userStatusLookup;
  const memberStatusLookup = options?.memberStatusLookup;
  const accessAuditEventRepository = options?.accessAuditEventRepository;
  const credentialRepository = options?.credentialRepository ?? new InMemoryPlatformUserCredentialRepository();
  const sessionRepository = options?.sessionRepository ?? new InMemoryAuthSessionRepository();

  // Register auth routes
  server.register(authRoutes, {
    prefix: '/api/v1',
    credentialRepository,
    sessionRepository
  });

  // Register membership routes with authentication for protected endpoints
  server.register(registerMembershipRoutes, {
    prefix: '/api/v1',
    repository: memberOrganizationRepository,
    audit: auditCallback,
    accessAuditEventRepository
  });

  // Register access-control routes with authentication for protected endpoints
  server.register(registerAccessControlRoutes, {
    prefix: '/api/v1',
    repository: roleRepository,
    assignmentRepository: roleAssignmentRepository,
    memberOrganizationRepository: memberOrganizationRepository,
    audit: roleAuditCallback,
    userExistenceLookup,
    organizationMembershipLookup,
    userStatusLookup,
    memberStatusLookup,
    accessAuditEventRepository
  });

  // Register shariah-review routes with authentication for protected endpoints
  server.register(registerShariahReviewRoutes, {
    prefix: '/api/v1',
    repository: shariahReviewRepository,
    roleAssignmentRepository: roleAssignmentRepository,
    roleRepository: roleRepository,
    audit: shariahReviewAuditCallback,
    accessAuditEventRepository
  });

  // Register access-history routes with authentication for protected endpoints
  server.register(registerAccessHistoryRoutes, {
    prefix: '/api/v1',
    accessAuditEventRepository
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
