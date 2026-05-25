import { useState } from 'react';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import { getLocalDemoEscrowRecord, type EscrowRecord } from '../lib/escrow-client';
import EscrowDetailPage from './EscrowDetailPage';
import EscrowOverviewPage from './EscrowOverviewPage';

type BuyerDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

function BuyerDashboard({ activeTarget, session }: BuyerDashboardProps) {
  const [activeEscrow, setActiveEscrow] = useState<EscrowRecord | undefined>();

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
    return (
      <EscrowOverviewPage
        session={session}
        escrow={activeEscrow}
        onEscrowChange={setActiveEscrow}
      />
    );
  }

  if (activeTarget === 'blockchain-proof') {
    return (
      <EscrowDetailPage escrow={activeEscrow ?? getLocalDemoEscrowRecord(session)} />
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
