import { useEffect, useState } from 'react';
import { getCompanyDashboardSummary } from '../../api/organization-network';
import type { AuthenticatedFrontendSession } from '../../lib/session-state';
import type { CompanyDashboardSummary } from '../../types/organization-network';
import CompanyProofStatusBadge from './CompanyProofStatusBadge';
import StatusIndicator, { type StatusTone } from '../status/StatusIndicator';

type CompanyContextBannerProps = {
  session: AuthenticatedFrontendSession;
  onOpenCompanyLedger: () => void;
  onOpenSettings: () => void;
};

function statusTone(status: string): StatusTone {
  switch (status) {
    case 'active':
    case 'eligible':
      return 'success';
    case 'pendingReview':
    case 'unknown':
      return 'pending';
    case 'flagged':
      return 'warning';
    case 'blocked':
    case 'suspended':
    case 'deleted':
      return 'danger';
    default:
      return 'neutral';
  }
}

function formatLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

function CompanyContextBanner({
  session,
  onOpenCompanyLedger,
  onOpenSettings,
}: CompanyContextBannerProps) {
  const [summary, setSummary] = useState<CompanyDashboardSummary | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setError(undefined);
      try {
        const nextSummary = await getCompanyDashboardSummary(session);
        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSummary(undefined);
          setError(loadError instanceof Error ? loadError.message : 'Company context is unavailable');
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [session.sessionId]);

  if (error) {
    return (
      <section className="company-context-banner company-context-banner-warning" aria-label="Company context">
        <div>
          <span className="dashboard-role-label">Company context</span>
          <strong>Company context unavailable</strong>
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="company-context-banner" aria-label="Company context">
        <div>
          <span className="dashboard-role-label">Company context</span>
          <strong>Loading company context</strong>
          <p>Resolving organization profile, relationships, and proof state.</p>
        </div>
      </section>
    );
  }

  const organizationName = summary.organization.displayName ?? summary.organization.legalName;

  return (
    <section className="company-context-banner" aria-label="Company context">
      <div className="company-context-primary">
        <span className="dashboard-role-label">Company context</span>
        <strong>{organizationName}</strong>
        <p>{summary.organization.uniqueIdentifier} - {summary.currentUser.userId}</p>
      </div>
      <div className="company-context-meta">
        <StatusIndicator
          label={formatLabel(summary.organization.status)}
          tone={statusTone(summary.organization.status)}
          compact
        />
        <StatusIndicator
          label={formatLabel(summary.organization.eligibilityStatus)}
          tone={statusTone(summary.organization.eligibilityStatus)}
          compact
        />
        <CompanyProofStatusBadge status={summary.latestProofStatus} compact />
      </div>
      <div className="company-context-roles">
        <span>{summary.currentUser.roleCodes.map(formatLabel).join(', ') || 'No role'}</span>
        <span>{summary.relationshipRoles.length} relationship{summary.relationshipRoles.length === 1 ? '' : 's'}</span>
        <span>{summary.activeDealCount} deal{summary.activeDealCount === 1 ? '' : 's'}</span>
      </div>
      <div className="company-context-actions">
        <button className="button button-secondary" type="button" onClick={onOpenCompanyLedger}>
          Open company ledger
        </button>
        <button className="button button-ghost" type="button" onClick={onOpenSettings}>
          Company settings
        </button>
      </div>
    </section>
  );
}

export default CompanyContextBanner;
