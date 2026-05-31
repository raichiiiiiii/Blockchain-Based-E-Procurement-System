import { useEffect, useMemo, useState } from 'react';
import {
  completeTask,
  createCompanyLedgerExport,
  createSavedView,
  getCompanyProductivitySummary,
  listNotifications,
  listSavedViews,
} from '../api/productivity';
import { listCompanyChannelMatrix } from '../api/organization-network';
import CompanyProofStatusBadge from '../components/organization/CompanyProofStatusBadge';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { CompanyChannelMatrixEntry } from '../types/organization-network';
import type {
  CompanyLedgerExportManifest,
  CompanyProductivitySummary,
  NotificationCenterItem,
  SavedWorkspaceView,
} from '../types/productivity';

type CompanyProductivityPageProps = {
  session: AuthenticatedFrontendSession;
};

function formatLabel(value?: string): string {
  if (!value) {
    return 'Not recorded';
  }

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

function stateTone(state: string): StatusTone {
  switch (state) {
    case 'complete':
    case 'eligible':
    case 'ready':
    case 'verified':
    case 'anchored':
      return 'success';
    case 'pending':
    case 'open':
      return 'pending';
    case 'blocked':
    case 'missing':
    case 'failed':
    case 'mismatch':
      return 'danger';
    case 'unavailable':
    case 'notFound':
      return 'info';
    default:
      return 'neutral';
  }
}

function CompanyProductivityPage({ session }: CompanyProductivityPageProps) {
  const [summary, setSummary] = useState<CompanyProductivitySummary | undefined>();
  const [channelMatrix, setChannelMatrix] = useState<CompanyChannelMatrixEntry[]>([]);
  const [savedViews, setSavedViews] = useState<SavedWorkspaceView[]>([]);
  const [notifications, setNotifications] = useState<NotificationCenterItem[]>([]);
  const [exportManifest, setExportManifest] = useState<CompanyLedgerExportManifest | undefined>();
  const [viewName, setViewName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  const openTasks = useMemo(
    () => summary?.actionInbox.filter(task => task.status === 'open') ?? [],
    [summary],
  );

  async function load() {
    setIsLoading(true);
    setError(undefined);

    try {
      const [nextSummary, nextMatrix, nextViews, nextNotifications] = await Promise.all([
        getCompanyProductivitySummary(session),
        listCompanyChannelMatrix(session),
        listSavedViews(session),
        listNotifications(session),
      ]);
      setSummary(nextSummary);
      setChannelMatrix(nextMatrix);
      setSavedViews(nextViews);
      setNotifications(nextNotifications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Company productivity workspace is unavailable');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [session.sessionId]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId, session);
      await load();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : 'Task update failed');
    }
  };

  const handleSaveView = async () => {
    try {
      const savedView = await createSavedView({
        name: viewName || 'Supervisor review view',
        filter: 'open tasks and proof exceptions',
      }, session);
      setSavedViews(current => [savedView, ...current]);
      setViewName('');
    } catch (viewError) {
      setError(viewError instanceof Error ? viewError.message : 'Saved view could not be created');
    }
  };

  const handleExport = async () => {
    try {
      setExportManifest(await createCompanyLedgerExport(session));
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Export summary could not be created');
    }
  };

  if (isLoading) {
    return (
      <section className="workspace-panel">
        <h2>Productivity</h2>
        <p>Loading company tasks, budget flow, partner matrix, and notifications.</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="workspace-panel">
        <h2>Productivity</h2>
        {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      </section>
    );
  }

  return (
    <div className="company-productivity-page">
      <section className="proof-surface-header" aria-label="Company Productivity">
        <p className="dashboard-role-label">Company Productivity</p>
        <h2>Work, money, and evidence readiness</h2>
        <p>Track company-safe budget signals, action items, partner proof scope, and export readiness without exposing private documents or payment credentials.</p>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      <div className="productivity-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Money tracker</h3>
              <p>{summary.moneyTracker.safeAmountLabel}</p>
            </div>
            <StatusIndicator label={summary.moneyTracker.currency} tone="info" compact />
          </div>
          <dl className="admin-definition-grid">
            <div>
              <dt>Committed orders</dt>
              <dd>{summary.moneyTracker.currency} {summary.moneyTracker.committedPurchaseOrderValue}</dd>
            </div>
            <div>
              <dt>Expected delivery</dt>
              <dd>{summary.moneyTracker.currency} {summary.moneyTracker.expectedDeliveryValue}</dd>
            </div>
            <div>
              <dt>Escrow amount</dt>
              <dd>{summary.moneyTracker.currency} {summary.moneyTracker.escrowAmount}</dd>
            </div>
            <div>
              <dt>Financing capital</dt>
              <dd>{summary.moneyTracker.currency} {summary.moneyTracker.financingCapitalAmount}</dd>
            </div>
            <div>
              <dt>Budget remaining</dt>
              <dd>{summary.moneyTracker.currency} {summary.moneyTracker.budgetRemaining}</dd>
            </div>
            <div>
              <dt>Payment signal</dt>
              <dd>{formatLabel(summary.moneyTracker.outgoingPaymentInstructionStatus)}</dd>
            </div>
          </dl>
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Next actions</h3>
              <p>{openTasks.length} open item{openTasks.length === 1 ? '' : 's'} for this company.</p>
            </div>
            <span className="admin-count">{summary.actionInbox.length}</span>
          </div>
          <div className="productivity-stack">
            {summary.actionInbox.map(task => (
              <article className="workflow-meta-panel" key={task.taskId}>
                <div className="admin-section-header">
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.description}</p>
                  </div>
                  <StatusIndicator label={formatLabel(task.status)} tone={stateTone(task.status)} compact />
                </div>
                {task.status === 'open' ? (
                  <button className="secondary-button" type="button" onClick={() => void handleCompleteTask(task.taskId)}>
                    Mark complete
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h3>Partner scope matrix</h3>
            <p>Proof scope labels are product visibility projections, not production Fabric channel claims.</p>
          </div>
          <span className="admin-count">{channelMatrix.length}</span>
        </div>
        <div className="responsive-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th>Relationship</th>
                <th>Scope</th>
                <th>Deals</th>
                <th>Proof</th>
                <th>Risk</th>
              </tr>
            </thead>
            <tbody>
              {channelMatrix.map(entry => (
                <tr key={entry.matrixId}>
                  <td>{entry.partnerDisplayName}</td>
                  <td>{formatLabel(entry.relationshipRole)}</td>
                  <td>{formatLabel(entry.channelScope)}</td>
                  <td>{entry.activeDealCount}</td>
                  <td><CompanyProofStatusBadge status={entry.latestProofStatus} /></td>
                  <td>{entry.riskSummary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="productivity-grid">
        <section className="workspace-panel">
          <h3>Pipeline</h3>
          <div className="workflow-meta-grid">
            {summary.pipeline.slice(0, 10).map(item => (
              <article className="workflow-meta-panel" key={`${item.relatedDealId}-${item.stage}`}>
                <span>{formatLabel(item.stage)}</span>
                <strong>{item.label}</strong>
                <StatusIndicator label={formatLabel(item.state)} tone={stateTone(item.state)} compact />
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <h3>Evidence checklist</h3>
          <div className="productivity-stack">
            {summary.evidenceChecklist.slice(0, 8).map(item => (
              <div className="productivity-check-row" key={item.checklistId}>
                <span>{item.label}</span>
                <StatusIndicator label={formatLabel(item.state)} tone={stateTone(item.state)} compact />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="productivity-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Saved views</h3>
              <p>Save lightweight filters for repeat supervisor or operator reviews.</p>
            </div>
            <button className="secondary-button" type="button" onClick={() => void handleSaveView()}>
              Save view
            </button>
          </div>
          <input
            className="login-input"
            value={viewName}
            onChange={event => setViewName(event.target.value)}
            placeholder="View name"
            aria-label="Saved view name"
          />
          <div className="productivity-stack">
            {savedViews.map(view => (
              <article className="workflow-meta-panel" key={view.viewId}>
                <strong>{view.name}</strong>
                <p>{view.filter}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Export summary</h3>
              <p>Generate a safe manifest hash for the company ledger projection.</p>
            </div>
            <button className="primary-button" type="button" onClick={() => void handleExport()}>
              Export summary
            </button>
          </div>
          {exportManifest ? (
            <dl className="admin-definition-grid">
              <div>
                <dt>Export</dt>
                <dd>{exportManifest.exportId}</dd>
              </div>
              <div>
                <dt>Items</dt>
                <dd>{exportManifest.itemCount}</dd>
              </div>
              <div>
                <dt>Manifest hash</dt>
                <dd><code>{exportManifest.manifestHash}</code></dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{formatLabel(exportManifest.status)}</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-product-state">No export summary generated in this session.</div>
          )}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h3>Notifications</h3>
            <p>Local notification outbox view. No real email delivery is claimed.</p>
          </div>
          <span className="admin-count">{notifications.length}</span>
        </div>
        <div className="workflow-meta-grid">
          {notifications.map(notification => (
            <article className="workflow-meta-panel" key={notification.notificationId}>
              <span>{formatLabel(notification.status)}</span>
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CompanyProductivityPage;
