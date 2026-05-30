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
import { registerShariahCertificateRoutes } from '../modules/shariah-certification/api/shariah-certificate.routes.js';
import type { ShariahCertificateRepository } from '../modules/shariah-certification/application/shariah-certificate-repository.js';
import { InMemoryShariahCertificateRepository } from '../modules/shariah-certification/infrastructure/in-memory-shariah-certificate-repository.js';
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
import { registerDeliveryEvidenceRoutes } from '../modules/procurement/api/delivery-evidence.routes.js';
import type { ProcureToPayLifecycleEventRepository } from '../modules/procurement/application/procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../modules/procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import type { ProcurementOrderRepository } from '../modules/procurement/application/procurement-order-repository.js';
import { InMemoryProcurementOrderRepository } from '../modules/procurement/infrastructure/in-memory-procurement-order-repository.js';
import type { DeliveryEvidenceRepository } from '../modules/procurement/application/delivery-evidence-repository.js';
import { InMemoryDeliveryEvidenceRepository } from '../modules/procurement/infrastructure/in-memory-delivery-evidence-repository.js';
import { registerKYCAMLRoutes } from '../modules/kyc-aml-onboarding/api/routes.js';
import { getOnboardingEligibility } from '../modules/kyc-aml-onboarding/application/get-onboarding-eligibility.js';
import type { OnboardingCaseRepository } from '../modules/kyc-aml-onboarding/application/create-onboarding-case.js';
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
import { LocalSoftwareKeyExportSigningAdapter } from '../modules/reporting/infrastructure/local-software-key-export-signing-adapter.js';
import { registerPlsRoutes } from '../modules/financing/api/pls.routes.js';
import type { PlsContractRepository } from '../modules/financing/application/pls-contract-repository.js';
import type { PlsContract } from '../modules/financing/domain/pls-contract.js';
import { InMemoryPlsContractRepository } from '../modules/financing/infrastructure/in-memory-pls-contract-repository.js';
import { registerSecurityAlertRoutes } from '../modules/security/api/security-alert.routes.js';
import { registerOpsStatusRoutes } from '../modules/ops/api/ops-status.routes.js';
import type { OperationalIncidentRepository } from '../modules/ops/application/operational-incident-repository.js';
import { InMemoryOperationalIncidentRepository } from '../modules/ops/infrastructure/in-memory-operational-incident-repository.js';
import { recordReadinessIncidents } from '../modules/ops/application/record-readiness-incidents.js';
import { buildRuntimeReadiness, type RuntimePersistenceMode, type RuntimeReadiness } from '../modules/ops/application/runtime-readiness.js';
import { registerExternalApiRoutes } from '../modules/integration/api/external-api.routes.js';
import { registerErpAccountingRoutes } from '../modules/integration/api/erp-accounting.routes.js';
import type { ExternalClientCredentialRepository } from '../modules/integration/application/external-client-credential-repository.js';
import type { ExternalIdempotencyRepository } from '../modules/integration/application/external-idempotency-repository.js';
import type { ExternalApiAuditRepository } from '../modules/integration/application/external-api-audit-repository.js';
import { InMemoryExternalClientCredentialRepository } from '../modules/integration/infrastructure/in-memory-external-client-credential-repository.js';
import { InMemoryExternalIdempotencyRepository } from '../modules/integration/infrastructure/in-memory-external-idempotency-repository.js';
import { InMemoryExternalApiAuditRepository } from '../modules/integration/infrastructure/in-memory-external-api-audit-repository.js';
import { LocalJsonErpAccountingAdapter } from '../modules/integration/infrastructure/local-json-erp-accounting-adapter.js';
import { registerDocumentRoutes } from '../modules/documents/api/document.routes.js';
import type { DocumentRepository } from '../modules/documents/application/document-repository.js';
import type { DocumentStoragePort } from '../modules/documents/application/document-storage-port.js';
import type { DocumentTextExtractionPort } from '../modules/documents/application/document-text-extraction-port.js';
import type { SignatureVerificationPort } from '../modules/documents/application/signature-verification-port.js';
import { InMemoryDocumentRepository } from '../modules/documents/infrastructure/in-memory-document-repository.js';
import { LocalDocumentStorageAdapter } from '../modules/documents/infrastructure/local-document-storage-adapter.js';
import { LocalDocumentTextExtractionAdapter } from '../modules/documents/infrastructure/local-document-text-extraction-adapter.js';
import { LocalSignatureMetadataAdapter } from '../modules/documents/infrastructure/local-signature-metadata-adapter.js';
import { registerContractRoutes } from '../modules/contracts/api/contract.routes.js';
import type { ProcurementContractRepository } from '../modules/contracts/application/contract-repository.js';
import { InMemoryProcurementContractRepository } from '../modules/contracts/infrastructure/in-memory-procurement-contract-repository.js';
import { registerPaymentRoutes } from '../modules/payments/api/payment.routes.js';
import type { PaymentInstructionRepository } from '../modules/payments/application/payment-instruction-repository.js';
import { InMemoryPaymentInstructionRepository } from '../modules/payments/infrastructure/in-memory-payment-instruction-repository.js';
import { LocalSandboxPaymentAdapter } from '../modules/payments/infrastructure/local-sandbox-payment-adapter.js';
import { ManualSettlementAdapter } from '../modules/payments/infrastructure/manual-settlement-adapter.js';
import { createPostgresPool, type PostgresExecutor } from '../infrastructure/database/postgres-client.js';
import { PostgresMemberOrganizationRepository } from '../modules/membership/infrastructure/postgres-member-organization-repository.js';
import { PostgresRoleRepository } from '../modules/access-control/infrastructure/postgres-role-repository.js';
import { PostgresRoleAssignmentRepository } from '../modules/access-control/infrastructure/postgres-role-assignment-repository.js';
import { PostgresAccessAuditEventRepository } from '../modules/shared/infrastructure/postgres-access-audit-event-repository.js';
import { PostgresPlatformUserCredentialRepository } from '../modules/auth/infrastructure/postgres-platform-user-credential-repository.js';
import { PostgresAuthSessionRepository } from '../modules/auth/infrastructure/postgres-auth-session-repository.js';
import { PostgresProcureToPayLifecycleEventRepository } from '../modules/procurement/infrastructure/postgres-procure-to-pay-lifecycle-event-repository.js';
import { PostgresProcurementOrderRepository } from '../modules/procurement/infrastructure/postgres-procurement-order-repository.js';
import { PostgresDeliveryEvidenceRepository } from '../modules/procurement/infrastructure/postgres-delivery-evidence-repository.js';
import { PostgresBlockchainAnchorMetadataRepository } from '../modules/blockchain/infrastructure/postgres-blockchain-anchor-metadata-repository.js';
import { PostgresEscrowRepository } from '../modules/escrow/infrastructure/postgres-escrow-repository.js';
import { PostgresOnboardingCaseRepository } from '../modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.js';
import { PostgresShariahReviewRepository } from '../modules/shariah-review/infrastructure/postgres-shariah-review-repository.js';
import { PostgresShariahCertificateRepository } from '../modules/shariah-certification/infrastructure/postgres-shariah-certificate-repository.js';
import { PostgresPlsContractRepository } from '../modules/financing/infrastructure/postgres-pls-contract-repository.js';
import { PostgresExportBundleRepository } from '../modules/reporting/infrastructure/postgres-export-bundle-repository.js';
import { PostgresOperationalIncidentRepository } from '../modules/ops/infrastructure/postgres-operational-incident-repository.js';

const DEFAULT_DEV_PORT = 3100;

type RuntimeServerDependencies = {
  postgresPool?: PostgresExecutor & { end(): Promise<void> };
  serverOptions: Parameters<typeof createTestableServer>[0];
};

// Factory function for creating testable servers
export function createTestableServer(options?: {
  audit?: (event: MemberOrgCreateAuditEvent) => void;
  memberRepository?: MemberOrganizationRepository;
  roleRepository?: RoleRepository;
  roleAudit?: (event: RoleAuditEvent) => void;
  roleAssignmentRepository?: RoleAssignmentRepository;
  shariahReviewRepository?: ShariahReviewRepository;
  shariahCertificateRepository?: ShariahCertificateRepository;
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
  deliveryEvidenceRepository?: DeliveryEvidenceRepository;
  onboardingCaseRepository?: OnboardingCaseRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  escrowRepository?: EscrowRepository;
  exportBundleRepository?: ExportBundleRepository;
  plsContractRepository?: PlsContractRepository;
  operationalIncidentRepository?: OperationalIncidentRepository;
  externalClientCredentialRepository?: ExternalClientCredentialRepository;
  externalIdempotencyRepository?: ExternalIdempotencyRepository;
  externalApiAuditRepository?: ExternalApiAuditRepository;
  externalApiSharedSecret?: string;
  documentRepository?: DocumentRepository;
  documentStorage?: DocumentStoragePort;
  documentTextExtractor?: DocumentTextExtractionPort;
  signatureVerifier?: SignatureVerificationPort;
  procurementContractRepository?: ProcurementContractRepository;
  paymentInstructionRepository?: PaymentInstructionRepository;
  registerKycAmlRoutes?: boolean;
  enforceBearerAuthForLegacyActorRoutes?: boolean;
  readiness?: () => Promise<RuntimeReadiness>;
}) {
  const server = fastify();
  const operationalIncidentRepository = options?.operationalIncidentRepository ?? new InMemoryOperationalIncidentRepository();
  const readinessProvider = options?.readiness ?? (async () => buildRuntimeReadiness({
    databaseMode: 'memory',
    databaseReachable: true,
  }));

  server.get('/health', async () => ({
    data: {
      status: 'ok',
    },
  }));

  server.get('/ready', async (_request, reply) => {
    const readiness = await readinessProvider();
    await recordReadinessIncidents(readiness, operationalIncidentRepository);

    return reply.code(readiness.status === 'ready' ? 200 : 503).send({ data: readiness });
  });

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
  const shariahReviewRepository = options?.shariahReviewRepository ?? new InMemoryShariahReviewRepository([
    {
      id: 'review-demo-approved',
      organizationId: 'demo-supplier-org',
      title: 'Restricted PLS seedbed review',
      summary: 'Review of the Amanah-Barakah procurement-linked PLS seedbed contract.',
      status: 'approved',
      submittedByUserId: 'demo-shariah-user',
      createdAt: '2026-05-20T10:00:00.000Z',
      decidedAt: '2026-05-21T10:00:00.000Z',
    },
  ]);
  const shariahCertificateRepository = options?.shariahCertificateRepository ?? new InMemoryShariahCertificateRepository([
    {
      certificateId: 'shariah-certificate-mudarabah-v1',
      issuedBy: 'MVP Shariah Governance Board',
      reviewerBoard: 'Restricted PLS Seedbed Review Panel',
      fatwaReference: 'FATWA-MVP-PLS-001',
      scope: 'restricted-pls-seedbed',
      contractTemplateVersion: 'mudarabah-procurement-v1',
      conditions: [
        'Simulation-only PLS distribution records',
        'No guaranteed profit or principal',
        'No external payment execution',
      ],
      issuedAt: '2026-05-20T00:00:00.000Z',
      expiresAt: '2027-05-20T00:00:00.000Z',
      status: 'active',
      certificateDocumentId: 'doc-shariah-certificate-demo',
      certificateHash: 'sha256:demo-shariah-certificate-hash',
      createdByUserId: 'demo-shariah-user',
      createdAt: '2026-05-20T00:00:00.000Z',
    },
  ]);
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
  const deliveryEvidenceRepository = options?.deliveryEvidenceRepository ?? new InMemoryDeliveryEvidenceRepository();
  const onboardingCaseRepository = options?.onboardingCaseRepository ?? new InMemoryOnboardingCaseRepository();
  const blockchainAnchorGateway = options?.blockchainAnchorGateway ?? new InMemoryBlockchainAnchorGateway();
  const blockchainAnchorMetadataRepository = options?.blockchainAnchorMetadataRepository ?? new InMemoryBlockchainAnchorMetadataRepository();
  const escrowRepository = options?.escrowRepository ?? new InMemoryEscrowRepository();
  const exportBundleRepository = options?.exportBundleRepository ?? new InMemoryExportBundleRepository();
  const plsContractRepository = options?.plsContractRepository ?? new InMemoryPlsContractRepository([
    {
      contractId: 'pls-demo-halal-packaging',
      procurementReference: 'demo-order-001',
      contractTemplateVersion: 'mudarabah-procurement-v1',
      buyerOrganizationId: 'demo-buyer-org',
      supplierOrganizationId: 'demo-supplier-org',
      financierOrganizationId: 'demo-financier-org',
      capitalAmount: '68000.00',
      currency: 'MYR',
      profitShare: {
        financierPercent: 60,
        ventureOperatorPercent: 40,
      },
      lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
      status: 'approvedForActivation',
      shariahApproval: {
        reviewId: 'review-demo-approved',
        status: 'approved',
        decidedAt: '2026-05-21T10:00:00.000Z',
      },
      createdAt: '2026-05-20T09:00:00.000Z',
      updatedAt: '2026-05-21T10:00:00.000Z',
    } satisfies PlsContract,
  ]);
  const externalClientCredentialRepository = options?.externalClientCredentialRepository ?? new InMemoryExternalClientCredentialRepository();
  const externalIdempotencyRepository = options?.externalIdempotencyRepository ?? new InMemoryExternalIdempotencyRepository();
  const externalApiAuditRepository = options?.externalApiAuditRepository ?? new InMemoryExternalApiAuditRepository();
  const documentRepository = options?.documentRepository ?? new InMemoryDocumentRepository();
  const documentStorage = options?.documentStorage ?? new LocalDocumentStorageAdapter();
  const documentTextExtractor = options?.documentTextExtractor ?? new LocalDocumentTextExtractionAdapter();
  const signatureVerifier = options?.signatureVerifier ?? new LocalSignatureMetadataAdapter();
  const procurementContractRepository = options?.procurementContractRepository ?? new InMemoryProcurementContractRepository();
  const paymentInstructionRepository = options?.paymentInstructionRepository ?? new InMemoryPaymentInstructionRepository();
  const authenticatedPreHandler = createAuthenticatedRequestPreHandler(sessionRepository);
  const legacyActorRouteAuthenticatedPreHandler = options?.enforceBearerAuthForLegacyActorRoutes
    ? authenticatedPreHandler
    : undefined;

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
    authenticatedPreHandler,
    requireAuthenticatedSession: options?.enforceBearerAuthForLegacyActorRoutes ?? false
  });

  // Register shariah-review routes with authentication for protected endpoints
  server.register(registerShariahReviewRoutes, {
    prefix: '/api/v1',
    repository: shariahReviewRepository,
    roleAssignmentRepository: roleAssignmentRepository,
    roleRepository: roleRepository,
    audit: shariahReviewAuditCallback,
    accessAuditEventRepository,
    authenticatedPreHandler: legacyActorRouteAuthenticatedPreHandler
  });

  // Register access-history routes with authentication for protected endpoints
  server.register(registerAccessHistoryRoutes, {
    prefix: '/api/v1',
    accessAuditEventRepository,
    authenticatedPreHandler: legacyActorRouteAuthenticatedPreHandler
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
    repository: procureToPayLifecycleEventRepository,
    authenticatedPreHandler: legacyActorRouteAuthenticatedPreHandler
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

  server.register(registerDeliveryEvidenceRoutes, {
    prefix: '/api/v1',
    orderRepository: procurementOrderRepository,
    evidenceRepository: deliveryEvidenceRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    blockchainAnchorGateway,
    blockchainAnchorMetadataRepository,
    authenticatedPreHandler,
  });

  // Register blockchain proof routes
  server.register(registerBlockchainAnchorRoutes, {
    prefix: '/api/v1',
    gateway: blockchainAnchorGateway,
    metadataRepository: blockchainAnchorMetadataRepository,
    authenticatedPreHandler: legacyActorRouteAuthenticatedPreHandler
  });

  // Register escrow first-slice routes
  server.register(registerEscrowRoutes, {
    prefix: '/api/v1',
    escrowRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    blockchainAnchorGateway,
    blockchainAnchorMetadataRepository,
    orderRepository: procurementOrderRepository,
    deliveryEvidenceRepository,
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
    signingPort: new LocalSoftwareKeyExportSigningAdapter(),
    authenticatedPreHandler
  });

  server.register(registerShariahCertificateRoutes, {
    prefix: '/api/v1',
    repository: shariahCertificateRepository,
    authenticatedPreHandler,
  });

  server.register(registerPlsRoutes, {
    prefix: '/api/v1',
    contractRepository: plsContractRepository,
    shariahReviewRepository,
    shariahCertificateRepository,
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

  server.register(registerSecurityAlertRoutes, {
    prefix: '/api/v1',
    accessAuditEventRepository,
    blockchainAnchorMetadataRepository,
    operationalIncidentRepository,
    authenticatedPreHandler,
  });

  server.register(registerOpsStatusRoutes, {
    prefix: '/api/v1',
    readiness: readinessProvider,
    operationalIncidentRepository,
    authenticatedPreHandler,
  });

  server.register(registerExternalApiRoutes, {
    prefix: '/api/v1',
    clientRepository: externalClientCredentialRepository,
    idempotencyRepository: externalIdempotencyRepository,
    auditRepository: externalApiAuditRepository,
    orderRepository: procurementOrderRepository,
    evidenceRepository: deliveryEvidenceRepository,
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    blockchainAnchorGateway,
    blockchainAnchorMetadataRepository,
    sharedSecret: options?.externalApiSharedSecret ?? process.env.EXTERNAL_API_SHARED_SECRET,
  });

  server.register(registerErpAccountingRoutes, {
    prefix: '/api/v1',
    adapter: new LocalJsonErpAccountingAdapter(),
    orderRepository: procurementOrderRepository,
    paymentInstructionRepository,
    contractRepository: procurementContractRepository,
    authenticatedPreHandler,
  });

  server.register(registerDocumentRoutes, {
    prefix: '/api/v1',
    repository: documentRepository,
    storage: documentStorage,
    extractor: documentTextExtractor,
    signatureVerifier,
    authenticatedPreHandler,
  });

  server.register(registerContractRoutes, {
    prefix: '/api/v1',
    repository: procurementContractRepository,
    authenticatedPreHandler,
  });

  server.register(registerPaymentRoutes, {
    prefix: '/api/v1',
    repository: paymentInstructionRepository,
    escrowRepository,
    adapters: {
      localSandbox: new LocalSandboxPaymentAdapter(),
      manualSettlement: new ManualSettlementAdapter(),
    },
    lifecycleEventRepository: procureToPayLifecycleEventRepository,
    authenticatedPreHandler,
  });

  return server;
}

// Existing singleton server for normal runtime
function loadRuntimePersistenceMode(env: NodeJS.ProcessEnv = process.env): RuntimePersistenceMode {
  return env.PERSISTENCE_ADAPTER === 'postgres' ? 'postgres' : 'memory';
}

function createRuntimeServerDependencies(
  mode: RuntimePersistenceMode = loadRuntimePersistenceMode(),
): RuntimeServerDependencies {
  if (mode !== 'postgres') {
    return {
      serverOptions: {
        registerKycAmlRoutes: true,
        enforceBearerAuthForLegacyActorRoutes: true,
        readiness: async () => buildRuntimeReadiness({
          databaseMode: 'memory',
          databaseReachable: true,
        }),
      },
    };
  }

  const postgresPool = createPostgresPool();
  const readiness = async (): Promise<RuntimeReadiness> => {
    try {
      await postgresPool.query('SELECT 1');
      return buildRuntimeReadiness({
        databaseMode: 'postgres',
        databaseReachable: true,
      });
    } catch {
      return buildRuntimeReadiness({
        databaseMode: 'postgres',
        databaseReachable: false,
      });
    }
  };

  return {
    postgresPool,
    serverOptions: {
      registerKycAmlRoutes: true,
      enforceBearerAuthForLegacyActorRoutes: true,
      readiness,
      memberRepository: new PostgresMemberOrganizationRepository(postgresPool),
      roleRepository: new PostgresRoleRepository(postgresPool),
      roleAssignmentRepository: new PostgresRoleAssignmentRepository(postgresPool),
      accessAuditEventRepository: new PostgresAccessAuditEventRepository(postgresPool),
      credentialRepository: new PostgresPlatformUserCredentialRepository(postgresPool),
      sessionRepository: new PostgresAuthSessionRepository(postgresPool),
      procureToPayLifecycleEventRepository: new PostgresProcureToPayLifecycleEventRepository(postgresPool),
      procurementOrderRepository: new PostgresProcurementOrderRepository(postgresPool),
      deliveryEvidenceRepository: new PostgresDeliveryEvidenceRepository(postgresPool),
      onboardingCaseRepository: new PostgresOnboardingCaseRepository(postgresPool),
      shariahReviewRepository: new PostgresShariahReviewRepository(postgresPool),
      shariahCertificateRepository: new PostgresShariahCertificateRepository(postgresPool),
      blockchainAnchorMetadataRepository: new PostgresBlockchainAnchorMetadataRepository(postgresPool),
      escrowRepository: new PostgresEscrowRepository(postgresPool),
      plsContractRepository: new PostgresPlsContractRepository(postgresPool),
      exportBundleRepository: new PostgresExportBundleRepository(postgresPool),
      operationalIncidentRepository: new PostgresOperationalIncidentRepository(postgresPool),
    },
  };
}

const runtimeDependencies = createRuntimeServerDependencies();
const server = createTestableServer(runtimeDependencies.serverOptions);

if (runtimeDependencies.postgresPool) {
  server.addHook('onClose', async () => {
    await runtimeDependencies.postgresPool?.end();
  });
}

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
