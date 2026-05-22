import type { OnboardingCase } from '../domain/onboarding-case.js';
import type { OnboardingCaseRepository as CreateOnboardingCaseRepository } from '../application/create-onboarding-case.js';
import type { OnboardingCaseRepository as RecordDecisionRepository } from '../application/record-onboarding-review-decision.js';

export type OnboardingCaseRepository = CreateOnboardingCaseRepository & RecordDecisionRepository;

export class InMemoryOnboardingCaseRepository implements OnboardingCaseRepository {
  private readonly cases: OnboardingCase[] = [];

  async save(onboardingCase: OnboardingCase): Promise<void> {
    // Check if case already exists
    const existingIndex = this.cases.findIndex(c => c.id === onboardingCase.id);
    if (existingIndex >= 0) {
      this.cases[existingIndex] = onboardingCase;
    } else {
      this.cases.push(onboardingCase);
    }
  }

  async findById(id: string): Promise<OnboardingCase | null> {
    const onboardingCase = this.cases.find(c => c.id === id);
    return onboardingCase || null;
  }

  async findOpenCaseByOrganizationId(organizationId: string): Promise<OnboardingCase | null> {
    // For now, any 'submitted' case is considered open
    const openCase = this.cases.find(
      c => c.memberOrganizationId === organizationId && c.status === 'submitted'
    );
    return openCase || null;
  }
}
