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
    console.log(`Seeded ${demoAccounts.length} demo account(s), proof metadata, and demo escrow.`);
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
