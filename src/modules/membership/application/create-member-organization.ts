export type CreateMemberOrgInput = {
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

export type CreateMemberOrgResult = {
  status: 'notImplemented';
};

export async function createMemberOrganization(_input: CreateMemberOrgInput): Promise<CreateMemberOrgResult> {
  // Stub implementation - does nothing in this slice
  return { status: 'notImplemented' };
}
