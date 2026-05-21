export type OnboardingCaseStatus = 'submitted';

export interface EvidenceReference {
  type: 'companyRegistration' | 'authorizedRepresentativeIdentity' | 'beneficialOwnership' | 'amlDeclaration' | 'supportingDocument';
  name: string;
  uri: string;
  mediaType: string;
  checksum?: string;
}

export interface KYCData {
  legalName: string;
  registrationNumber: string;
  countryCode: string;
  businessType: string;
}

export interface AMLData {
  declaredBusinessActivity: string;
  expectedMonthlyTransactionValue: string;
  declaredSanctionsExposure: boolean;
  declaredPepExposure: boolean;
  riskSummary?: string;
}

export interface OnboardingCase {
  id: string;
  memberOrganizationId: string;
  kyc: KYCData;
  aml: AMLData;
  evidenceReferences: EvidenceReference[];
  status: OnboardingCaseStatus;
  submittedByUserId: string;
  createdAt: string;
  updatedAt: string;
}
