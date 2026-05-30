import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { PostgresOnboardingCaseRepository } from './postgres-onboarding-case-repository.js';
import type { OnboardingCase } from '../domain/onboarding-case.js';

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePostgresExecutor implements PostgresExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly responses: QueryResultRow[][]) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) {
    this.queries.push({ text, values });
    const rows = (this.responses.shift() ?? []) as T[];
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

const approvedCase: OnboardingCase = {
  id: 'kyc-case-postgres-1',
  memberOrganizationId: 'supplier-org',
  kyc: {
    legalName: 'Barakah Supplies Sdn Bhd',
    registrationNumber: 'REG-SUPPLIER-1',
    countryCode: 'MY',
    businessType: 'smeSupplier',
  },
  aml: {
    declaredBusinessActivity: 'Packaging supplies',
    expectedMonthlyTransactionValue: '100000.00',
    declaredSanctionsExposure: false,
    declaredPepExposure: false,
    riskSummary: 'Low risk demo supplier.',
  },
  evidenceReferences: [
    {
      type: 'companyRegistration',
      name: 'Registration metadata',
      uri: 'demo://registration',
      mediaType: 'application/json',
      checksum: `sha256:${'a'.repeat(64)}`,
    },
    {
      type: 'authorizedRepresentativeIdentity',
      name: 'Representative metadata',
      uri: 'demo://representative',
      mediaType: 'application/json',
    },
    {
      type: 'amlDeclaration',
      name: 'AML declaration metadata',
      uri: 'demo://aml',
      mediaType: 'application/json',
    },
  ],
  status: 'approved',
  submittedByUserId: 'supplier-user',
  createdAt: '2026-05-23T10:00:00.000Z',
  updatedAt: '2026-05-23T11:00:00.000Z',
  decision: {
    outcome: 'pass',
    rationale: 'Approved for procurement workflow.',
    reasonCodes: [],
    decidedByUserId: 'compliance-user',
    decidedAt: '2026-05-23T11:00:00.000Z',
  },
};

const approvedCaseRow = {
  case_id: approvedCase.id,
  member_organization_id: approvedCase.memberOrganizationId,
  kyc: approvedCase.kyc,
  aml: approvedCase.aml,
  evidence_references: approvedCase.evidenceReferences,
  status: approvedCase.status,
  submitted_by_user_id: approvedCase.submittedByUserId,
  created_at: new Date(approvedCase.createdAt),
  updated_at: new Date(approvedCase.updatedAt),
  decision: {
    outcome: approvedCase.decision!.outcome,
    rationale: approvedCase.decision!.rationale,
    reasonCodes: approvedCase.decision!.reasonCodes,
  },
  decided_by_user_id: approvedCase.decision!.decidedByUserId,
  decided_at: new Date(approvedCase.decision!.decidedAt),
  decision_outcome: approvedCase.decision!.outcome,
};

test('PostgresOnboardingCaseRepository saves safe KYC/AML metadata without raw document payloads', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresOnboardingCaseRepository(db);

  await repository.save(approvedCase);

  assert.match(db.queries[0].text, /INSERT INTO kyc_aml_onboarding_cases/);
  assert.strictEqual(db.queries[0].values?.[0], approvedCase.id);
  assert.strictEqual(db.queries[0].values?.[5], approvedCase.status);
  assert.strictEqual(db.queries[0].values?.[10], approvedCase.decision?.decidedByUserId);
  assert.strictEqual((approvedCase as OnboardingCase & { rawKycDocument?: unknown }).rawKycDocument, undefined);
});

test('PostgresOnboardingCaseRepository maps decided case rows for eligibility reads', async () => {
  const db = new FakePostgresExecutor([[approvedCaseRow]]);
  const repository = new PostgresOnboardingCaseRepository(db);

  const found = await repository.findLatestByOrganizationId(approvedCase.memberOrganizationId);

  assert.strictEqual(found?.id, approvedCase.id);
  assert.strictEqual(found?.status, 'approved');
  assert.strictEqual(found?.decision?.outcome, 'pass');
  assert.strictEqual(found?.decision?.decidedAt, approvedCase.decision?.decidedAt);
  assert.match(db.queries[0].text, /ORDER BY updated_at DESC, case_id DESC/);
});

test('PostgresOnboardingCaseRepository finds open submitted cases only', async () => {
  const submittedRow = {
    ...approvedCaseRow,
    status: 'submitted',
    decision: null,
    decided_by_user_id: null,
    decided_at: null,
    decision_outcome: null,
  };
  const db = new FakePostgresExecutor([[submittedRow]]);
  const repository = new PostgresOnboardingCaseRepository(db);

  const openCase = await repository.findOpenCaseByOrganizationId(approvedCase.memberOrganizationId);

  assert.strictEqual(openCase?.status, 'submitted');
  assert.strictEqual(openCase?.decision, undefined);
  assert.match(db.queries[0].text, /status = 'submitted'/);
});
