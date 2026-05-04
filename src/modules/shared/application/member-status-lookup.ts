export type MemberOrganizationAccessStatus =
  | 'pendingReview'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'deleted';

export interface MemberStatusLookup {
  getMemberOrganizationStatus(organizationId: string): Promise<MemberOrganizationAccessStatus | null>;
}
