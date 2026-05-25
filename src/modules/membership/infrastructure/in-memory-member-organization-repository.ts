import type { MemberOrganization, MemberOrganizationStatus } from '../domain/member-organization.js';
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

  async findAll(): Promise<PersistedMemberOrganizationDraft[]> {
    return this.drafts.map(draft => ({ ...draft }));
  }

  async findById(id: string): Promise<PersistedMemberOrganizationDraft | null> {
    const draft = this.drafts.find(draft => draft.id === id);
    return draft ? { ...draft } : null;
  }

  async findByRegistrationNumber(registrationNumber: string): Promise<PersistedMemberOrganizationDraft | null> {
    const draft = this.drafts.find(draft => draft.registrationNumber === registrationNumber);
    return draft ? { ...draft } : null;
  }

  async updateStatus(id: string, status: MemberOrganizationStatus): Promise<PersistedMemberOrganizationDraft | null> {
    const index = this.drafts.findIndex(draft => draft.id === id);
    if (index === -1) {
      return null;
    }

    this.drafts[index] = {
      ...this.drafts[index],
      status,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.drafts[index] };
  }
}
