import type { MemberOrganization } from '../domain/member-organization.js';
import type { MemberOrganizationRepository, PersistedMemberOrganizationDraft } from '../application/member-organization-repository.js';

export class InMemoryMemberOrganizationRepository implements MemberOrganizationRepository {
  private readonly drafts: PersistedMemberOrganizationDraft[] = [];

  async saveDraft(organization: MemberOrganization): Promise<PersistedMemberOrganizationDraft> {
    const now = new Date().toISOString();
    const persistedDraft: PersistedMemberOrganizationDraft = {
      ...organization,
      id: `org_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: now,
      updatedAt: now
    };
    
    this.drafts.push(persistedDraft);
    return persistedDraft;
  }
}
