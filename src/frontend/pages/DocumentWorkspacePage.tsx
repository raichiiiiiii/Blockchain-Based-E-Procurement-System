import { useMemo, useState } from 'react';
import { getDocumentExtraction, uploadDocument } from '../api/documents';
import StatusIndicator from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  DocumentExtractionRecord,
  DocumentMetadata,
  DocumentType,
  UploadDocumentRequest,
} from '../types/document';

type DocumentWorkspacePageProps = {
  session: AuthenticatedFrontendSession;
};

type DocumentFormState = {
  documentType: DocumentType;
  filename: string;
  mimeType: string;
  textContent: string;
  signatureValue: string;
  certificateId: string;
};

const initialDocumentText = [
  'Contract Title: Amanah Retail Supply Agreement',
  'Buyer: Amanah Retail Sdn Bhd',
  'Supplier: Barakah Supplies Sdn Bhd',
  'Financier: Mabrur Finance Partner',
  'Registration Number: MY-2026-001',
  'Effective Date: 2026-05-26',
  'Expiry Date: 2026-12-31',
  'Goods/Services: Halal-certified packaging supplies',
  'Quantity: 500 cartons',
  'Price: 12000.00',
  'Currency: MYR',
  'Delivery Terms: Supplier records delivery evidence before escrow review.',
  'Payment Terms: Escrow-backed MVP settlement instruction only.',
  'Escrow Terms: Release requires buyer review and proof metadata.',
  'Dispute Clause: Manual arbitration applies in the MVP.',
  'Governing Law: Malaysia',
  'Signature: Buyer operations lead',
  'Attachment: Delivery schedule',
].join('\n');

const initialFormState: DocumentFormState = {
  documentType: 'contract',
  filename: 'amanah-barakah-contract.txt',
  mimeType: 'text/plain',
  textContent: initialDocumentText,
  signatureValue: '',
  certificateId: '',
};

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} bytes`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
}

function flattenFieldEntries(value: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(value).map(([key, entry]) => [
    key,
    typeof entry === 'string' ? entry : JSON.stringify(entry),
  ]);
}

function DocumentWorkspacePage({ session }: DocumentWorkspacePageProps) {
  const [form, setForm] = useState<DocumentFormState>(initialFormState);
  const [document, setDocument] = useState<DocumentMetadata | undefined>();
  const [extraction, setExtraction] = useState<DocumentExtractionRecord | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const extractedFieldEntries = useMemo(
    () => flattenFieldEntries(extraction?.extractedFields ?? {}),
    [extraction],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploading(true);
    setMessage(undefined);
    setError(undefined);

    const payload: UploadDocumentRequest = {
      documentType: form.documentType,
      filename: form.filename.trim(),
      mimeType: form.mimeType.trim(),
      textContent: form.textContent,
    };

    if (form.signatureValue.trim()) {
      payload.signature = {
        signatureType: 'detachedSha256',
        signatureValue: form.signatureValue.trim(),
        certificateId: form.certificateId.trim() || undefined,
      };
    }

    try {
      const uploaded = await uploadDocument(payload, session);
      setDocument(uploaded);
      setExtraction(await getDocumentExtraction(uploaded.documentId, session));
      setMessage('Document metadata, checksum, extraction state, and signature state were recorded.');
    } catch (nextError) {
      setError(normalizeErrorMessage(nextError));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Contract documents">
        <p className="dashboard-role-label">Contract Documents</p>
        <h2>Document intake and extraction</h2>
        <p>Upload safe document content for checksum, metadata extraction, and local signature-state recording. Raw files remain off-chain.</p>
      </section>

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Upload document</h3>
              <p>This MVP accepts text or JSON payloads directly. PDF and DOCX storage is supported, with extraction marked explicitly unsupported until a production extractor is connected.</p>
            </div>
          </div>
          <form className="admin-form" onSubmit={event => void handleSubmit(event)}>
            <label>
              Document type
              <select
                value={form.documentType}
                onChange={event => setForm(current => ({
                  ...current,
                  documentType: event.target.value as DocumentType,
                }))}
              >
                <option value="contract">Contract</option>
                <option value="purchaseOrder">Purchase order</option>
                <option value="deliveryProof">Delivery proof</option>
                <option value="invoice">Invoice</option>
                <option value="exportBundle">Export bundle</option>
                <option value="shariahCertificate">Shariah certificate artifact</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Filename
              <input
                value={form.filename}
                onChange={event => setForm(current => ({ ...current, filename: event.target.value }))}
              />
            </label>
            <label>
              MIME type
              <select
                value={form.mimeType}
                onChange={event => setForm(current => ({ ...current, mimeType: event.target.value }))}
              >
                <option value="text/plain">text/plain</option>
                <option value="application/json">application/json</option>
                <option value="application/pdf">application/pdf</option>
                <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">DOCX</option>
              </select>
            </label>
            <label>
              Certificate ID
              <input
                value={form.certificateId}
                placeholder="Optional local certificate reference"
                onChange={event => setForm(current => ({ ...current, certificateId: event.target.value }))}
              />
            </label>
            <label className="form-field-wide">
              Detached signature hash
              <input
                value={form.signatureValue}
                placeholder="Optional sha256:..."
                onChange={event => setForm(current => ({ ...current, signatureValue: event.target.value }))}
              />
            </label>
            <label className="form-field-wide">
              Document text
              <textarea
                value={form.textContent}
                rows={12}
                onChange={event => setForm(current => ({ ...current, textContent: event.target.value }))}
              />
            </label>
            <button className="button button-primary" type="submit" disabled={isUploading}>
              {isUploading ? 'Uploading document...' : 'Upload document'}
            </button>
          </form>
          {error ? <p className="admin-alert admin-alert-error" role="alert">{error}</p> : null}
          {message ? <p className="admin-alert admin-alert-success">{message}</p> : null}
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Document status</h3>
              <p>Metadata is shown without exposing raw commercial documents in the dashboard.</p>
            </div>
          </div>
          {document ? (
            <>
              <div className="workflow-meta-grid">
                <div className="workflow-meta-panel">
                  <span>Checksum</span>
                  <strong><code>{document.sha256}</code></strong>
                  <p>{formatBytes(document.sizeBytes)} stored through {document.storageRef}</p>
                </div>
                <div className="workflow-meta-panel">
                  <span>Extraction</span>
                  <strong>
                    <StatusIndicator tone={document.extractionStatus === 'extracted' ? 'success' : 'warning'} label={document.extractionStatus} />
                  </strong>
                  <p>Extraction status is explicit when a production extractor is unavailable.</p>
                </div>
                <div className="workflow-meta-panel">
                  <span>Signature</span>
                  <strong>
                    <StatusIndicator
                      tone={document.signatureStatus === 'verified' ? 'success' : document.signatureStatus === 'invalid' ? 'danger' : 'neutral'}
                      label={document.signatureStatus}
                    />
                  </strong>
                  <p>{document.signatureMetadata?.verificationSummary ?? 'No signature metadata was supplied.'}</p>
                </div>
              </div>
              <dl className="admin-definition-grid">
                <div>
                  <dt>Document reference</dt>
                  <dd><code>{document.documentId}</code></dd>
                </div>
                <div>
                  <dt>Owner organization</dt>
                  <dd>{document.ownerOrganizationId}</dd>
                </div>
                <div>
                  <dt>Uploaded by</dt>
                  <dd>{document.uploadedByUserId}</dd>
                </div>
                <div>
                  <dt>Malware scan</dt>
                  <dd>{document.malwareScanStatus}</dd>
                </div>
              </dl>
            </>
          ) : (
            <div className="empty-product-state">Upload a document to inspect checksum, extraction, and signature state.</div>
          )}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h3>Machine-readable extraction</h3>
            <p>Extracted fields are an adapter output for review. They do not replace the internal contract model.</p>
          </div>
        </div>
        {extraction ? (
          <>
            {extractedFieldEntries.length > 0 ? (
              <dl className="admin-definition-grid">
                {extractedFieldEntries.map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd><code>{value}</code></dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="empty-product-state">No structured fields were extracted from this document.</div>
            )}
            {extraction.warnings.length > 0 ? (
              <div className="admin-alert admin-alert-warning">
                {extraction.warnings.join(' ')}
              </div>
            ) : null}
          </>
        ) : (
          <div className="empty-product-state">Extraction output appears after upload.</div>
        )}
      </section>
    </div>
  );
}

export default DocumentWorkspacePage;
