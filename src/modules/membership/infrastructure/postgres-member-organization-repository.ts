import { randomUUID } from 'node:crypto';
import type {
  MemberOrganizationRepository,
  PersistedMemberOrganizationDraft,
} from '../application/member-organization-repository.js';
import type { MemberOrganization } from '../domain/member-organization.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString } from '../../../infrastructure/database/postgres-row-utils.js';

type MemberOrganizationRow = {
  id: string;
  registration_number: string;
  legal_name: string;
  display_name: string | null;
  organization_type: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country_code: string | null;
  notes: string | null;
  status: 'pendingReview';
  created_at: Date | string;
  updated_at: Date | string;
};

function toPersistedDraft(row: MemberOrganizationRow): PersistedMemberOrganizationDraft {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    legalName: row.legal_name,
    displayName: row.display_name ?? undefined,
    organizationType: row.organization_type,
    businessType: row.business_type ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    countryCode: row.country_code ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export class PostgresMemberOrganizationRepository implements MemberOrganizationRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async saveDraft(organization: MemberOrganization): Promise<PersistedMemberOrganizationDraft> {
    const now = new Date().toISOString();
    const result = await this.db.query<MemberOrganizationRow>(
      `
        INSERT INTO member_organizations (
          id,
          registration_number,
          legal_name,
          display_name,
          organization_type,
          business_type,
          contact_email,
          contact_phone,
          country_code,
          notes,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        RETURNING *
      `,
      [
        `org_${randomUUID()}`,
        organization.registrationNumber,
        organization.legalName,
        organization.displayName ?? null,
        organization.organizationType,
        organization.businessType ?? null,
        organization.contactEmail ?? null,
        organization.contactPhone ?? null,
        organization.countryCode ?? null,
        organization.notes ?? null,
        organization.status,
        now,
      ],
    );

    return toPersistedDraft(result.rows[0]);
  }

  async findById(id: string): Promise<PersistedMemberOrganizationDraft | null> {
    const result = await this.db.query<MemberOrganizationRow>(
      'SELECT * FROM member_organizations WHERE id = $1',
      [id],
    );

    return result.rows[0] ? toPersistedDraft(result.rows[0]) : null;
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<PersistedMemberOrganizationDraft | null> {
    const result = await this.db.query<MemberOrganizationRow>(
      'SELECT * FROM member_organizations WHERE registration_number = $1',
      [registrationNumber],
    );

    return result.rows[0] ? toPersistedDraft(result.rows[0]) : null;
  }
}
