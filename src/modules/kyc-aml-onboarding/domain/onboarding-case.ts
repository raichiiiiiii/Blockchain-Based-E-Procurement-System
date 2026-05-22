export type OnboardingCaseStatus = 'submitted' | 'approved' | 'rejected' | 'flagged' | 'blocked';

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

export type DecisionOutcome = 'pass' | 'fail' | 'flag' | 'block';

export type ReasonCode = 
  | 'identity_verification_failed'
  | 'beneficial_ownership_unverified'
  | 'sanctions_exposure'
  | 'pep_exposure'
  | 'inconsistent_business_activity'
  | 'missing_or_invalid_evidence'
  | 'high_risk_activity'
  | 'manual_compliance_concern';

export interface DecisionMetadata {
  outcome: DecisionOutcome;
  rationale: string;
  reasonCodes?: ReasonCode[];
  decidedByUserId: string;
  decidedAt: string;
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
  decision?: DecisionMetadata;
}
