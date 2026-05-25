import type { DashboardNavigationTarget } from '../lib/role-navigation';

type AuditorDashboardProps = {
  activeTarget: DashboardNavigationTarget;
};

function AuditorDashboard({ activeTarget }: AuditorDashboardProps) {
  if (activeTarget === 'audit-trail') {
    return (
      <section className="workspace-panel">
        <h2>Audit Trail</h2>
        <p>Review access history and event sequences from the audit workspace.</p>
        <div className="audit-list">
          <span>Access History Search</span>
          <span>Event Detail</span>
          <span>Event Sequence</span>
        </div>
      </section>
    );
  }

  if (activeTarget === 'blockchain-proof') {
    return (
      <section className="workspace-panel">
        <h2>Blockchain Proof</h2>
        <p>Verification results appear only when an anchored event is selected.</p>
        <div className="empty-product-state">No event proof is selected.</div>
      </section>
    );
  }

  if (activeTarget === 'export-bundle') {
    return (
      <section className="workspace-panel">
        <h2>Export Bundle</h2>
        <p>Evidence exports will include audit records and proof metadata when available.</p>
        <div className="status-row">
          <span className="status-dot status-dot-pending" />
          <span>Choose audit records before preparing an export.</span>
        </div>
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Audit preferences and export defaults will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Audit workspace</h2>
        <p>Inspect event trails, prepare export bundles, and verify proof when anchored records exist.</p>
      </section>
      <section className="metric-panel">
        <span>Audit Trail</span>
        <strong>Ready</strong>
        <p>Use audit search and event detail tools for governed review.</p>
      </section>
      <section className="metric-panel">
        <span>Proof</span>
        <strong>Not selected</strong>
        <p>Proof verification starts from an anchored event detail.</p>
      </section>
      <section className="metric-panel">
        <span>Export Bundle</span>
        <strong>Empty</strong>
        <p>Select records before preparing an export bundle.</p>
      </section>
    </div>
  );
}

export default AuditorDashboard;
