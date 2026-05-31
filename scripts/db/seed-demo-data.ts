import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { createPostgresPool } from '../../src/infrastructure/database/postgres-client.js';
import { loadDatabaseConfig } from '../../src/infrastructure/database/database-config.js';
import { hashExternalSecret } from '../../src/modules/integration/application/external-request-signing.js';

const DEMO_PASSWORD = 'demo-password';
const DEMO_EXTERNAL_SHARED_SECRET = process.env.EXTERNAL_API_SHARED_SECRET ?? 'change-me-local-external-secret';

type DemoAccount = {
  userId: string;
  username: string;
  displayName: string;
  roleCode: string;
  organizationId: string;
};

type DemoOrganizationProfile = {
  organizationId: string;
  legalName: string;
  displayName: string;
  alias: string;
  uniqueIdentifier: string;
  businessCategory: string;
  publicProfileSummary: string;
  contactEmail: string;
  status?: 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted';
  onboardingStatus?: 'approved' | 'submitted' | 'flagged' | 'blocked' | 'rejected';
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
    userId: 'demo-tijarah-admin-user',
    username: 'tijarah.admin',
    displayName: 'Tijarah Platform Admin',
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
    userId: 'demo-sakinah-auditor-user',
    username: 'sakinah.auditor',
    displayName: 'Sakinah Audit Reviewer',
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
    userId: 'demo-regulator-officer-user',
    username: 'regulator.officer',
    displayName: 'Reporting Officer',
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
    userId: 'demo-nurshariah-reviewer-user',
    username: 'nurshariah.reviewer',
    displayName: 'Nur Shariah Reviewer',
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
    userId: 'demo-amanah-admin-user',
    username: 'amanah.admin',
    displayName: 'Amanah Company Admin',
    roleCode: 'organizationAdmin',
    organizationId: 'demo-buyer-org',
  },
  {
    userId: 'demo-amanah-procurement-user',
    username: 'amanah.procurement',
    displayName: 'Amanah Procurement Officer',
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
    userId: 'demo-barakah-admin-user',
    username: 'barakah.admin',
    displayName: 'Barakah Company Admin',
    roleCode: 'organizationAdmin',
    organizationId: 'demo-supplier-org',
  },
  {
    userId: 'demo-barakah-sales-user',
    username: 'barakah.sales',
    displayName: 'Barakah Sales Coordinator',
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
    userId: 'demo-mabrur-finance-user',
    username: 'mabrur.finance',
    displayName: 'Mabrur Finance Analyst',
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
  {
    userId: 'demo-hidayah-admin-user',
    username: 'hidayah.admin',
    displayName: 'Hidayah Procurement Admin',
    roleCode: 'organizationAdmin',
    organizationId: 'buyer-hidayah-org',
  },
  {
    userId: 'demo-raudhah-procurement-user',
    username: 'raudhah.procurement',
    displayName: 'Raudhah Procurement Officer',
    roleCode: 'buyer',
    organizationId: 'buyer-raudhah-org',
  },
  {
    userId: 'demo-halalpack-admin-user',
    username: 'halalpack.admin',
    displayName: 'Halal Pack Admin',
    roleCode: 'organizationAdmin',
    organizationId: 'supplier-halal-pack-org',
  },
  {
    userId: 'demo-nusantara-sales-user',
    username: 'nusantara.sales',
    displayName: 'Nusantara Sales Lead',
    roleCode: 'supplier',
    organizationId: 'supplier-nusantara-org',
  },
  {
    userId: 'demo-falah-finance-user',
    username: 'falah.finance',
    displayName: 'Falah Working Capital Officer',
    roleCode: 'financier',
    organizationId: 'financier-falah-org',
  },
  {
    userId: 'demo-amanlogistics-ops-user',
    username: 'amanlogistics.ops',
    displayName: 'Aman Logistics Operator',
    roleCode: 'supplier',
    organizationId: 'logistics-aman-org',
  },
];

const roleLabels: Record<string, string> = {
  administrator: 'Administrator',
  auditor: 'Auditor',
  regulator: 'Regulator',
  complianceReviewer: 'Compliance Reviewer',
  shariahReviewer: 'Shariah Reviewer',
  buyer: 'Buyer',
  organizationAdmin: 'Organization Admin',
  supplier: 'Supplier',
  financier: 'Financier',
  securityOperator: 'Security Operator',
};

const demoExternalClients = [
  {
    clientId: 'proof-client',
    clientName: 'Demo Proof Verification Client',
    scopes: ['proof:verify'],
  },
  {
    clientId: 'delivery-proof-client',
    clientName: 'Demo Delivery Proof Client',
    scopes: ['evidence:write', 'logistics:write'],
  },
  {
    clientId: 'erp-sync-client',
    clientName: 'Demo ERP Sync Client',
    scopes: ['erp:sync'],
  },
];

const demoOrganizationProfiles: Record<string, Omit<DemoOrganizationProfile, 'organizationId'>> = {
  'demo-platform-org': {
    legalName: 'Tijarah Mabrur Sdn Bhd',
    displayName: 'Tijarah Mabrur',
    alias: 'Tijarah',
    uniqueIdentifier: 'tijarah-mabrur',
    businessCategory: 'Platform operator',
    publicProfileSummary: 'Platform operator and buyer-operator demo company for supervised procurement evidence workflows.',
    contactEmail: 'platform@tijarah.example.test',
  },
  'demo-buyer-org': {
    legalName: 'Amanah Retail Sdn Bhd',
    displayName: 'Amanah Retail',
    alias: 'Amanah',
    uniqueIdentifier: 'amanah-retail',
    businessCategory: 'Regulated buyer',
    publicProfileSummary: 'Retail buyer coordinating verified procurement, escrow readiness, and proof review.',
    contactEmail: 'ops@amanah.example.test',
  },
  'demo-supplier-org': {
    legalName: 'Barakah Supplies Sdn Bhd',
    displayName: 'Barakah Supplies',
    alias: 'Barakah',
    uniqueIdentifier: 'barakah-supplies',
    businessCategory: 'SME supplier',
    publicProfileSummary: 'Supplier organization providing packaging goods with delivery evidence metadata.',
    contactEmail: 'supply@barakah.example.test',
  },
  'demo-financier-org': {
    legalName: 'Mabrur Finance Partner',
    displayName: 'Mabrur Finance',
    alias: 'Mabrur',
    uniqueIdentifier: 'mabrur-finance',
    businessCategory: 'Islamic SME financier',
    publicProfileSummary: 'Restricted PLS seedbed finance participant for approved procurement contracts.',
    contactEmail: 'finance@mabrur.example.test',
  },
  'demo-regulator-org': {
    legalName: 'Suruhanjaya Demo Regulator',
    displayName: 'Demo Regulator',
    alias: 'Regulator',
    uniqueIdentifier: 'suruhanjaya-demo-regulator',
    businessCategory: 'Regulator',
    publicProfileSummary: 'Reporting user that reviews export bundle integrity metadata.',
    contactEmail: 'reporting@example.test',
  },
  'demo-compliance-org': {
    legalName: 'Sakinah Compliance Services',
    displayName: 'Sakinah Compliance',
    alias: 'Compliance',
    uniqueIdentifier: 'sakinah-compliance',
    businessCategory: 'Audit and compliance partner',
    publicProfileSummary: 'Compliance reviewer organization for KYC and eligibility decisions.',
    contactEmail: 'compliance@sakinah.example.test',
  },
  'demo-shariah-org': {
    legalName: 'Nur Shariah Advisory',
    displayName: 'Nur Shariah',
    alias: 'Nur Shariah',
    uniqueIdentifier: 'nur-shariah-advisory',
    businessCategory: 'Shariah and legal review',
    publicProfileSummary: 'Restricted PLS seedbed review organization for governance artifact checks.',
    contactEmail: 'review@nurshariah.example.test',
  },
  'demo-audit-org': {
    legalName: 'Sakinah Audit Services',
    displayName: 'Sakinah Audit',
    alias: 'Sakinah Audit',
    uniqueIdentifier: 'sakinah-audit-services',
    businessCategory: 'Audit and assurance partner',
    publicProfileSummary: 'Auditor organization for proof, access history, and export bundle review.',
    contactEmail: 'audit@sakinah.example.test',
  },
  'demo-security-org': {
    legalName: 'Tijarah Security Operations',
    displayName: 'Security Operations',
    alias: 'Security Ops',
    uniqueIdentifier: 'tijarah-security-operations',
    businessCategory: 'Security operations',
    publicProfileSummary: 'Security operator organization for read-only access, proof, and operational alerts.',
    contactEmail: 'security@tijarah.example.test',
  },
  'buyer-raudhah-org': {
    legalName: 'Raudhah Grocers Sdn Bhd',
    displayName: 'Raudhah Grocers',
    alias: 'Raudhah',
    uniqueIdentifier: 'raudhah-grocers',
    businessCategory: 'Regulated buyer',
    publicProfileSummary: 'Grocery buyer with procurement relationships and one degraded proof-scope example.',
    contactEmail: 'procurement@raudhah.example.test',
  },
  'buyer-hidayah-org': {
    legalName: 'Hidayah Healthcare Supplies Buyer Sdn Bhd',
    displayName: 'Hidayah Healthcare',
    alias: 'Hidayah',
    uniqueIdentifier: 'hidayah-healthcare',
    businessCategory: 'Regulated buyer',
    publicProfileSummary: 'Healthcare buyer using evidence-led supplier onboarding and procurement review.',
    contactEmail: 'buying@hidayah.example.test',
  },
  'buyer-salam-org': {
    legalName: 'Salam Cooperative Mart Berhad',
    displayName: 'Salam Cooperative',
    alias: 'Salam',
    uniqueIdentifier: 'salam-cooperative',
    businessCategory: 'Procurement-heavy cooperative',
    publicProfileSummary: 'Cooperative buyer with approved procurement membership and supplier relationships.',
    contactEmail: 'ops@salamcoop.example.test',
  },
  'buyer-nur-education-org': {
    legalName: 'Nur Education Trust',
    displayName: 'Nur Education',
    alias: 'Nur Education',
    uniqueIdentifier: 'nur-education-trust',
    businessCategory: 'Development buyer',
    publicProfileSummary: 'Education-sector buyer that needs supplier evidence and controlled exports.',
    contactEmail: 'procurement@nureducation.example.test',
  },
  'supplier-halal-pack-org': {
    legalName: 'Halal Pack Manufacturing',
    displayName: 'Halal Pack',
    alias: 'Halal Pack',
    uniqueIdentifier: 'halal-pack-manufacturing',
    businessCategory: 'Packaging supplier',
    publicProfileSummary: 'Packaging supplier for buyer-supplier proof and delivery evidence workflows.',
    contactEmail: 'sales@halalpack.example.test',
  },
  'supplier-crescent-components-org': {
    legalName: 'Crescent Components Sdn Bhd',
    displayName: 'Crescent Components',
    alias: 'Crescent',
    uniqueIdentifier: 'crescent-components',
    businessCategory: 'Component supplier',
    publicProfileSummary: 'Component supplier with active procurement network participation.',
    contactEmail: 'orders@crescent.example.test',
  },
  'supplier-nusantara-org': {
    legalName: 'Nusantara Office Supplies',
    displayName: 'Nusantara Office',
    alias: 'Nusantara',
    uniqueIdentifier: 'nusantara-office-supplies',
    businessCategory: 'Office supplies supplier',
    publicProfileSummary: 'Office supplies supplier for multi-buyer procurement evidence examples.',
    contactEmail: 'sales@nusantara.example.test',
  },
  'supplier-waqftech-org': {
    legalName: 'WaqfTech Solutions',
    displayName: 'WaqfTech',
    alias: 'WaqfTech',
    uniqueIdentifier: 'waqftech-solutions',
    businessCategory: 'Software and services supplier',
    publicProfileSummary: 'Services supplier used for low-risk non-document proof projections.',
    contactEmail: 'hello@waqftech.example.test',
  },
  'supplier-tawakkal-foods-org': {
    legalName: 'Tawakkal Foods Distribution',
    displayName: 'Tawakkal Foods',
    alias: 'Tawakkal',
    uniqueIdentifier: 'tawakkal-foods-distribution',
    businessCategory: 'Food distribution supplier',
    publicProfileSummary: 'Food distribution supplier with approved relationship metadata.',
    contactEmail: 'distribution@tawakkal.example.test',
  },
  'supplier-ihsan-medical-org': {
    legalName: 'Ihsan Medical Supplies',
    displayName: 'Ihsan Medical',
    alias: 'Ihsan',
    uniqueIdentifier: 'ihsan-medical-supplies',
    businessCategory: 'Medical supplies supplier',
    publicProfileSummary: 'Medical supplies supplier for regulated procurement examples.',
    contactEmail: 'sales@ihsanmedical.example.test',
  },
  'supplier-safa-construction-org': {
    legalName: 'Safa Construction Materials',
    displayName: 'Safa Materials',
    alias: 'Safa',
    uniqueIdentifier: 'safa-construction-materials',
    businessCategory: 'Construction materials supplier',
    publicProfileSummary: 'Materials supplier with buyer relationship scope for proof visualization.',
    contactEmail: 'orders@safa.example.test',
  },
  'supplier-rahmah-facility-org': {
    legalName: 'Rahmah Facility Services',
    displayName: 'Rahmah Facility',
    alias: 'Rahmah',
    uniqueIdentifier: 'rahmah-facility-services',
    businessCategory: 'Service supplier',
    publicProfileSummary: 'Service supplier for local proof-only task and scorecard examples.',
    contactEmail: 'services@rahmah.example.test',
  },
  'supplier-qistina-energy-org': {
    legalName: 'Qistina Energy Services',
    displayName: 'Qistina Energy',
    alias: 'Qistina',
    uniqueIdentifier: 'qistina-energy-services',
    businessCategory: 'Energy services supplier',
    publicProfileSummary: 'Energy services supplier with private network relationship readiness.',
    contactEmail: 'ops@qistina.example.test',
  },
  'financier-falah-org': {
    legalName: 'Falah Working Capital Bank',
    displayName: 'Falah Bank',
    alias: 'Falah',
    uniqueIdentifier: 'falah-working-capital-bank',
    businessCategory: 'Islamic SME financier',
    publicProfileSummary: 'Financing partner for private PLS proof-scope examples.',
    contactEmail: 'finance@falah.example.test',
  },
  'financier-amanah-capital-org': {
    legalName: 'Amanah Capital Cooperative',
    displayName: 'Amanah Capital',
    alias: 'Amanah Capital',
    uniqueIdentifier: 'amanah-capital-cooperative',
    businessCategory: 'Development finance body',
    publicProfileSummary: 'Development-finance body for controlled financing-readiness examples.',
    contactEmail: 'capital@amanahcapital.example.test',
  },
  'logistics-aman-org': {
    legalName: 'Aman Logistics Sdn Bhd',
    displayName: 'Aman Logistics',
    alias: 'Aman Logistics',
    uniqueIdentifier: 'aman-logistics',
    businessCategory: 'Logistics proof partner',
    publicProfileSummary: 'Logistics support partner for local metadata delivery evidence examples.',
    contactEmail: 'ops@amanlogistics.example.test',
  },
  'integration-bayt-org': {
    legalName: 'Bayt Accounting Integrations',
    displayName: 'Bayt Accounting',
    alias: 'Bayt',
    uniqueIdentifier: 'bayt-accounting-integrations',
    businessCategory: 'ERP and accounting partner',
    publicProfileSummary: 'ERP/accounting integration partner used for non-production adapter demonstrations.',
    contactEmail: 'integration@bayt.example.test',
  },
  'supplier-dormant-risk-org': {
    legalName: 'Dormant Risk Vendor',
    displayName: 'Dormant Risk Vendor',
    alias: 'Dormant Risk',
    uniqueIdentifier: 'dormant-risk-vendor',
    businessCategory: 'Flagged supplier',
    publicProfileSummary: 'Blocked supplier example for eligibility and risk-status display.',
    contactEmail: 'riskvendor@example.test',
    status: 'suspended',
    onboardingStatus: 'blocked',
  },
  'supplier-pending-applicant-org': {
    legalName: 'Pending Applicant Enterprise',
    displayName: 'Pending Applicant',
    alias: 'Pending Applicant',
    uniqueIdentifier: 'pending-applicant-enterprise',
    businessCategory: 'Pending supplier',
    publicProfileSummary: 'Pending onboarding supplier example for eligibility and workflow gating.',
    contactEmail: 'pending@example.test',
    status: 'pendingReview',
    onboardingStatus: 'submitted',
  },
};

const demoOrganizationList: DemoOrganizationProfile[] = Object.entries(demoOrganizationProfiles).map(
  ([organizationId, profile]) => ({
    organizationId,
    ...profile,
  }),
);

function isDryRun(): boolean {
  return process.argv.includes('--dry-run');
}

function hashDemoPassword(): string {
  return createHash('sha256').update(DEMO_PASSWORD).digest('hex');
}

async function upsertDemoOrganization(
  client: PoolClient,
  organization: DemoOrganizationProfile,
  now: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO member_organizations (
        id,
        registration_number,
        legal_name,
        display_name,
        organization_type,
        business_type,
        contact_email,
        status,
        alias,
        unique_identifier,
        business_category,
        public_profile_summary,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, 'demo', $5, $6, $7, $8, $9, $5, $10, $11, $11)
      ON CONFLICT (id)
      DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        display_name = EXCLUDED.display_name,
        business_type = EXCLUDED.business_type,
        contact_email = EXCLUDED.contact_email,
        status = EXCLUDED.status,
        alias = EXCLUDED.alias,
        unique_identifier = EXCLUDED.unique_identifier,
        business_category = EXCLUDED.business_category,
        public_profile_summary = EXCLUDED.public_profile_summary,
        updated_at = EXCLUDED.updated_at
    `,
    [
      organization.organizationId,
      `REG-${organization.organizationId.toUpperCase()}`,
      organization.legalName,
      organization.displayName,
      organization.businessCategory,
      organization.contactEmail,
      organization.status ?? 'active',
      organization.alias,
      organization.uniqueIdentifier,
      organization.publicProfileSummary,
      now,
    ],
  );
}

async function seed(): Promise<void> {
  if (isDryRun()) {
    console.log(`Validated demo seed plan for ${demoOrganizationList.length} organization(s) and ${demoAccounts.length} demo account(s).`);
    console.log(`Organization categories: ${[...new Set(demoOrganizationList.map(organization => organization.businessCategory))].join(', ')}`);
    console.log(`Demo usernames: ${demoAccounts.map(account => account.username).join(', ')}`);
    console.log('Demo KYC/AML eligibility, Shariah review, Shariah certificate artifact, PLS contract, procurement order, delivery evidence, lifecycle events, anchor metadata, escrow records, and organization network graph records are included.');
    console.log('Demo external API client credentials are included with hashed local shared-secret material only.');
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

    for (const organization of demoOrganizationList) {
      await upsertDemoOrganization(client, organization, now);
    }

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

      const profile = demoOrganizationProfiles[account.organizationId] ?? {
        legalName: account.displayName.replace('Demo ', 'Demo Organization '),
        displayName: account.displayName.replace('Demo ', ''),
        alias: account.displayName.replace('Demo ', ''),
        uniqueIdentifier: account.organizationId.replace(/^demo-/, ''),
        businessCategory: 'Demo organization',
        publicProfileSummary: 'Demo organization profile for local workflow validation.',
        contactEmail: `${account.username}@example.test`,
      };

      await upsertDemoOrganization(client, { organizationId: account.organizationId, ...profile }, now);

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

    const demoRelationships = [
      {
        relationshipId: 'rel-amanah-barakah',
        sourceOrganizationId: 'demo-buyer-org',
        targetOrganizationId: 'demo-supplier-org',
        relationshipType: 'buyer',
        channelScope: 'sharedChannelA',
      },
      {
        relationshipId: 'rel-mabrur-amanah',
        sourceOrganizationId: 'demo-financier-org',
        targetOrganizationId: 'demo-buyer-org',
        relationshipType: 'financier',
        channelScope: 'privateChannelC',
      },
      {
        relationshipId: 'rel-amanah-halal-pack',
        sourceOrganizationId: 'demo-buyer-org',
        targetOrganizationId: 'supplier-halal-pack-org',
        relationshipType: 'buyer',
        channelScope: 'sharedChannelA',
      },
      {
        relationshipId: 'rel-hidayah-nusantara',
        sourceOrganizationId: 'buyer-hidayah-org',
        targetOrganizationId: 'supplier-nusantara-org',
        relationshipType: 'buyer',
        channelScope: 'sharedChannelA',
      },
      {
        relationshipId: 'rel-salam-ihsan-medical',
        sourceOrganizationId: 'buyer-salam-org',
        targetOrganizationId: 'supplier-ihsan-medical-org',
        relationshipType: 'buyer',
        channelScope: 'sharedChannelA',
      },
      {
        relationshipId: 'rel-nur-education-waqftech',
        sourceOrganizationId: 'buyer-nur-education-org',
        targetOrganizationId: 'supplier-waqftech-org',
        relationshipType: 'buyer',
        channelScope: 'localProofOnly',
      },
      {
        relationshipId: 'rel-falah-hidayah',
        sourceOrganizationId: 'financier-falah-org',
        targetOrganizationId: 'buyer-hidayah-org',
        relationshipType: 'financier',
        channelScope: 'privateChannelC',
      },
      {
        relationshipId: 'rel-amanah-logistics',
        sourceOrganizationId: 'demo-buyer-org',
        targetOrganizationId: 'logistics-aman-org',
        relationshipType: 'logistics',
        channelScope: 'localProofOnly',
      },
      {
        relationshipId: 'rel-sakinah-regulator',
        sourceOrganizationId: 'demo-audit-org',
        targetOrganizationId: 'demo-regulator-org',
        relationshipType: 'auditorRegulator',
        channelScope: 'sharedChannelB',
      },
      {
        relationshipId: 'rel-regulator-amanah',
        sourceOrganizationId: 'demo-regulator-org',
        targetOrganizationId: 'demo-buyer-org',
        relationshipType: 'auditorRegulator',
        channelScope: 'sharedChannelB',
      },
      {
        relationshipId: 'rel-raudhah-dormant-risk',
        sourceOrganizationId: 'buyer-raudhah-org',
        targetOrganizationId: 'supplier-dormant-risk-org',
        relationshipType: 'buyer',
        channelScope: 'unavailable',
      },
      {
        relationshipId: 'rel-bayt-tijarah',
        sourceOrganizationId: 'integration-bayt-org',
        targetOrganizationId: 'demo-platform-org',
        relationshipType: 'mixed',
        channelScope: 'localProofOnly',
      },
    ];

    for (const relationship of demoRelationships) {
      await client.query(
        `
          INSERT INTO organization_network_relationships (
            relationship_id,
            source_organization_id,
            target_organization_id,
            relationship_type,
            channel_scope,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
          ON CONFLICT (source_organization_id, target_organization_id, relationship_type)
          DO UPDATE SET
            channel_scope = EXCLUDED.channel_scope,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [
          relationship.relationshipId,
          relationship.sourceOrganizationId,
          relationship.targetOrganizationId,
          relationship.relationshipType,
          relationship.channelScope,
          now,
        ],
      );
    }

    const demoNetworkRequests = [
      {
        requestId: 'network-request-raudhah-pending-applicant',
        requesterOrganizationId: 'buyer-raudhah-org',
        targetOrganizationId: 'supplier-pending-applicant-org',
        targetUniqueIdentifier: 'pending-applicant-enterprise',
        relationshipType: 'supplier',
        state: 'sent',
        createdByUserId: 'demo-raudhah-procurement-user',
        purpose: 'Assess supplier onboarding readiness before order creation.',
        message: 'Please complete onboarding metadata before procurement activity.',
      },
      {
        requestId: 'network-request-salam-dormant-rejected',
        requesterOrganizationId: 'buyer-salam-org',
        targetOrganizationId: 'supplier-dormant-risk-org',
        targetUniqueIdentifier: 'dormant-risk-vendor',
        relationshipType: 'supplier',
        state: 'rejected',
        createdByUserId: 'demo-admin-user',
        decidedByUserId: 'demo-compliance-user',
        purpose: 'Rejected demo risk scenario.',
        message: 'Relationship rejected after risk review.',
      },
    ];

    for (const request of demoNetworkRequests) {
      await client.query(
        `
          INSERT INTO organization_network_requests (
            request_id,
            requester_organization_id,
            target_organization_id,
            target_unique_identifier,
            relationship_type,
            message,
            purpose,
            state,
            created_by_user_id,
            decided_by_user_id,
            created_at,
            updated_at,
            decided_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
          ON CONFLICT (request_id)
          DO UPDATE SET
            message = EXCLUDED.message,
            purpose = EXCLUDED.purpose,
            state = EXCLUDED.state,
            decided_by_user_id = EXCLUDED.decided_by_user_id,
            updated_at = EXCLUDED.updated_at,
            decided_at = EXCLUDED.decided_at
        `,
        [
          request.requestId,
          request.requesterOrganizationId,
          request.targetOrganizationId,
          request.targetUniqueIdentifier,
          request.relationshipType,
          request.message,
          request.purpose,
          request.state,
          request.createdByUserId,
          request.decidedByUserId ?? null,
          now,
          request.decidedByUserId ? now : null,
        ],
      );
    }

    const externalSecretHash = hashExternalSecret(DEMO_EXTERNAL_SHARED_SECRET);
    for (const externalClient of demoExternalClients) {
      await client.query(
        `
          INSERT INTO external_client_credentials (
            client_id,
            client_name,
            scopes,
            status,
            secret_hash,
            created_at,
            revoked_at
          )
          VALUES ($1, $2, $3::jsonb, 'active', $4, $5, NULL)
          ON CONFLICT (client_id)
          DO UPDATE SET
            client_name = EXCLUDED.client_name,
            scopes = EXCLUDED.scopes,
            status = EXCLUDED.status,
            secret_hash = EXCLUDED.secret_hash,
            revoked_at = EXCLUDED.revoked_at
        `,
        [
          externalClient.clientId,
          externalClient.clientName,
          JSON.stringify(externalClient.scopes),
          externalSecretHash,
          now,
        ],
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

    const explicitlySeededEligibility = new Set(eligibleDemoOrganizations.map(organization => organization.organizationId));
    for (const organization of demoOrganizationList.filter(candidate => !explicitlySeededEligibility.has(candidate.organizationId))) {
      const status = organization.onboardingStatus ?? 'approved';
      const outcome = status === 'approved'
        ? 'pass'
        : status === 'blocked'
          ? 'block'
          : status === 'flagged'
            ? 'flag'
            : status === 'rejected'
              ? 'fail'
              : null;
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
            '[]'::jsonb,
            $5,
            'demo-admin-user',
            $6,
            $6,
            $7::jsonb,
            $8,
            $9,
            $10
          )
          ON CONFLICT (case_id)
          DO UPDATE SET
            kyc = EXCLUDED.kyc,
            aml = EXCLUDED.aml,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            decision = EXCLUDED.decision,
            decided_by_user_id = EXCLUDED.decided_by_user_id,
            decided_at = EXCLUDED.decided_at,
            decision_outcome = EXCLUDED.decision_outcome
        `,
        [
          `demo-kyc-case-${organization.organizationId}`,
          organization.organizationId,
          JSON.stringify({
            legalName: organization.legalName,
            registrationNumber: `REG-${organization.organizationId.toUpperCase()}`,
            countryCode: 'MY',
            businessType: organization.businessCategory,
          }),
          JSON.stringify({
            declaredBusinessActivity: organization.publicProfileSummary,
            expectedMonthlyTransactionValue: '50000.00',
            declaredSanctionsExposure: false,
            declaredPepExposure: false,
            riskSummary: status === 'blocked'
              ? 'Blocked demo onboarding profile for risk-state validation.'
              : status === 'submitted'
                ? 'Pending demo onboarding profile for workflow gating validation.'
                : 'Approved demo onboarding profile.',
          }),
          status,
          now,
          outcome
            ? JSON.stringify({
                outcome,
                rationale: 'Demo onboarding state for 20-company consortium seed validation.',
                reasonCodes: status === 'blocked' ? ['demoRiskBlock'] : [],
              })
            : null,
          outcome ? 'demo-compliance-user' : null,
          outcome ? now : null,
          outcome,
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

    const demoPilotDeals = [
      {
        orderId: 'demo-order-002',
        buyerOrganizationId: 'demo-buyer-org',
        supplierOrganizationId: 'supplier-halal-pack-org',
        title: 'Retail shelf-ready packaging replenishment',
        description: 'Accepted replenishment order used for multi-supplier ledger and scorecard validation.',
        amount: '42000.00',
        createdBy: 'demo-amanah-procurement-user',
        acceptedBy: 'demo-halalpack-admin-user',
        lifecycleEventId: 'demo-ptp-event-002',
        lifecycleHash: 'sha256:demo-ptp-event-002-hash',
        deliveryEventId: 'demo-delivery-event-002',
        deliveryEvidenceId: 'demo-delivery-evidence-002',
        deliveryHash: 'sha256:demo-delivery-event-002-hash',
        anchorStatus: 'anchored',
      },
      {
        orderId: 'demo-order-003',
        buyerOrganizationId: 'buyer-hidayah-org',
        supplierOrganizationId: 'supplier-nusantara-org',
        title: 'Healthcare office supplies bundle',
        description: 'Accepted healthcare buyer order with local proof metadata and no PLS terms.',
        amount: '31500.00',
        createdBy: 'demo-hidayah-admin-user',
        acceptedBy: 'demo-nusantara-sales-user',
        lifecycleEventId: 'demo-ptp-event-003',
        lifecycleHash: 'sha256:demo-ptp-event-003-hash',
        deliveryEventId: 'demo-delivery-event-003',
        deliveryEvidenceId: 'demo-delivery-evidence-003',
        deliveryHash: 'sha256:demo-delivery-event-003-hash',
        anchorStatus: 'pending',
      },
    ];

    for (const deal of demoPilotDeals) {
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
            $1,
            'procure-to-pay-lifecycle-event.v1',
            $2,
            $2,
            'demo-seed-request',
            $3,
            $3,
            'purchaseOrder',
            'purchaseOrderAccepted',
            $4,
            'actorContext',
            'purchaseOrder',
            $3,
            'success',
            $5,
            'json-stable-v1',
            '{"demo": true}'::jsonb
          )
          ON CONFLICT (event_id) DO NOTHING
        `,
        [deal.lifecycleEventId, now, deal.orderId, deal.createdBy, deal.lifecycleHash],
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
          VALUES ($1, $2, $3, $4, $5, $6, 'MYR', 'accepted', $7, $8, $8, $9, $8, ARRAY[$10]::text[], $11)
          ON CONFLICT (order_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            amount = EXCLUDED.amount,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            accepted_by = EXCLUDED.accepted_by,
            accepted_at = EXCLUDED.accepted_at,
            lifecycle_event_ids = EXCLUDED.lifecycle_event_ids,
            latest_lifecycle_payload_hash = EXCLUDED.latest_lifecycle_payload_hash
        `,
        [
          deal.orderId,
          deal.buyerOrganizationId,
          deal.supplierOrganizationId,
          deal.title,
          deal.description,
          deal.amount,
          deal.createdBy,
          now,
          deal.acceptedBy,
          deal.lifecycleEventId,
          deal.lifecycleHash,
        ],
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
            $1,
            'procure-to-pay-lifecycle-event.v1',
            $2,
            $2,
            'demo-seed-request',
            $3,
            $3,
            'delivery',
            'deliveryEvidenceSubmitted',
            $4,
            'actorContext',
            'delivery',
            $5,
            'success',
            $6,
            'json-stable-v1',
            '{"demo": true, "proofOnly": true}'::jsonb
          )
          ON CONFLICT (event_id) DO NOTHING
        `,
        [deal.deliveryEventId, now, deal.orderId, deal.acceptedBy, deal.deliveryEvidenceId, deal.deliveryHash],
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
          VALUES ($1, $2, $3, $4, 'fabric-local', 'procurement-channel', 'audit-anchor', $5, $5)
          ON CONFLICT (event_id)
          DO UPDATE SET
            anchor_status = EXCLUDED.anchor_status,
            updated_at = EXCLUDED.updated_at
        `,
        [deal.deliveryEventId, deal.deliveryHash, `sha256:${deal.orderId}`, deal.anchorStatus, now],
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
          VALUES ($1, $2, $3, $4, $5, 'deliveryNote', $6, $7, $8, $9, 'metadataRecorded', $10, $11, $10, $11, $12, 'fabric-local', 'procurement-channel', 'audit-anchor')
          ON CONFLICT (evidence_id)
          DO UPDATE SET
            evidence_reference = EXCLUDED.evidence_reference,
            evidence_hash = EXCLUDED.evidence_hash,
            notes = EXCLUDED.notes,
            submitted_at = EXCLUDED.submitted_at,
            verification_status = EXCLUDED.verification_status,
            blockchain_anchor_status = EXCLUDED.blockchain_anchor_status
        `,
        [
          deal.deliveryEvidenceId,
          deal.orderId,
          deal.buyerOrganizationId,
          deal.supplierOrganizationId,
          deal.acceptedBy,
          `delivery-ref:${deal.supplierOrganizationId}:${deal.orderId}`,
          `sha256:${deal.deliveryEvidenceId}-hash`,
          'Safe delivery metadata for pilot-style company ledger validation. No raw documents are stored in this seed.',
          now,
          deal.deliveryEventId,
          deal.deliveryHash,
          deal.anchorStatus,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${demoOrganizationList.length} organization(s), ${demoAccounts.length} demo account(s), procurement orders, delivery evidence, proof metadata, and demo escrow.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(error => {
  if (error instanceof Error) {
    console.error(error.message || error.stack || String(error));
  } else {
    console.error(typeof error === 'string' ? error : JSON.stringify(error));
  }
  process.exit(1);
});
