import type { MemberOrganization } from '../domain/member-organization.js';
import { createMemberOrganizationDraft } from '../domain/member-organization.js';
import type { MemberOrganizationRepository } from './member-organization-repository.js';

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

export type CreateMemberOrgResult = 
  | { status: 'invalidInput'; issues: string[] }
  | { status: 'draftPrepared'; organization: MemberOrganization };

export async function createMemberOrganization(input: CreateMemberOrgInput, repository: MemberOrganizationRepository): Promise<CreateMemberOrgResult> {
  // Trim all string fields
  const trimmedInput = {
    registrationNumber: input.registrationNumber.trim(),
    legalName: input.legalName.trim(),
    displayName: input.displayName?.trim() || undefined,
    organizationType: input.organizationType.trim(),
    businessType: input.businessType?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    contactPhone: input.contactPhone?.trim() || undefined,
    countryCode: input.countryCode?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  };

  // Check for empty required fields after trimming
  const issues: string[] = [];
  
  if (!trimmedInput.registrationNumber) {
    issues.push('Registration number must not be empty');
  }
  
  if (!trimmedInput.legalName) {
    issues.push('Legal name must not be empty');
  }
  
  if (!trimmedInput.organizationType) {
    issues.push('Organization type must not be empty');
  }

  // Return validation errors if any
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  // Create domain draft to validate structure
  const draft = createMemberOrganizationDraft(trimmedInput);

  // Save the draft through the repository
  await repository.saveDraft(draft);

  // Return the prepared draft
  return { status: 'draftPrepared', organization: draft };
}
