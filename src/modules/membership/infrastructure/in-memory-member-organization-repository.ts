import type { MemberOrganizationRepository } from '../application/member-organization-repository.js';
import type { MemberOrganization } from '../domain/member-organization.js';

export class InMemoryMemberOrganizationRepository implements MemberOrganizationRepository {
  private readonly drafts: MemberOrganization[] = [];

  async saveDraft(organization: MemberOrganization): Promise<void> {
    this.drafts.push(organization);
  }
}
