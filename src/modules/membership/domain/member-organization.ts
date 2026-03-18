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
  status: 'pendingReview';
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
