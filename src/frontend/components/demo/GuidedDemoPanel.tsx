import type { SupportedDashboardRole } from '../../lib/dashboard-state-resolver';
import type { DashboardNavigationTarget } from '../../lib/role-navigation';

type GuidedRoute = 'landing' | 'login' | 'register' | 'dashboard';

type GuidedDemoStep = {
  id: string;
  title: string;
  actor: string;
  signInAs?: string;
  route: GuidedRoute;
  role?: SupportedDashboardRole;
  target?: DashboardNavigationTarget;
  expectedOutcome: string;
};

type GuidedDemoPanelProps = {
  route: GuidedRoute;
  isAuthenticated: boolean;
  role?: SupportedDashboardRole;
  activeTarget: DashboardNavigationTarget;
  onOpenSignIn: () => void;
  onOpenDashboardTarget: (target: DashboardNavigationTarget) => void;
  onExit: () => void;
};

const guidedDemoSteps: GuidedDemoStep[] = [
  {
    id: 'landing',
    title: 'Landing',
    actor: 'Presenter',
    route: 'landing',
    expectedOutcome: 'Open with the product positioning and show the trusted procurement evidence entry point.',
  },
  {
    id: 'sign-in',
    title: 'Sign in',
    actor: 'Administrator',
    signInAs: 'admin.demo',
    route: 'login',
    expectedOutcome: 'Choose the next demo account. The guide does not bypass authentication.',
  },
  {
    id: 'administrator',
    title: 'Administrator',
    actor: 'Administrator',
    signInAs: 'admin.demo',
    route: 'dashboard',
    role: 'administrator',
    target: 'dashboard',
    expectedOutcome: 'Show organization governance, roles, and access history before transaction activity begins.',
  },
  {
    id: 'compliance',
    title: 'Compliance',
    actor: 'Compliance Reviewer',
    signInAs: 'compliance.demo',
    route: 'dashboard',
    role: 'complianceReviewer',
    target: 'compliance',
    expectedOutcome: 'Review onboarding status and record an eligibility decision without exposing raw KYC documents.',
  },
  {
    id: 'buyer-order',
    title: 'Buyer order',
    actor: 'Buyer',
    signInAs: 'buyer.demo',
    route: 'dashboard',
    role: 'buyer',
    target: 'orders',
    expectedOutcome: 'Create or inspect the Amanah Retail order for Barakah Supplies.',
  },
  {
    id: 'supplier-delivery',
    title: 'Supplier delivery',
    actor: 'Supplier',
    signInAs: 'supplier.demo',
    route: 'dashboard',
    role: 'supplier',
    target: 'delivery-evidence',
    expectedOutcome: 'Acknowledge the order and record safe delivery evidence metadata with a proof hash.',
  },
  {
    id: 'buyer-escrow',
    title: 'Buyer escrow',
    actor: 'Buyer',
    signInAs: 'buyer.demo',
    route: 'dashboard',
    role: 'buyer',
    target: 'escrow',
    expectedOutcome: 'Review delivery evidence, create escrow, and inspect proof-ready lifecycle metadata.',
  },
  {
    id: 'auditor-proof',
    title: 'Auditor proof',
    actor: 'Auditor',
    signInAs: 'auditor.demo',
    route: 'dashboard',
    role: 'auditor',
    target: 'blockchain-proof',
    expectedOutcome: 'Verify proof metadata and keep verified, mismatch, not found, and unavailable states distinct.',
  },
  {
    id: 'shariah-review',
    title: 'Shariah Review',
    actor: 'Shariah Reviewer',
    signInAs: 'shariah.demo',
    route: 'dashboard',
    role: 'shariahReviewer',
    target: 'shariah-review',
    expectedOutcome: 'Approve restricted PLS terms while keeping scope limited to the seedbed.',
  },
  {
    id: 'financing',
    title: 'Financing',
    actor: 'Financier',
    signInAs: 'financier.demo',
    route: 'dashboard',
    role: 'financier',
    target: 'financing',
    expectedOutcome: 'Inspect PLS contract status, Shariah approval reference, and distribution scenarios.',
  },
  {
    id: 'export-bundle',
    title: 'Export Bundle',
    actor: 'Regulator',
    signInAs: 'regulator.demo',
    route: 'dashboard',
    role: 'regulator',
    target: 'export-bundle',
    expectedOutcome: 'Request and verify an evidence bundle with clear integrity metadata.',
  },
];

function findCurrentStepIndex(
  route: GuidedRoute,
  role: SupportedDashboardRole | undefined,
  activeTarget: DashboardNavigationTarget,
): number {
  if (route !== 'dashboard') {
    return guidedDemoSteps.findIndex(step => step.route === route);
  }

  const exactStepIndex = guidedDemoSteps.findIndex(step => (
    step.route === 'dashboard'
    && step.role === role
    && step.target === activeTarget
  ));

  if (exactStepIndex >= 0) {
    return exactStepIndex;
  }

  const roleStepIndex = guidedDemoSteps.findIndex(step => step.route === 'dashboard' && step.role === role);
  return roleStepIndex >= 0 ? roleStepIndex : 0;
}

function getNextActionLabel(nextStep: GuidedDemoStep | undefined, role: SupportedDashboardRole | undefined): string {
  if (!nextStep) {
    return 'Review limitations';
  }

  if (nextStep.route === 'login' || (nextStep.role && nextStep.role !== role)) {
    return nextStep.signInAs ? `Sign in as ${nextStep.actor}` : 'Go to sign in';
  }

  return `Open ${nextStep.title}`;
}

function GuidedDemoPanel({
  route,
  isAuthenticated,
  role,
  activeTarget,
  onOpenSignIn,
  onOpenDashboardTarget,
  onExit,
}: GuidedDemoPanelProps) {
  const currentStepIndex = findCurrentStepIndex(route, role, activeTarget);
  const currentStep = guidedDemoSteps[currentStepIndex] ?? guidedDemoSteps[0];
  const nextStep = guidedDemoSteps[currentStepIndex + 1];
  const currentTargetPending = Boolean(
    currentStep.route === 'dashboard'
    && currentStep.role === role
    && currentStep.target
    && currentStep.target !== activeTarget,
  );

  const handlePrimaryAction = () => {
    if (currentTargetPending && currentStep.target) {
      onOpenDashboardTarget(currentStep.target);
      return;
    }

    if (!nextStep) {
      return;
    }

    if (nextStep.route === 'login' || !isAuthenticated || (nextStep.role && nextStep.role !== role)) {
      onOpenSignIn();
      return;
    }

    if (nextStep.target) {
      onOpenDashboardTarget(nextStep.target);
    }
  };

  return (
    <aside className="guided-demo-panel" aria-label="Walkthrough" aria-live="polite">
      <div className="guided-demo-header">
        <div>
          <span>Walkthrough</span>
          <strong>{currentStep.title}</strong>
        </div>
        <button className="guided-demo-close" type="button" onClick={onExit} aria-label="Close walkthrough">
          Close
        </button>
      </div>

      <div className="guided-demo-progress" aria-label="Walkthrough progress">
        {guidedDemoSteps.map((step, index) => (
          <span
            aria-hidden="true"
            className={index <= currentStepIndex ? 'guided-demo-dot guided-demo-dot-active' : 'guided-demo-dot'}
            key={step.id}
          />
        ))}
      </div>

      <dl className="guided-demo-details">
        <div>
          <dt>Actor</dt>
          <dd>{currentStep.actor}</dd>
        </div>
        {currentStep.signInAs && (
          <div>
            <dt>Sign in as</dt>
            <dd>{currentStep.signInAs}</dd>
          </div>
        )}
        <div>
          <dt>Expected outcome</dt>
          <dd>{currentStep.expectedOutcome}</dd>
        </div>
      </dl>

      <div className="guided-demo-next">
        <span>Next</span>
        <strong>{nextStep ? nextStep.title : 'Known limitations'}</strong>
        <p>
          {nextStep
            ? `${nextStep.actor}${nextStep.signInAs ? ` (${nextStep.signInAs})` : ''}`
            : 'Close by stating that this is supervisor demo ready, not pilot-ready or commercial-ready.'}
        </p>
      </div>

      {nextStep && (
        <button className="button button-primary button-full" type="button" onClick={handlePrimaryAction}>
          {currentTargetPending ? `Open ${currentStep.title}` : getNextActionLabel(nextStep, role)}
        </button>
      )}
    </aside>
  );
}

export default GuidedDemoPanel;
