import { useMemo, useState } from 'react';
import { BackendApiError } from '../api/errors';
import {
  createExportBundle,
  verifyExportBundle,
  type CreateExportBundleRequest,
  type ExportBundleRecord,
  type ExportBundleScope,
  type ExportBundleVerificationResult,
} from '../api/export-bundles';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';

type ExportBundlePageProps = {
  session: AuthenticatedFrontendSession;
};

const scopeOptions: Array<{ value: ExportBundleScope; label: string }> = [
  { value: 'combinedAudit', label: 'Combined audit' },
  { value: 'procureToPay', label: 'Procure to pay' },
  { value: 'accessHistory', label: 'Access history' },
];

function statusTone(status: string): StatusTone {
  if (status === 'generated' || status === 'verified') {
    return 'success';
  }

  if (status === 'failed' || status === 'mismatch') {
    return 'danger';
  }

  if (status === 'unavailable' || status === 'notFound') {
    return 'info';
  }

  return 'pending';
}

function statusLabel(status: string): string {
  return status
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());
}

function scopeLabel(scope: ExportBundleScope): string {
  return scopeOptions.find(option => option.value === scope)?.label ?? statusLabel(scope);
}

function formatDateTime(value?: string): string {
  if (!value) {
    return 'Not bounded';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateRange(bundle: ExportBundleRecord): string {
  const { occurredFrom, occurredTo } = bundle.manifest.dateRange;
  return `${formatDateTime(occurredFrom)} to ${formatDateTime(occurredTo)}`;
}

function summarizeRecords(bundle: ExportBundleRecord) {
  return [
    {
      label: 'Access records',
      value: String(bundle.manifest.accessEventCount),
      detail: 'Access outcomes and request evidence references.',
    },
    {
      label: 'Lifecycle records',
      value: String(bundle.manifest.lifecycleEventCount),
      detail: 'Procurement event references and immutable hashes.',
    },
    {
      label: 'Proof references',
      value: String(bundle.manifest.anchorMetadataCount),
      detail: 'Blockchain anchor metadata associated with selected events.',
    },
  ];
}

function getProofReferences(bundle: ExportBundleRecord) {
  return bundle.manifest.records.filter(record => record.recordType === 'blockchainAnchorMetadata');
}

function ExportBundlePage({ session }: ExportBundlePageProps) {
  const [request, setRequest] = useState<CreateExportBundleRequest>({
    scope: 'combinedAudit',
    purpose: 'Supervisor evidence review',
    occurredFrom: '2026-05-25T00:00:00.000Z',
    occurredTo: '2026-05-26T00:00:00.000Z',
  });
  const [bundle, setBundle] = useState<ExportBundleRecord>();
  const [verification, setVerification] = useState<ExportBundleVerificationResult>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const summaryCards = useMemo(() => bundle ? summarizeRecords(bundle) : [], [bundle]);
  const proofReferences = useMemo(() => bundle ? getProofReferences(bundle) : [], [bundle]);
  const verificationStatus = verification ? statusLabel(verification.verificationStatus) : 'Not verified';

  const handleRequestChange = (field: keyof CreateExportBundleRequest, value: string) => {
    setRequest(current => ({
      ...current,
      [field]: value,
    }));
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setMessage(undefined);
    setError(undefined);
    setVerification(undefined);

    try {
      const created = await createExportBundle(request, session);
      setBundle(created);
      setMessage('Export bundle is ready for review.');
    } catch (caught) {
      const nextError = caught instanceof BackendApiError || caught instanceof Error
        ? caught.message
        : 'Export request failed';
      setError(nextError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!bundle) {
      return;
    }

    setIsVerifying(true);
    setError(undefined);

    try {
      setVerification(await verifyExportBundle(bundle.bundleId, session, bundle.integrity.bundleHash));
    } catch (caught) {
      const nextError = caught instanceof BackendApiError || caught instanceof Error
        ? caught.message
        : 'Bundle verification failed';
      setError(nextError);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="export-workspace">
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Export Bundle</h2>
            <p>Request a bounded audit package and inspect its manifest, integrity metadata, and verification result.</p>
          </div>
          {bundle ? <StatusIndicator label={statusLabel(bundle.status)} tone={statusTone(bundle.status)} /> : null}
        </div>

        <div className="order-action-grid">
          <div className="admin-form">
            <label>
              Scope
              <select
                value={request.scope}
                onChange={event => handleRequestChange('scope', event.target.value as ExportBundleScope)}
              >
                {scopeOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label>
              Purpose
              <input
                value={request.purpose}
                onChange={event => handleRequestChange('purpose', event.target.value)}
              />
            </label>
            <label>
              From
              <input
                value={request.occurredFrom ?? ''}
                onChange={event => handleRequestChange('occurredFrom', event.target.value)}
              />
            </label>
            <label>
              To
              <input
                value={request.occurredTo ?? ''}
                onChange={event => handleRequestChange('occurredTo', event.target.value)}
              />
            </label>
            <div className="form-field-wide">
              <button className="button button-primary" type="button" onClick={() => void handleCreate()} disabled={isSubmitting}>
                {isSubmitting ? 'Preparing export' : 'Request export'}
              </button>
            </div>
          </div>

          <div className="workflow-meta-panel">
            <span>Integrity model</span>
            <strong>Manifest hash</strong>
            <p>
              This MVP bundle uses deterministic manifest and bundle hashes for verification.
              Production key management and external regulator delivery remain outside this local demo.
            </p>
          </div>
        </div>

        {message ? <div className="admin-alert admin-alert-success">{message}</div> : null}
        {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      </section>

      {bundle ? (
        <>
          <section className="workspace-panel export-summary-panel">
            <div className="admin-section-header">
              <div>
                <h3>Manifest Summary</h3>
                <p>Review the integrity boundary before relying on the bundle.</p>
              </div>
              <StatusIndicator
                label={verificationStatus}
                tone={statusTone(verification?.verificationStatus ?? 'pending')}
              />
            </div>

            <dl className="export-summary-grid">
              <div>
                <dt>Bundle ID</dt>
                <dd><code>{bundle.bundleId}</code></dd>
              </div>
              <div>
                <dt>Scope</dt>
                <dd>{scopeLabel(bundle.scope)}</dd>
              </div>
              <div>
                <dt>Date range</dt>
                <dd>{formatDateRange(bundle)}</dd>
              </div>
              <div>
                <dt>Event count</dt>
                <dd>{bundle.manifest.recordCount}</dd>
              </div>
              <div>
                <dt>Manifest hash</dt>
                <dd><code>{bundle.integrity.manifestHash}</code></dd>
              </div>
              <div>
                <dt>Included proof references</dt>
                <dd>{proofReferences.length}</dd>
              </div>
            </dl>

            <div className="export-claim-grid">
              <section>
                <h4>What this proves</h4>
                <p>
                  The manifest and bundle hashes match the selected audit metadata, lifecycle references,
                  and proof references at generation time.
                </p>
              </section>
              <section>
                <h4>What this does not prove</h4>
                <p>
                  This does not certify raw documents, execute payments, provide production signing,
                  or integrate with an external regulator portal.
                </p>
              </section>
            </div>
          </section>

          <div className="dashboard-grid">
            {summaryCards.map(card => (
              <section className="metric-panel" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </section>
            ))}
          </div>

          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Bundle Detail</h3>
                <p>Manifest references only; restricted documents and raw commercial payloads are not included here.</p>
              </div>
              <button className="button button-secondary" type="button" onClick={() => void handleVerify()} disabled={isVerifying}>
                {isVerifying ? 'Verifying' : 'Verify bundle'}
              </button>
            </div>
            <dl className="proof-field-grid">
              <div className="proof-field">
                <dt>Bundle ID</dt>
                <dd><code>{bundle.bundleId}</code></dd>
              </div>
              <div className="proof-field">
                <dt>Bundle hash</dt>
                <dd><code>{bundle.integrity.bundleHash}</code></dd>
              </div>
              <div className="proof-field">
                <dt>Manifest hash</dt>
                <dd><code>{bundle.integrity.manifestHash}</code></dd>
              </div>
              <div className="proof-field">
                <dt>Verification status</dt>
                <dd>{verificationStatus}</dd>
              </div>
              <div className="proof-field">
                <dt>Download reference</dt>
                <dd><code>{bundle.download.reference}</code></dd>
              </div>
            </dl>
            {verification ? (
              <div className="admin-alert admin-alert-success">
                <strong>{statusLabel(verification.verificationStatus)}</strong>
                <p>Bundle hash verification completed against the stored manifest metadata.</p>
              </div>
            ) : null}
          </section>

          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Manifest Records</h3>
                <p>Each record is represented by identifiers, timestamps, and hashes.</p>
              </div>
              <span className="admin-count">{bundle.manifest.recordCount}</span>
            </div>
            <div className="order-list">
              {bundle.manifest.records.map(record => (
                <div className="order-row" key={`${record.recordType}-${record.recordId}`}>
                  <span>{record.source}</span>
                  <strong>{record.recordType}</strong>
                  <small>{record.occurredAt ?? 'Timestamp unavailable'}</small>
                  {record.anchorStatus ? <small>Proof status: {statusLabel(record.anchorStatus)}</small> : null}
                  <code>{record.payloadHash ?? record.recordId}</code>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-product-state">No export bundle has been requested in this session.</div>
      )}
    </div>
  );
}

export default ExportBundlePage;
