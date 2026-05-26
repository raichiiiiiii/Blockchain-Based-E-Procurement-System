import { useEffect, useMemo, useState } from 'react';
import { getSecurityAlerts, type SecurityAlert, type SecurityAlertsSummary } from '../api/security-alerts';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

type SecurityDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

function severityClass(severity: SecurityAlert['severity']): string {
  if (severity === 'critical') {
    return 'admin-status admin-status-danger';
  }

  if (severity === 'warning') {
    return 'admin-status admin-status-pending';
  }

  return 'admin-status admin-status-muted';
}

function alertTypeLabel(type: SecurityAlert['alertType']): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());
}

function AlertList({ alerts }: { alerts: SecurityAlert[] }) {
  if (alerts.length === 0) {
    return <div className="empty-product-state">No alerts are currently visible for this view.</div>;
  }

  return (
    <div className="order-list">
      {alerts.map(alert => (
        <div className="order-row" key={alert.alertId}>
          <span>{alertTypeLabel(alert.alertType)}</span>
          <strong>{alert.source === 'accessAudit' ? 'Denied action' : 'Proof failure'}</strong>
          <small>{alert.occurredAt}</small>
          <p>{alert.message}</p>
          {alert.relatedEventId ? <code>{alert.relatedEventId}</code> : null}
          {alert.relatedProofStatus ? <span className="admin-status admin-status-pending">{alert.relatedProofStatus}</span> : null}
          <span className={severityClass(alert.severity)}>{alert.severity}</span>
        </div>
      ))}
    </div>
  );
}

function SecurityDashboard({ activeTarget, session }: SecurityDashboardProps) {
  const [summary, setSummary] = useState<SecurityAlertsSummary>({
    generatedAt: new Date().toISOString(),
    deniedActions: [],
    proofFailures: [],
    items: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  const sessionId = session.sessionId;
  const sessionSource = session.source;
  const sessionToken = session.sessionToken;

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError(undefined);

    void getSecurityAlerts(session)
      .then(nextSummary => {
        if (isCurrent) {
          setSummary(nextSummary);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError('Security alerts are unavailable right now.');
          setSummary({
            generatedAt: new Date().toISOString(),
            deniedActions: [],
            proofFailures: [],
            items: [],
          });
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [sessionId, sessionSource, sessionToken]);

  const allAlerts = useMemo(() => [
    ...summary.deniedActions,
    ...summary.proofFailures,
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)), [summary]);

  if (activeTarget === 'access-alerts') {
    return (
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Access Alerts</h2>
            <p>Review denied and suspicious access attempts using safe event metadata.</p>
          </div>
          <span className="admin-count">{summary.deniedActions.length}</span>
        </div>
        {isLoading ? <div className="empty-product-state">Loading security alerts...</div> : null}
        {loadError ? <div className="admin-alert admin-alert-error" role="alert">{loadError}</div> : null}
        <AlertList alerts={summary.deniedActions} />
      </section>
    );
  }

  if (activeTarget === 'proof-failures') {
    return (
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Proof Failures</h2>
            <p>Track anchoring failures, mismatches, and unavailable verification states separately from verified proof.</p>
          </div>
          <span className="admin-count">{summary.proofFailures.length}</span>
        </div>
        {isLoading ? <div className="empty-product-state">Loading proof alerts...</div> : null}
        {loadError ? <div className="admin-alert admin-alert-error" role="alert">{loadError}</div> : null}
        <AlertList alerts={summary.proofFailures} />
      </section>
    );
  }

  if (activeTarget === 'denied-actions') {
    return (
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Denied Actions</h2>
            <p>Inspect blocked authorization attempts without granting administrator permissions.</p>
          </div>
          <span className="admin-count">{summary.deniedActions.length}</span>
        </div>
        {isLoading ? <div className="empty-product-state">Loading denied actions...</div> : null}
        {loadError ? <div className="admin-alert admin-alert-error" role="alert">{loadError}</div> : null}
        <AlertList alerts={summary.deniedActions} />
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Security notification preferences will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Security Status</h2>
        <p>Monitor denied actions and proof anomalies without access to unrelated business controls.</p>
        {loadError ? <div className="admin-alert admin-alert-error" role="alert">{loadError}</div> : null}
      </section>
      <section className="metric-panel">
        <span>Open Alerts</span>
        <strong>{allAlerts.length}</strong>
        <p>Recent denied actions and proof states needing review.</p>
      </section>
      <section className="metric-panel">
        <span>Denied Actions</span>
        <strong>{summary.deniedActions.length}</strong>
        <p>Blocked requests are visible for investigation only.</p>
      </section>
      <section className="metric-panel">
        <span>Proof Failures</span>
        <strong>{summary.proofFailures.length}</strong>
        <p>Failed, mismatched, and unavailable proof remain distinct from verified proof.</p>
      </section>
    </div>
  );
}

export default SecurityDashboard;
