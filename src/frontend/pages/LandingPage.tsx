type LandingPageProps = {
  onSignIn: () => void;
  onRegisterCompany: () => void;
  onViewDashboard: () => void;
};

const workflowSteps = [
  'Onboard trusted participants',
  'Manage purchase activity',
  'Prepare escrow controls',
  'Anchor audit proof',
];

function LandingPage({ onSignIn, onRegisterCompany, onViewDashboard }: LandingPageProps) {
  return (
    <main className="landing-page">
      <header className="public-header">
        <div className="brand-lockup" aria-label="PLS procurement platform">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>PLS Procurement</span>
        </div>
        <nav className="public-actions" aria-label="Public navigation">
          <button className="button button-ghost" type="button" onClick={onViewDashboard}>
            View dashboard
          </button>
          <button className="button button-primary" type="button" onClick={onSignIn}>
            Sign in
          </button>
          <button className="button button-secondary" type="button" onClick={onRegisterCompany}>
            Register company
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <h1>Blockchain procurement with verifiable audit proof</h1>
          <p>
            Run governed procurement activity with role-based access, escrow readiness,
            and permissioned ledger proof for sensitive lifecycle events.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" type="button" onClick={onSignIn}>
              Sign in
            </button>
            <button className="button button-secondary" type="button" onClick={onRegisterCompany}>
              Register company
            </button>
            <button className="button button-secondary" type="button" onClick={onViewDashboard}>
              View dashboard
            </button>
          </div>
        </div>

        <div className="ledger-preview" aria-label="Procurement proof preview">
          <div className="ledger-preview-header">
            <span>Order acceptance</span>
            <strong>Ready for review</strong>
          </div>
          <div className="ledger-proof-line">
            <span className="proof-dot proof-dot-green" />
            <div>
              <strong>Event hash prepared</strong>
              <span>Private terms stay off-chain</span>
            </div>
          </div>
          <div className="ledger-proof-line">
            <span className="proof-dot proof-dot-amber" />
            <div>
              <strong>Escrow checkpoint</strong>
              <span>Settlement workflow awaits approval</span>
            </div>
          </div>
          <div className="ledger-hash" aria-label="Example proof digest">
            8f31...c92a
          </div>
        </div>
      </section>

      <section className="landing-section" aria-label="Procurement workflow">
        <div className="section-heading">
          <h2>A controlled path from order to audit</h2>
          <p>Designed for buyers, auditors, and regulated finance participants.</p>
        </div>
        <div className="workflow-strip">
          {workflowSteps.map((step, index) => (
            <div className="workflow-step" key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default LandingPage;
