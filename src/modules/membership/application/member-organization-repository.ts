import type { MemberOrganization } from '../domain/member-organization.js';

export interface MemberOrganizationRepository {
  saveDraft(organization: MemberOrganization): Promise<void>;
}
