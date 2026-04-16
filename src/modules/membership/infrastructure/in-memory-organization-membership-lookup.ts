import type { OrganizationMembershipLookup } from '../../shared/application/organization-membership-lookup.js';

interface UserOrganizationPair {
  userId: string;
  organizationId: string;
}

interface InMemoryOrganizationMembershipLookupOptions {
  memberships?: UserOrganizationPair[];
}

export class InMemoryOrganizationMembershipLookup implements OrganizationMembershipLookup {
  private readonly memberships: Set<string>;

  constructor(options: InMemoryOrganizationMembershipLookupOptions = {}) {
    const pairs = options.memberships ?? [];
    this.memberships = new Set(
      pairs.map(pair => `${pair.userId}:${pair.organizationId}`)
    );
  }

  async isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean> {
    return this.memberships.has(`${userId}:${organizationId}`);
  }
}
