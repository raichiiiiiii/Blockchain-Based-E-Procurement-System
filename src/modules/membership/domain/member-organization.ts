export type MemberOrganizationStatus =
  | 'pendingReview'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'deleted';

export const memberOrganizationStatuses: readonly MemberOrganizationStatus[] = [
  'pendingReview',
  'active',
  'inactive',
  'suspended',
  'deleted',
];

export function isMemberOrganizationStatus(value: string): value is MemberOrganizationStatus {
  return memberOrganizationStatuses.includes(value as MemberOrganizationStatus);
}

export type MemberOrganization = {
  registrationNumber: string;
  legalName: string;
  displayName?: string;
  organizationType: string;
  businessType?: string;
  contactEmail?: string;
  contactPhone?: string;
  countryCode?: string;
  notes?: string;
  status: MemberOrganizationStatus;
};

export function createMemberOrganizationDraft(input: {
  registrationNumber: string;
  legalName: string;
  displayName?: string;
  organizationType: string;
  businessType?: string;
  contactEmail?: string;
  contactPhone?: string;
  countryCode?: string;
  notes?: string;
}): MemberOrganization {
  return {
    registrationNumber: input.registrationNumber,
    legalName: input.legalName,
    displayName: input.displayName,
    organizationType: input.organizationType,
    businessType: input.businessType,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    countryCode: input.countryCode,
    notes: input.notes,
    status: 'pendingReview'
  };
}
