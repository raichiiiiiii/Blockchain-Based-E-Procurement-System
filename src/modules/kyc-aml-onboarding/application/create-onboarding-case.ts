import type { OnboardingCase, KYCData, AMLData, EvidenceReference } from '../domain/onboarding-case.js';

export interface CreateOnboardingCaseInput {
  memberOrganizationId: string;
  kyc: KYCData;
  aml: AMLData;
  evidenceReferences: EvidenceReference[];
  submittedByUserId: string;
}

export interface CreateOnboardingCaseResult {
  status: 'created';
  onboardingCase: OnboardingCase;
}

export interface CreateOnboardingCaseError {
  status: 'invalidInput';
  issues: string[];
}

export type CreateOnboardingCaseResponse = CreateOnboardingCaseResult | CreateOnboardingCaseError;

export interface OnboardingCaseRepository {
  save(onboardingCase: OnboardingCase): Promise<void>;
  findById(id: string): Promise<OnboardingCase | null>;
}

export async function createOnboardingCase(
  input: CreateOnboardingCaseInput,
  repository: OnboardingCaseRepository
): Promise<CreateOnboardingCaseResponse> {
  // Validate required evidence types
  const evidenceTypes = input.evidenceReferences.map(ref => ref.type);
  const requiredEvidenceTypes: Array<'companyRegistration' | 'authorizedRepresentativeIdentity' | 'amlDeclaration'> = [
    'companyRegistration',
    'authorizedRepresentativeIdentity',
    'amlDeclaration'
  ];
  
  const missingEvidenceTypes = requiredEvidenceTypes.filter(type => !evidenceTypes.includes(type));
  
  if (missingEvidenceTypes.length > 0) {
    return {
      status: 'invalidInput',
      issues: [`Missing required evidence types: ${missingEvidenceTypes.join(', ')}`]
    };
  }
  
  // Create the onboarding case
  const now = new Date().toISOString();
  const onboardingCase: OnboardingCase = {
    id: `kyc_aml_case_${Math.random().toString(36).substring(2, 15)}`,
    memberOrganizationId: input.memberOrganizationId,
    kyc: input.kyc,
    aml: input.aml,
    evidenceReferences: input.evidenceReferences,
    status: 'submitted',
    submittedByUserId: input.submittedByUserId,
    createdAt: now,
    updatedAt: now
  };
  
  await repository.save(onboardingCase);
  
  return {
    status: 'created',
    onboardingCase
  };
}
