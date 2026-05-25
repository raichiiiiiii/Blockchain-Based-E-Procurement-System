export type CreateMemberOrganizationRequest = {
  registrationNumber: string;
  legalName: string;
  displayName?: string;
  organizationType: string;
  businessType?: string;
  contactEmail?: string;
  contactPhone?: string;
  countryCode?: string;
  notes?: string;
};

export type MemberOrganizationStatus =
  | 'pendingReview'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'deleted';

export type MemberOrganizationResponse = {
  id: string;
  registrationNumber: string;
  legalName: string;
  displayName?: string;
  organizationType: string;
  businessType?: string;
  status: MemberOrganizationStatus;
  createdAt?: string;
  updatedAt?: string;
};
