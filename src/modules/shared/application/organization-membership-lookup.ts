export interface OrganizationMembershipLookup {
  isUserMemberOfOrganization(userId: string, organizationId: string): Promise<boolean>;
}
