import { useEffect, useMemo, useState } from 'react';
import { getOpsStatus, type OpsStatusResponse } from '../api/ops-status';
import { getSecurityAlerts, type SecurityAlert, type SecurityAlertsSummary } from '../api/security-alerts';
import BlockchainStatusOverview from '../components/blockchain/BlockchainStatusOverview';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { BlockchainDisplayStatus } from '../components/status/BlockchainStatusIndicator';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';

type SecurityDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

function severityTone(severity: SecurityAlert['severity']): StatusTone {
  if (severity === 'critical') {
    return 'danger';
  }

  if (severity === 'warning') {
    return 'warning';
  }

  return 'info';
}

function alertTypeLabel(type: SecurityAlert['alertType']): string {
  return type
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());
}

function alertSourceLabel(alert: SecurityAlert): string {
  if (alert.source === 'accessAudit') {
    return 'Denied action';
  }

  if (alert.source === 'blockchainAnchor') {
    return 'Proof failure';
  }

  return 'Operational alert';
}

function proofStatusFromAlert(status?: string): BlockchainDisplayStatus {
  if (
    status === 'notAnchored' ||
    status === 'pending' ||
    status === 'anchored' ||
    status === 'failed' ||
    status === 'verified' ||
    status === 'mismatch' ||
    status === 'notFound' ||
    status === 'unavailable'
  ) {
    return status;
  }

  return 'unavailable';
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
          <strong>{alertSourceLabel(alert)}</strong>
          <small>{alert.occurredAt}</small>
          <p>{alert.message}</p>
          {alert.relatedEventId ? <code>{alert.relatedEventId}</code> : null}
          {alert.relatedProofStatus ? (
            <StatusIndicator label={alert.relatedProofStatus} tone="warning" compact />
          ) : null}
          <StatusIndicator label={alert.severity} tone={severityTone(alert.severity)} compact />
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
    operationalIncidents: [],
    items: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [opsStatus, setOpsStatus] = useState<OpsStatusResponse | undefined>();

  const sessionId = session.sessionId;
  const sessionSource = session.source;
  const sessionToken = session.sessionToken;

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setLoadError(undefined);

    void Promise.all([
      getSecurityAlerts(session),
      getOpsStatus(session).catch(() => undefined),
    ])
      .then(([nextSummary, nextOpsStatus]) => {
        if (isCurrent) {
          setSummary(nextSummary);
          setOpsStatus(nextOpsStatus);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setLoadError('Security alerts are unavailable right now.');
          setSummary({
            generatedAt: new Date().toISOString(),
            deniedActions: [],
            proofFailures: [],
            operationalIncidents: [],
            items: [],
          });
          setOpsStatus(undefined);
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
    ...summary.operationalIncidents,
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)), [summary]);

  const proofStatusItems = useMemo(() => {
    const proofAlerts = summary.proofFailures.slice(0, 5).map(alert => ({
      surface: 'Proof failure',
      label: alert.relatedEventId ?? alert.alertId,
      description: alert.message,
      status: proofStatusFromAlert(alert.relatedProofStatus),
      detail: alert.occurredAt,
    }));

    if (proofAlerts.length > 0) {
      return proofAlerts;
    }

    return [{
      surface: 'Proof failures',
      label: 'No current proof alert',
      description: 'No failed, mismatched, not found, or unavailable proof alert is currently visible.',
      status: 'notAnchored' as const,
      detail: 'This means no proof anomaly has been reported to the security read model.',
    }];
  }, [summary.proofFailures]);

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
      <BlockchainStatusOverview
        title="Blockchain proof health"
        description="Proof failures and Fabric readiness are visible as operational status only. This view does not create proof or alter records."
        fabricMode={opsStatus?.readiness.checks.fabric.mode}
        items={proofStatusItems}
      />
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
      <section className="metric-panel">
        <span>Operational Alerts</span>
        <strong>{summary.operationalIncidents.length}</strong>
        <p>Runtime dependency incidents are visible without granting mutation powers.</p>
      </section>
    </div>
  );
}

export default SecurityDashboard;
