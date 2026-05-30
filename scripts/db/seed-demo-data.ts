import { createHash } from 'node:crypto';
import { createPostgresPool } from '../../src/infrastructure/database/postgres-client.js';
import { loadDatabaseConfig } from '../../src/infrastructure/database/database-config.js';

const DEMO_PASSWORD = 'demo-password';

type DemoAccount = {
  userId: string;
  username: string;
  displayName: string;
  roleCode: string;
  organizationId: string;
};

const demoAccounts: DemoAccount[] = [
  {
    userId: 'demo-admin-user',
    username: 'admin.demo',
    displayName: 'Demo Administrator',
    roleCode: 'administrator',
    organizationId: 'demo-platform-org',
  },
  {
    userId: 'demo-auditor-user',
    username: 'auditor.demo',
    displayName: 'Demo Auditor',
    roleCode: 'auditor',
    organizationId: 'demo-audit-org',
  },
  {
    userId: 'demo-regulator-user',
    username: 'regulator.demo',
    displayName: 'Demo Regulator',
    roleCode: 'regulator',
    organizationId: 'demo-regulator-org',
  },
  {
    userId: 'demo-compliance-user',
    username: 'compliance.demo',
    displayName: 'Demo Compliance Reviewer',
    roleCode: 'complianceReviewer',
    organizationId: 'demo-compliance-org',
  },
  {
    userId: 'demo-shariah-user',
    username: 'shariah.demo',
    displayName: 'Demo Shariah Reviewer',
    roleCode: 'shariahReviewer',
    organizationId: 'demo-shariah-org',
  },
  {
    userId: 'demo-buyer-user',
    username: 'buyer.demo',
    displayName: 'Demo Buyer',
    roleCode: 'buyer',
    organizationId: 'demo-buyer-org',
  },
  {
    userId: 'demo-supplier-user',
    username: 'supplier.demo',
    displayName: 'Demo Supplier',
    roleCode: 'supplier',
    organizationId: 'demo-supplier-org',
  },
  {
    userId: 'demo-financier-user',
    username: 'financier.demo',
    displayName: 'Demo Financier',
    roleCode: 'financier',
    organizationId: 'demo-financier-org',
  },
  {
    userId: 'demo-security-user',
    username: 'security.demo',
    displayName: 'Demo Security Operator',
    roleCode: 'securityOperator',
    organizationId: 'demo-security-org',
  },
];

const roleLabels: Record<string, string> = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  regulator: 'Regulator',
  complianceReviewer: 'Compliance Reviewer',
  shariahReviewer: 'Shariah Reviewer',
  buyer: 'Buyer',
  supplier: 'Supplier',
  financier: 'Financier',
  securityOperator: 'Security Operator',
};

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

function hashDemoPassword(): string {
  return createHash('sha256').update(DEMO_PASSWORD).digest('hex');
}

async function seed(): Promise<void> {
  if (isDryRun()) {
    console.log(`Validated demo seed plan for ${demoAccounts.length} demo account(s).`);
    console.log(`Demo usernames: ${demoAccounts.map(account => account.username).join(', ')}`);
    console.log('Demo KYC/AML eligibility, Shariah review, Shariah certificate artifact, PLS contract, procurement order, delivery evidence, lifecycle events, anchor metadata, and escrow records are included.');
    return;
  }

  const config = loadDatabaseConfig();
  if (!config.demoSeedEnabled) {
    console.log('DEMO_SEED_ENABLED is not true; skipping demo seed.');
    return;
  }

  const now = new Date().toISOString();
  const passwordHash = hashDemoPassword();
  const pool = createPostgresPool(config);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const account of demoAccounts) {
      await client.query(
        `
          INSERT INTO platform_users (user_id, display_name, status, created_at, updated_at)
          VALUES ($1, $2, 'active', $3, $3)
          ON CONFLICT (user_id)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [account.userId, account.displayName, now],
      );

      await client.query(
        `
          INSERT INTO platform_user_credentials (user_id, username, password_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $4)
          ON CONFLICT (username)
          DO UPDATE SET
            user_id = EXCLUDED.user_id,
            password_hash = EXCLUDED.password_hash,
            updated_at = EXCLUDED.updated_at
        `,
        [account.userId, account.username, passwordHash, now],
      );

      await client.query(
        `
          INSERT INTO member_organizations (
            id,
            registration_number,
            legal_name,
            display_name,
            organization_type,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 'demo', 'active', $5, $5)
          ON CONFLICT (id)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [
          account.organizationId,
          `REG-${account.organizationId.toUpperCase()}`,
          account.displayName.replace('Demo ', 'Demo Organization '),
          account.displayName.replace('Demo ', ''),
          now,
        ],
      );

      await client.query(
        `
          INSERT INTO roles (
            id,
            role_code,
            display_name,
            scope,
            permissions,
            status,
            is_system_reserved
          )
          VALUES ($1, $2, $3, 'organization', '[]'::jsonb, 'active', true)
          ON CONFLICT (role_code, scope)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            status = EXCLUDED.status,
            is_system_reserved = EXCLUDED.is_system_reserved,
            updated_at = now()
        `,
        [`role_${account.roleCode}`, account.roleCode, roleLabels[account.roleCode]],
      );

      await client.query(
        `
          INSERT INTO organization_memberships (user_id, organization_id, status, created_at, updated_at)
          VALUES ($1, $2, 'active', $3, $3)
          ON CONFLICT (user_id, organization_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [account.userId, account.organizationId, now],
      );

      await client.query(
        `
          INSERT INTO role_assignments (user_id, organization_id, role_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'active', $4, $4)
          ON CONFLICT (user_id, organization_id, role_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [account.userId, account.organizationId, `role_${account.roleCode}`, now],
      );
    }

    const eligibleDemoOrganizations = [
      {
        caseId: 'demo-kyc-case-buyer',
        organizationId: 'demo-buyer-org',
        submittedBy: 'demo-buyer-user',
        legalName: 'Amanah Retail Sdn Bhd',
        registrationNumber: 'REG-DEMO-BUYER-ORG',
        businessType: 'regulatedBuyer',
      },
      {
        caseId: 'demo-kyc-case-supplier',
        organizationId: 'demo-supplier-org',
        submittedBy: 'demo-supplier-user',
        legalName: 'Barakah Supplies Sdn Bhd',
        registrationNumber: 'REG-DEMO-SUPPLIER-ORG',
        businessType: 'smeSupplier',
      },
      {
        caseId: 'demo-kyc-case-financier',
        organizationId: 'demo-financier-org',
        submittedBy: 'demo-financier-user',
        legalName: 'Mabrur Finance Partner',
        registrationNumber: 'REG-DEMO-FINANCIER-ORG',
        businessType: 'financier',
      },
    ];

    for (const organization of eligibleDemoOrganizations) {
      await client.query(
        `
          INSERT INTO kyc_aml_onboarding_cases (
            case_id,
            member_organization_id,
            kyc,
            aml,
            evidence_references,
            status,
            submitted_by_user_id,
            created_at,
            updated_at,
            decision,
            decided_by_user_id,
            decided_at,
            decision_outcome
          )
          VALUES (
            $1,
            $2,
            $3::jsonb,
            $4::jsonb,
            $5::jsonb,
            'approved',
            $6,
            $7,
            $7,
            $8::jsonb,
            'demo-compliance-user',
            $7,
            'pass'
          )
          ON CONFLICT (case_id)
          DO UPDATE SET
            kyc = EXCLUDED.kyc,
            aml = EXCLUDED.aml,
            evidence_references = EXCLUDED.evidence_references,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            decision = EXCLUDED.decision,
            decided_by_user_id = EXCLUDED.decided_by_user_id,
            decided_at = EXCLUDED.decided_at,
            decision_outcome = EXCLUDED.decision_outcome
        `,
        [
          organization.caseId,
          organization.organizationId,
          JSON.stringify({
            legalName: organization.legalName,
            registrationNumber: organization.registrationNumber,
            countryCode: 'MY',
            businessType: organization.businessType,
          }),
          JSON.stringify({
            declaredBusinessActivity: 'Procurement case participant for the local supervised demo.',
            expectedMonthlyTransactionValue: '100000.00',
            declaredSanctionsExposure: false,
            declaredPepExposure: false,
            riskSummary: 'Approved demo onboarding profile.',
          }),
          JSON.stringify([
            {
              type: 'companyRegistration',
              name: `${organization.legalName} registration metadata`,
              uri: `demo://kyc/${organization.organizationId}/registration`,
              mediaType: 'application/json',
              checksum: 'sha256:demo-registration-metadata-hash',
            },
            {
              type: 'authorizedRepresentativeIdentity',
              name: `${organization.legalName} representative metadata`,
              uri: `demo://kyc/${organization.organizationId}/representative`,
              mediaType: 'application/json',
              checksum: 'sha256:demo-representative-metadata-hash',
            },
            {
              type: 'amlDeclaration',
              name: `${organization.legalName} AML declaration metadata`,
              uri: `demo://kyc/${organization.organizationId}/aml-declaration`,
              mediaType: 'application/json',
              checksum: 'sha256:demo-aml-declaration-metadata-hash',
            },
          ]),
          organization.submittedBy,
          now,
          JSON.stringify({
            outcome: 'pass',
            rationale: 'Demo organization approved for supervised procurement walkthrough.',
            reasonCodes: [],
          }),
        ],
      );
    }

    await client.query(
      `
        INSERT INTO shariah_reviews (
          review_id,
          organization_id,
          title,
          summary,
          status,
          submitted_by_user_id,
          created_at,
          references_json,
          checklist,
          rationale,
          conditions,
          decided_at
        )
        VALUES (
          'review-demo-approved',
          'demo-supplier-org',
          'Restricted PLS seedbed review',
          'Review of the Amanah-Barakah procurement-linked PLS seedbed contract.',
          'approved',
          'demo-shariah-user',
          $1,
          $2::jsonb,
          $3::jsonb,
          'Approved for restricted MVP seedbed demonstration only. No production Shariah certification is claimed.',
          '[]'::jsonb,
          $1
        )
        ON CONFLICT (review_id)
        DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          references_json = EXCLUDED.references_json,
          checklist = EXCLUDED.checklist,
          rationale = EXCLUDED.rationale,
          conditions = EXCLUDED.conditions,
          decided_at = EXCLUDED.decided_at
      `,
      [
        now,
        JSON.stringify([
          {
            type: 'contractTemplate',
            name: 'Mudarabah procurement template',
            uri: 'demo://shariah/mudarabah-procurement-v1',
            description: 'Safe reference metadata for restricted PLS seedbed review.',
            mediaType: 'application/json',
          },
        ]),
        JSON.stringify({
          status: 'checklistComplete',
          reviewerComment: 'Checklist completed for supervised demo scope.',
          entries: [
            {
              itemCode: 'item1',
              outcome: 'pass',
            },
            {
              itemCode: 'item2',
              outcome: 'pass',
              evidenceRefs: ['demo://shariah/evidence/template-hash'],
            },
            {
              itemCode: 'item4',
              outcome: 'pass',
            },
          ],
        }),
      ],
    );

    await client.query(
      `
        INSERT INTO shariah_certificates (
          certificate_id,
          issued_by,
          reviewer_board,
          fatwa_reference,
          scope,
          contract_template_version,
          conditions,
          issued_at,
          expires_at,
          status,
          certificate_document_id,
          certificate_hash,
          created_by_user_id,
          created_at
        )
        VALUES (
          'shariah-certificate-mudarabah-v1',
          'MVP Shariah Governance Board',
          'Restricted PLS Seedbed Review Panel',
          'FATWA-MVP-PLS-001',
          'restricted-pls-seedbed',
          'mudarabah-procurement-v1',
          $1::jsonb,
          '2026-05-20T00:00:00.000Z',
          '2027-05-20T00:00:00.000Z',
          'active',
          'doc-shariah-certificate-demo',
          'sha256:demo-shariah-certificate-hash',
          'demo-shariah-user',
          '2026-05-20T00:00:00.000Z'
        )
        ON CONFLICT (certificate_id)
        DO UPDATE SET
          issued_by = EXCLUDED.issued_by,
          reviewer_board = EXCLUDED.reviewer_board,
          fatwa_reference = EXCLUDED.fatwa_reference,
          scope = EXCLUDED.scope,
          contract_template_version = EXCLUDED.contract_template_version,
          conditions = EXCLUDED.conditions,
          issued_at = EXCLUDED.issued_at,
          expires_at = EXCLUDED.expires_at,
          status = EXCLUDED.status,
          certificate_document_id = EXCLUDED.certificate_document_id,
          certificate_hash = EXCLUDED.certificate_hash,
          created_by_user_id = EXCLUDED.created_by_user_id,
          created_at = EXCLUDED.created_at
      `,
      [
        JSON.stringify([
          'Simulation-only PLS distribution records',
          'No guaranteed profit or principal',
          'No external payment execution',
        ]),
      ],
    );

    await client.query(
      `
        INSERT INTO pls_contracts (
          contract_id,
          procurement_reference,
          contract_template_version,
          buyer_organization_id,
          supplier_organization_id,
          financier_organization_id,
          capital_amount,
          currency,
          profit_share,
          loss_allocation,
          status,
          shariah_approval,
          shariah_certificate,
          activated_at,
          created_at,
          updated_at
        )
        VALUES (
          'pls-demo-halal-packaging',
          'demo-order-001',
          'mudarabah-procurement-v1',
          'demo-buyer-org',
          'demo-supplier-org',
          'demo-financier-org',
          '68000.00',
          'MYR',
          '{"financierPercent":60,"ventureOperatorPercent":40}'::jsonb,
          'capitalProviderBearsFinancialLossExceptMisconduct',
          'approvedForActivation',
          '{"reviewId":"review-demo-approved","status":"approved","decidedAt":"2026-05-21T10:00:00.000Z"}'::jsonb,
          '{"certificateId":"shariah-certificate-mudarabah-v1","status":"active","certificateHash":"sha256:demo-shariah-certificate-hash","issuedAt":"2026-05-20T00:00:00.000Z","expiresAt":"2027-05-20T00:00:00.000Z"}'::jsonb,
          NULL,
          $1,
          $1
        )
        ON CONFLICT (contract_id)
        DO UPDATE SET
          procurement_reference = EXCLUDED.procurement_reference,
          contract_template_version = EXCLUDED.contract_template_version,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          financier_organization_id = EXCLUDED.financier_organization_id,
          capital_amount = EXCLUDED.capital_amount,
          currency = EXCLUDED.currency,
          profit_share = EXCLUDED.profit_share,
          loss_allocation = EXCLUDED.loss_allocation,
          status = EXCLUDED.status,
          shariah_approval = EXCLUDED.shariah_approval,
          shariah_certificate = EXCLUDED.shariah_certificate,
          activated_at = EXCLUDED.activated_at,
          updated_at = EXCLUDED.updated_at
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO access_audit_events (
          event_id,
          schema_version,
          occurred_at,
          request_id,
          actor_user_id,
          actor_source,
          action,
          target_type,
          target_id,
          outcome,
          module,
          evidence_payload_hash,
          evidence_canonicalization
        )
        VALUES (
          'demo-audit-event-001',
          'access-audit-event.v1',
          $1,
          'demo-seed-request',
          'demo-auditor-user',
          'actorContext',
          'viewAccessHistory',
          'accessHistory',
          'demo-audit-case',
          'success',
          'access-control',
          'sha256:demo-access-audit-event-hash',
          'json-stable-v1'
        )
        ON CONFLICT (event_id) DO NOTHING
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO procure_to_pay_lifecycle_events (
          event_id,
          schema_version,
          occurred_at,
          recorded_at,
          request_id,
          correlation_id,
          case_id,
          lifecycle_stage,
          event_type,
          actor_user_id,
          actor_source,
          target_type,
          target_id,
          outcome,
          payload_hash,
          canonicalization,
          metadata
        )
        VALUES (
          'demo-ptp-event-001',
          'procure-to-pay-lifecycle-event.v1',
          $1,
          $1,
          'demo-seed-request',
          'demo-correlation-001',
          'demo-case-001',
          'purchaseOrder',
          'purchaseOrderAccepted',
          'demo-buyer-user',
          'actorContext',
          'purchaseOrder',
          'demo-order-001',
          'success',
          'sha256:demo-ptp-event-hash',
          'json-stable-v1',
          '{"demo": true}'::jsonb
        )
        ON CONFLICT (event_id) DO NOTHING
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO procurement_orders (
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          title,
          description,
          amount,
          currency,
          status,
          created_by,
          created_at,
          updated_at,
          accepted_by,
          accepted_at,
          lifecycle_event_ids,
          latest_lifecycle_payload_hash
        )
        VALUES (
          'demo-order-001',
          'demo-buyer-org',
          'demo-supplier-org',
          'Halal packaging lot',
          'Accepted order available for delivery evidence and escrow demonstration.',
          '68000.00',
          'MYR',
          'accepted',
          'demo-buyer-user',
          $1,
          $1,
          'demo-supplier-user',
          $1,
          ARRAY['demo-ptp-event-001']::text[],
          'sha256:demo-ptp-event-hash'
        )
        ON CONFLICT (order_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          accepted_by = EXCLUDED.accepted_by,
          accepted_at = EXCLUDED.accepted_at,
          lifecycle_event_ids = EXCLUDED.lifecycle_event_ids,
          latest_lifecycle_payload_hash = EXCLUDED.latest_lifecycle_payload_hash
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO blockchain_anchor_metadata (
          event_id,
          payload_hash,
          case_id_hash,
          anchor_status,
          blockchain_network,
          channel_name,
          chaincode_name,
          failure_reason,
          created_at,
          updated_at
        )
        VALUES (
          'demo-ptp-event-001',
          'sha256:demo-ptp-event-hash',
          'sha256:demo-case-001',
          'pending',
          'fabric-local',
          'procurement-channel',
          'audit-anchor',
          NULL,
          $1,
          $1
        )
        ON CONFLICT (event_id)
        DO UPDATE SET
          anchor_status = EXCLUDED.anchor_status,
          updated_at = EXCLUDED.updated_at
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO procure_to_pay_lifecycle_events (
          event_id,
          schema_version,
          occurred_at,
          recorded_at,
          request_id,
          correlation_id,
          case_id,
          lifecycle_stage,
          event_type,
          actor_user_id,
          actor_source,
          target_type,
          target_id,
          outcome,
          payload_hash,
          canonicalization,
          metadata
        )
        VALUES (
          'demo-delivery-event-001',
          'procure-to-pay-lifecycle-event.v1',
          $1,
          $1,
          'demo-seed-request',
          'demo-correlation-001',
          'demo-case-001',
          'delivery',
          'deliveryEvidenceSubmitted',
          'demo-supplier-user',
          'actorContext',
          'delivery',
          'demo-delivery-evidence-001',
          'success',
          'sha256:demo-delivery-event-hash',
          'json-stable-v1',
          '{"demo": true, "proofOnly": true}'::jsonb
        )
        ON CONFLICT (event_id) DO NOTHING
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO blockchain_anchor_metadata (
          event_id,
          payload_hash,
          case_id_hash,
          anchor_status,
          blockchain_network,
          channel_name,
          chaincode_name,
          created_at,
          updated_at
        )
        VALUES (
          'demo-delivery-event-001',
          'sha256:demo-delivery-event-hash',
          'sha256:demo-case-001',
          'pending',
          'fabric-local',
          'procurement-channel',
          'audit-anchor',
          $1,
          $1
        )
        ON CONFLICT (event_id)
        DO UPDATE SET
          anchor_status = EXCLUDED.anchor_status,
          updated_at = EXCLUDED.updated_at
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO delivery_evidence (
          evidence_id,
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          submitted_by_user_id,
          evidence_type,
          evidence_reference,
          evidence_hash,
          notes,
          submitted_at,
          verification_status,
          lifecycle_event_id,
          lifecycle_event_hash,
          blockchain_event_id,
          blockchain_payload_hash,
          blockchain_anchor_status,
          blockchain_network,
          blockchain_channel_name,
          blockchain_chaincode_name
        )
        VALUES (
          'demo-delivery-evidence-001',
          'demo-order-001',
          'demo-buyer-org',
          'demo-supplier-org',
          'demo-supplier-user',
          'deliveryNote',
          'delivery-ref:barakah:dn-1002',
          'sha256:demo-delivery-evidence-hash',
          'Sealed carton count and dispatch timestamp recorded by supplier operations.',
          $1,
          'metadataRecorded',
          'demo-delivery-event-001',
          'sha256:demo-delivery-event-hash',
          'demo-delivery-event-001',
          'sha256:demo-delivery-event-hash',
          'pending',
          'fabric-local',
          'procurement-channel',
          'audit-anchor'
        )
        ON CONFLICT (evidence_id)
        DO UPDATE SET
          evidence_reference = EXCLUDED.evidence_reference,
          evidence_hash = EXCLUDED.evidence_hash,
          notes = EXCLUDED.notes,
          submitted_at = EXCLUDED.submitted_at,
          verification_status = EXCLUDED.verification_status,
          blockchain_anchor_status = EXCLUDED.blockchain_anchor_status
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO procure_to_pay_lifecycle_events (
          event_id,
          schema_version,
          occurred_at,
          recorded_at,
          request_id,
          correlation_id,
          case_id,
          lifecycle_stage,
          event_type,
          actor_user_id,
          actor_source,
          target_type,
          target_id,
          outcome,
          payload_hash,
          canonicalization,
          metadata
        )
        VALUES (
          'demo-escrow-event-001',
          'procure-to-pay-lifecycle-event.v1',
          $1,
          $1,
          'demo-seed-request',
          'accepted-order-demo-001',
          'demo-order-001',
          'escrow',
          'escrowCreated',
          'demo-buyer-user',
          'actorContext',
          'escrow',
          'demo-escrow-001',
          'success',
          'sha256:demo-escrow-event-hash',
          'json-stable-v1',
          '{"demo": true, "proofOnly": true}'::jsonb
        )
        ON CONFLICT (event_id) DO NOTHING
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO blockchain_anchor_metadata (
          event_id,
          payload_hash,
          case_id_hash,
          anchor_status,
          blockchain_network,
          channel_name,
          chaincode_name,
          created_at,
          updated_at
        )
        VALUES (
          'demo-escrow-event-001',
          'sha256:demo-escrow-event-hash',
          'sha256:demo-order-001',
          'pending',
          'fabric-local',
          'procurement-channel',
          'audit-anchor',
          $1,
          $1
        )
        ON CONFLICT (event_id)
        DO UPDATE SET
          anchor_status = EXCLUDED.anchor_status,
          updated_at = EXCLUDED.updated_at
      `,
      [now],
    );

    await client.query(
      `
        INSERT INTO escrows (
          escrow_id,
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          financier_organization_id,
          terms_hash,
          status,
          accepted_order_reference,
          created_by,
          created_at,
          updated_at,
          lifecycle_event_id,
          lifecycle_event_hash,
          blockchain_anchor_status,
          blockchain_network,
          blockchain_channel_name,
          blockchain_chaincode_name
        )
        VALUES (
          'demo-escrow-001',
          'demo-order-001',
          'demo-buyer-org',
          'demo-supplier-org',
          'demo-financier-org',
          'sha256:demo-escrow-terms-hash',
          'escrowCreated',
          'accepted-order-demo-001',
          'demo-buyer-user',
          $1,
          $1,
          'demo-escrow-event-001',
          'sha256:demo-escrow-event-hash',
          'pending',
          'fabric-local',
          'procurement-channel',
          'audit-anchor'
        )
        ON CONFLICT (escrow_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          blockchain_anchor_status = EXCLUDED.blockchain_anchor_status
      `,
      [now],
    );

    await client.query('COMMIT');
    console.log(`Seeded ${demoAccounts.length} demo account(s), procurement order, delivery evidence, proof metadata, and demo escrow.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
