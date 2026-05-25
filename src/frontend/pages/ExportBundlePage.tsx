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

type ExportBundlePageProps = {
  session: AuthenticatedFrontendSession;
};

const scopeOptions: Array<{ value: ExportBundleScope; label: string }> = [
  { value: 'combinedAudit', label: 'Combined audit' },
  { value: 'procureToPay', label: 'Procure to pay' },
  { value: 'accessHistory', label: 'Access history' },
];

function statusClass(status: string): string {
  if (status === 'generated' || status === 'verified') {
    return 'admin-status admin-status-active';
  }

  if (status === 'failed' || status === 'mismatch') {
    return 'admin-status admin-status-danger';
  }

  return 'admin-status admin-status-pending';
}

function statusLabel(status: string): string {
  return status
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, char => char.toUpperCase());
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
          {bundle ? <span className={statusClass(bundle.status)}>{statusLabel(bundle.status)}</span> : null}
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
