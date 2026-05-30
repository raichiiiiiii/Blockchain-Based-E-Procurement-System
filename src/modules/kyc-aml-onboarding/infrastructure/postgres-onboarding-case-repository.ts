import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toRecord, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { OnboardingCaseRepository } from '../application/create-onboarding-case.js';
import type {
  AMLData,
  DecisionMetadata,
  DecisionOutcome,
  EvidenceReference,
  KYCData,
  OnboardingCase,
  OnboardingCaseStatus,
  ReasonCode,
} from '../domain/onboarding-case.js';

type OnboardingCaseRow = {
  case_id: string;
  member_organization_id: string;
  kyc: unknown;
  aml: unknown;
  evidence_references: unknown;
  status: OnboardingCaseStatus;
  submitted_by_user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  decision: unknown | null;
  decided_by_user_id: string | null;
  decided_at: Date | string | null;
  decision_outcome: DecisionOutcome | null;
};

function toKycData(value: unknown): KYCData {
  const record = toRecord(value) ?? {};
  return {
    legalName: String(record.legalName ?? ''),
    registrationNumber: String(record.registrationNumber ?? ''),
    countryCode: String(record.countryCode ?? ''),
    businessType: String(record.businessType ?? ''),
  };
}

function toAmlData(value: unknown): AMLData {
  const record = toRecord(value) ?? {};
  return {
    declaredBusinessActivity: String(record.declaredBusinessActivity ?? ''),
    expectedMonthlyTransactionValue: String(record.expectedMonthlyTransactionValue ?? ''),
    declaredSanctionsExposure: Boolean(record.declaredSanctionsExposure),
    declaredPepExposure: Boolean(record.declaredPepExposure),
    riskSummary: typeof record.riskSummary === 'string' ? record.riskSummary : undefined,
  };
}

function toEvidenceReferences(value: unknown): EvidenceReference[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => toRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => ({
      type: item.type as EvidenceReference['type'],
      name: String(item.name ?? ''),
      uri: String(item.uri ?? ''),
      mediaType: String(item.mediaType ?? ''),
      checksum: typeof item.checksum === 'string' ? item.checksum : undefined,
    }));
}

function toDecision(row: OnboardingCaseRow): DecisionMetadata | undefined {
  const decision = toRecord(row.decision);
  if (!decision || !row.decision_outcome || !row.decided_by_user_id || !row.decided_at) {
    return undefined;
  }

  return {
    outcome: row.decision_outcome,
    rationale: String(decision.rationale ?? ''),
    reasonCodes: toStringArray(decision.reasonCodes) as ReasonCode[],
    decidedByUserId: row.decided_by_user_id,
    decidedAt: toIsoString(row.decided_at),
  };
}

function toOnboardingCase(row: OnboardingCaseRow): OnboardingCase {
  return {
    id: row.case_id,
    memberOrganizationId: row.member_organization_id,
    kyc: toKycData(row.kyc),
    aml: toAmlData(row.aml),
    evidenceReferences: toEvidenceReferences(row.evidence_references),
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    decision: toDecision(row),
  };
}

export class PostgresOnboardingCaseRepository implements OnboardingCaseRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(onboardingCase: OnboardingCase): Promise<void> {
    await this.db.query(
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
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
        ON CONFLICT (case_id)
        DO UPDATE SET
          member_organization_id = EXCLUDED.member_organization_id,
          kyc = EXCLUDED.kyc,
          aml = EXCLUDED.aml,
          evidence_references = EXCLUDED.evidence_references,
          status = EXCLUDED.status,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          decision = EXCLUDED.decision,
          decided_by_user_id = EXCLUDED.decided_by_user_id,
          decided_at = EXCLUDED.decided_at,
          decision_outcome = EXCLUDED.decision_outcome
      `,
      [
        onboardingCase.id,
        onboardingCase.memberOrganizationId,
        JSON.stringify(onboardingCase.kyc),
        JSON.stringify(onboardingCase.aml),
        JSON.stringify(onboardingCase.evidenceReferences),
        onboardingCase.status,
        onboardingCase.submittedByUserId,
        onboardingCase.createdAt,
        onboardingCase.updatedAt,
        onboardingCase.decision ? JSON.stringify({
          outcome: onboardingCase.decision.outcome,
          rationale: onboardingCase.decision.rationale,
          reasonCodes: onboardingCase.decision.reasonCodes ?? [],
        }) : null,
        onboardingCase.decision?.decidedByUserId ?? null,
        onboardingCase.decision?.decidedAt ?? null,
        onboardingCase.decision?.outcome ?? null,
      ],
    );
  }

  async findById(id: string): Promise<OnboardingCase | null> {
    const result = await this.db.query<OnboardingCaseRow>(
      'SELECT * FROM kyc_aml_onboarding_cases WHERE case_id = $1',
      [id],
    );

    return result.rows[0] ? toOnboardingCase(result.rows[0]) : null;
  }

  async findOpenCaseByOrganizationId(organizationId: string): Promise<OnboardingCase | null> {
    const result = await this.db.query<OnboardingCaseRow>(
      `
        SELECT *
        FROM kyc_aml_onboarding_cases
        WHERE member_organization_id = $1
          AND status = 'submitted'
        ORDER BY updated_at DESC, case_id DESC
        LIMIT 1
      `,
      [organizationId],
    );

    return result.rows[0] ? toOnboardingCase(result.rows[0]) : null;
  }

  async findLatestByOrganizationId(memberOrganizationId: string): Promise<OnboardingCase | null> {
    const result = await this.db.query<OnboardingCaseRow>(
      `
        SELECT *
        FROM kyc_aml_onboarding_cases
        WHERE member_organization_id = $1
        ORDER BY updated_at DESC, case_id DESC
        LIMIT 1
      `,
      [memberOrganizationId],
    );

    return result.rows[0] ? toOnboardingCase(result.rows[0]) : null;
  }
}
