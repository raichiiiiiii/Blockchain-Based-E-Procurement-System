import type { MemberOrganization } from '../domain/member-organization.js';

export type PersistedMemberOrganizationDraft = MemberOrganization & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface MemberOrganizationRepository {
  saveDraft(organization: MemberOrganization): Promise<PersistedMemberOrganizationDraft>;
  findById(id: string): Promise<PersistedMemberOrganizationDraft | null>;
}
