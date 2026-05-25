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
import { createAuthenticatedRequestPreHandler } from '../modules/auth/api/authenticated-request.js';
import { InMemoryPlatformUserCredentialRepository } from '../modules/auth/infrastructure/in-memory-platform-user-credential-repository.js';
import { InMemoryAuthSessionRepository } from '../modules/auth/infrastructure/in-memory-auth-session-repository.js';
import type { PlatformUserCredentialRepository } from '../modules/auth/application/platform-user-credential-repository.js';
import type { AuthSessionRepository } from '../modules/auth/application/auth-session-repository.js';
import { registerTransactionHistoryRoutes } from '../modules/procurement/api/transaction-history.routes.js';
import { registerProcurementOrderRoutes } from '../modules/procurement/api/procurement-order.routes.js';
import type { ProcureToPayLifecycleEventRepository } from '../modules/procurement/application/procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import type { ProcurementOrderRepository } from '../modules/procurement/application/procurement-order-repository.js';
import { InMemoryProcurementOrderRepository } from '../modules/procurement/infrastructure/in-memory-procurement-order-repository.js';
import { registerKYCAMLRoutes } from '../modules/kyc-aml-onboarding/api/routes.js';
import { getOnboardingEligibility } from '../modules/kyc-aml-onboarding/application/get-onboarding-eligibility.js';
import type { OnboardingCaseRepository } from '../modules/kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.js';
import { InMemoryOnboardingCaseRepository } from '../modules/kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.js';
import { registerBlockchainAnchorRoutes } from '../modules/blockchain/api/blockchain-anchor.routes.js';
import type { BlockchainAnchorGateway } from '../modules/blockchain/application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../modules/blockchain/application/blockchain-anchor-metadata-repository.js';
import { InMemoryBlockchainAnchorGateway } from '../modules/blockchain/infrastructure/in-memory-blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../modules/blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { registerEscrowRoutes } from '../modules/escrow/api/escrow.routes.js';
import type { EscrowRepository } from '../modules/escrow/application/escrow-repository.js';
import { InMemoryEscrowRepository } from '../modules/escrow/infrastructure/in-memory-escrow-repository.js';
import { registerExportBundleRoutes } from '../modules/reporting/api/export-bundle.routes.js';
import type { ExportBundleRepository } from '../modules/reporting/application/export-bundle-repository.js';
import { InMemoryExportBundleRepository } from '../modules/reporting/infrastructure/in-memory-export-bundle-repository.js';
import { registerPlsRoutes } from '../modules/financing/api/pls.routes.js';
import type { PlsContractRepository } from '../modules/financing/application/pls-contract-repository.js';
import { InMemoryPlsContractRepository } from '../modules/financing/infrastructure/in-memory-pls-contract-repository.js';

const DEFAULT_DEV_PORT = 3100;

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
  procureToPayLifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  procurementOrderRepository?: ProcurementOrderRepository;
  onboardingCaseRepository?: OnboardingCaseRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  escrowRepository?: EscrowRepository;
  exportBundleRepository?: ExportBundleRepository;
  plsContractRepository?: PlsContractRepository;
  registerKycAmlRoutes?: boolean;
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
  const procureToPayLifecycleEventRepository = options?.procureToPayLifecycleEventRepository ?? new InMemoryProcureToPayLifecycleEventRepository();
  const procurementOrderRepository = options?.procurementOrderRepository ?? new InMemoryProcurementOrderRepository();
  const onboardingCaseRepository = options?.onboardingCaseRepository ?? new InMemoryOnboardingCaseRepository();
  const blockchainAnchorGateway = options?.blockchainAnchorGateway ?? new InMemoryBlockchainAnchorGateway();
  const blockchainAnchorMetadataRepository = options?.blockchainAnchorMetadataRepository ?? new InMemoryBlockchainAnchorMetadataRepository();
  const escrowRepository = options?.escrowRepository ?? new InMemoryEscrowRepository();
  const exportBundleRepository = options?.exportBundleRepository ?? new InMemoryExportBundleRepository();
  const plsContractRepository = options?.plsContractRepository ?? new InMemoryPlsContractRepository();
  const authenticatedPreHandler = createAuthenticatedRequestPreHandler(sessionRepository);

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
    accessAuditEventRepository,
    authenticatedPreHandler
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
    accessAuditEventRepository,
    authenticatedPreHandler
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

  if (options?.registerKycAmlRoutes) {
    server.register(registerKYCAMLRoutes, {
      prefix: '/api/v1',
      repository: onboardingCaseRepository,
      accessAuditEventRepository,
      authenticatedPreHandler
    });
  }

  // Register transaction-history routes
  server.register(registerTransactionHistoryRoutes, {
    prefix: '/api/v1',
    repository: procureToPayLifecycleEventRepository
  });

  server.register(registerProcurementOrderRoutes, {
    prefix: '/api/v1',
    orderRepository: procurementOrderRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    authenticatedPreHandler,
    eligibilityGateway: {
      async checkOrganizationEligibility(memberOrganizationId: string) {
        const result = await getOnboardingEligibility(memberOrganizationId, onboardingCaseRepository);
        return {
          memberOrganizationId: result.memberOrganizationId,
          eligibility: result.eligibility,
          reasonCodes: result.reasonCodes,
          rationale: result.rationale,
        };
      }
    }
  });

  // Register blockchain proof routes
  server.register(registerBlockchainAnchorRoutes, {
    prefix: '/api/v1',
    gateway: blockchainAnchorGateway,
    metadataRepository: blockchainAnchorMetadataRepository
  });

  // Register escrow first-slice routes
  server.register(registerEscrowRoutes, {
    prefix: '/api/v1',
    escrowRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    blockchainAnchorGateway,
    blockchainAnchorMetadataRepository,
    orderRepository: procurementOrderRepository,
    authenticatedPreHandler,
    eligibilityGateway: {
      async checkOrganizationEligibility(memberOrganizationId: string) {
        const result = await getOnboardingEligibility(memberOrganizationId, onboardingCaseRepository);
        return {
          memberOrganizationId: result.memberOrganizationId,
          eligibility: result.eligibility,
          reasonCodes: result.reasonCodes,
          rationale: result.rationale,
        };
      }
    }
  });

  server.register(registerExportBundleRoutes, {
    prefix: '/api/v1',
    repository: exportBundleRepository,
    accessAuditEventRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    blockchainAnchorMetadataRepository,
    authenticatedPreHandler
  });

  server.register(registerPlsRoutes, {
    prefix: '/api/v1',
    contractRepository: plsContractRepository,
    shariahReviewRepository,
    authenticatedPreHandler,
    eligibilityGateway: {
      async checkOrganizationEligibility(memberOrganizationId: string) {
        const result = await getOnboardingEligibility(memberOrganizationId, onboardingCaseRepository);
        return {
          memberOrganizationId: result.memberOrganizationId,
          eligibility: result.eligibility,
          reasonCodes: result.reasonCodes,
          rationale: result.rationale,
        };
      }
    }
  });

  return server;
}

// Existing singleton server for normal runtime
const server = createTestableServer({ registerKycAmlRoutes: true });

const PORT = Number(process.env.PORT ?? DEFAULT_DEV_PORT);

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
