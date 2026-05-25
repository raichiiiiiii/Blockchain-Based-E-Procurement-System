import type { DashboardNavigationTarget } from '../lib/role-navigation';
import EscrowDetailPage from './EscrowDetailPage';

type BuyerDashboardProps = {
  activeTarget: DashboardNavigationTarget;
};

function BuyerDashboard({ activeTarget }: BuyerDashboardProps) {
  if (activeTarget === 'orders') {
    return (
      <section className="workspace-panel">
        <h2>Orders</h2>
        <p>Accepted orders will appear here when procurement records are connected.</p>
        <div className="empty-product-state">No active orders are available for this demo account.</div>
      </section>
    );
  }

  if (activeTarget === 'escrow') {
    return <EscrowDetailPage />;
  }

  if (activeTarget === 'blockchain-proof') {
    return (
      <EscrowDetailPage />
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Profile and notification preferences will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Buyer operations</h2>
        <p>Track order readiness, escrow preparation, and proof availability from one workspace.</p>
      </section>
      <section className="metric-panel">
        <span>Orders</span>
        <strong>0</strong>
        <p>No accepted orders are available for this demo account.</p>
      </section>
      <section className="metric-panel">
        <span>Escrow</span>
        <strong>Pending</strong>
        <p>Escrow creation starts after an accepted order is selected.</p>
      </section>
      <section className="metric-panel">
        <span>Proof</span>
        <strong>Unavailable</strong>
        <p>Proof status is shown only for events with anchor metadata.</p>
      </section>
    </div>
  );
}

export default BuyerDashboard;
