import { useEffect, useMemo, useState } from 'react';
import { acceptContract, createContract, listContracts, submitContractOffer } from '../api/contracts';
import StatusIndicator from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  ContractAcceptanceParty,
  ContractStatus,
  MachineReadableTerms,
  ProcurementContract,
} from '../types/contract';

type ContractNegotiationPageProps = {
  session: AuthenticatedFrontendSession;
};

type ContractFormState = {
  contractNumber: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId: string;
  humanReadableDocumentId: string;
  paymentTerms: string;
};

const initialTerms: MachineReadableTerms = {
  parties: {
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    buyerName: 'Amanah Retail Sdn Bhd',
    supplierName: 'Barakah Supplies Sdn Bhd',
    financierName: 'Mabrur Finance Partner',
  },
  lineItems: [
    {
      itemId: 'line-1',
      description: 'Halal-certified packaging supplies',
      quantity: '500 cartons',
      unitPrice: '24.00',
      currency: 'MYR',
    },
  ],
  deliveryTerms: 'Supplier records delivery evidence before buyer review.',
  acceptanceCriteria: [
    'Buyer confirms delivery evidence metadata',
    'Escrow release remains a later controlled workflow',
  ],
  escrowReleaseConditions: [
    'Accepted order exists',
    'Delivery evidence is recorded',
    'Buyer review is complete',
  ],
  paymentTerms: 'Escrow-backed settlement instruction only; no real payment execution.',
  disputeAndArbitrationRules: 'Manual arbitration applies for disputed delivery or acceptance.',
  plsTerms: {
    shariahReviewId: 'shariah-review-demo',
    approvalReference: 'restricted-seedbed-review',
    profitSharingRatio: '60:40',
    lossAllocation: 'Capital provider bears capital loss unless negligence is proven.',
  },
  documentReferences: ['document-demo-contract'],
  clauseReferences: [
    {
      clauseId: 'delivery-1',
      title: 'Delivery evidence',
      summary: 'Supplier records safe evidence metadata before review.',
    },
    {
      clauseId: 'escrow-1',
      title: 'Escrow review',
      summary: 'Buyer review is required before future release workflow.',
    },
  ],
  ocdsMapping: {
    contractId: 'ocds-contract-demo',
    implementationMilestones: ['delivery-evidence-recorded'],
  },
  ublMapping: {
    orderReference: 'PO-AMANAH-001',
    despatchAdviceReference: 'DA-BARAKAH-001',
  },
};

const initialForm: ContractFormState = {
  contractNumber: 'AMANAH-BARAKAH-2026-001',
  buyerOrganizationId: 'demo-buyer-org',
  supplierOrganizationId: 'demo-supplier-org',
  financierOrganizationId: 'demo-financier-org',
  humanReadableDocumentId: 'document-demo-contract',
  paymentTerms: initialTerms.paymentTerms,
};

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function statusTone(status: ContractStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'accepted' || status === 'active') {
    return 'success';
  }

  if (status === 'negotiating') {
    return 'warning';
  }

  if (status === 'draft') {
    return 'info';
  }

  return 'neutral';
}

function fieldList(values: string[]): string {
  return values.join('; ');
}

function acceptanceParty(session: AuthenticatedFrontendSession, contract: ProcurementContract): ContractAcceptanceParty | undefined {
  if (session.actor.actorOrganizationId === contract.buyerOrganizationId) {
    return 'buyer';
  }

  if (session.actor.actorOrganizationId === contract.supplierOrganizationId) {
    return 'supplier';
  }

  return undefined;
}

function buildTermsFromForm(form: ContractFormState): MachineReadableTerms {
  return {
    ...initialTerms,
    parties: {
      ...initialTerms.parties,
      buyerOrganizationId: form.buyerOrganizationId.trim(),
      supplierOrganizationId: form.supplierOrganizationId.trim(),
      financierOrganizationId: form.financierOrganizationId.trim() || undefined,
    },
    paymentTerms: form.paymentTerms.trim(),
    documentReferences: [form.humanReadableDocumentId.trim()].filter(Boolean),
  };
}

function ContractNegotiationPage({ session }: ContractNegotiationPageProps) {
  const [form, setForm] = useState<ContractFormState>(initialForm);
  const [contracts, setContracts] = useState<ProcurementContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  const selectedContract = useMemo(
    () => contracts.find(contract => contract.contractId === selectedContractId) ?? contracts[0],
    [contracts, selectedContractId],
  );

  const currentAcceptanceParty = selectedContract ? acceptanceParty(session, selectedContract) : undefined;
  const hasCurrentPartyAccepted = Boolean(
    selectedContract && currentAcceptanceParty &&
    selectedContract.acceptances.some(acceptance => acceptance.acceptedBy === currentAcceptanceParty && acceptance.acceptedTermsHash === selectedContract.termsHash),
  );

  useEffect(() => {
    let mounted = true;

    void listContracts(session)
      .then(items => {
        if (!mounted) {
          return;
        }

        setContracts(items);
        setSelectedContractId(current => current ?? items[0]?.contractId);
      })
      .catch(nextError => {
        if (mounted) {
          setError(normalizeErrorMessage(nextError));
        }
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  const refreshContracts = async (preferredId?: string) => {
    const items = await listContracts(session);
    setContracts(items);
    setSelectedContractId(preferredId ?? selectedContractId ?? items[0]?.contractId);
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const created = await createContract({
        contractNumber: form.contractNumber.trim(),
        buyerOrganizationId: form.buyerOrganizationId.trim(),
        supplierOrganizationId: form.supplierOrganizationId.trim(),
        financierOrganizationId: form.financierOrganizationId.trim() || undefined,
        humanReadableDocumentId: form.humanReadableDocumentId.trim() || undefined,
        machineReadableTerms: buildTermsFromForm(form),
      }, session);
      setContracts(current => [created, ...current.filter(contract => contract.contractId !== created.contractId)]);
      setSelectedContractId(created.contractId);
      setMessage('Contract terms were versioned and linked to the negotiation workspace.');
    } catch (nextError) {
      setError(normalizeErrorMessage(nextError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!selectedContract) {
      return;
    }

    setIsBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const updated = await submitContractOffer(
        selectedContract.contractId,
        {
          ...selectedContract.machineReadableTerms,
          paymentTerms: 'Escrow-backed settlement instruction after delivery review; no real payment execution.',
        },
        'Payment wording aligned with the MVP settlement boundary.',
        session,
      );
      setContracts(current => [updated, ...current.filter(contract => contract.contractId !== updated.contractId)]);
      setSelectedContractId(updated.contractId);
      setMessage('A revised offer was recorded with a new terms hash.');
    } catch (nextError) {
      setError(normalizeErrorMessage(nextError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedContract || !currentAcceptanceParty) {
      return;
    }

    setIsBusy(true);
    setError(undefined);
    setMessage(undefined);

    try {
      const updated = await acceptContract(selectedContract.contractId, currentAcceptanceParty, session);
      setContracts(current => [updated, ...current.filter(contract => contract.contractId !== updated.contractId)]);
      setSelectedContractId(updated.contractId);
      setMessage(`${currentAcceptanceParty === 'buyer' ? 'Buyer' : 'Supplier'} acceptance was recorded for the current terms hash.`);
    } catch (nextError) {
      setError(normalizeErrorMessage(nextError));
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Contract negotiation">
        <p className="dashboard-role-label">Contract Negotiation</p>
        <h2>Negotiation workspace</h2>
        <p>Version contract terms, record offers, and keep human document references linked to machine-readable terms.</p>
      </section>

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Create contract terms</h3>
              <p>Start from the Amanah, Barakah, and Mabrur case. The model records hashes and review data without executing payment.</p>
            </div>
          </div>
          <form className="admin-form" onSubmit={event => void handleCreate(event)}>
            <label>
              Contract number
              <input
                value={form.contractNumber}
                onChange={event => setForm(current => ({ ...current, contractNumber: event.target.value }))}
              />
            </label>
            <label>
              Buyer organization
              <input
                value={form.buyerOrganizationId}
                onChange={event => setForm(current => ({ ...current, buyerOrganizationId: event.target.value }))}
              />
            </label>
            <label>
              Supplier organization
              <input
                value={form.supplierOrganizationId}
                onChange={event => setForm(current => ({ ...current, supplierOrganizationId: event.target.value }))}
              />
            </label>
            <label>
              Financier organization
              <input
                value={form.financierOrganizationId}
                onChange={event => setForm(current => ({ ...current, financierOrganizationId: event.target.value }))}
              />
            </label>
            <label>
              Linked document reference
              <input
                value={form.humanReadableDocumentId}
                onChange={event => setForm(current => ({ ...current, humanReadableDocumentId: event.target.value }))}
              />
            </label>
            <label className="form-field-wide">
              Payment terms
              <textarea
                value={form.paymentTerms}
                rows={4}
                onChange={event => setForm(current => ({ ...current, paymentTerms: event.target.value }))}
              />
            </label>
            <button className="button button-primary" type="submit" disabled={isBusy}>
              {isBusy ? 'Saving terms...' : 'Save contract terms'}
            </button>
          </form>
          {error ? <p className="admin-alert admin-alert-error" role="alert">{error}</p> : null}
          {message ? <p className="admin-alert admin-alert-success">{message}</p> : null}
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Contract list</h3>
              <p>Only contracts visible to the authenticated organization or review role are listed.</p>
            </div>
            <button className="button button-secondary" type="button" onClick={() => void refreshContracts()} disabled={isBusy}>
              Refresh
            </button>
          </div>
          {contracts.length > 0 ? (
            <div className="workflow-meta-grid">
              {contracts.map(contract => (
                <div className="workflow-meta-panel" key={contract.contractId}>
                  <span>{contract.contractNumber}</span>
                  <strong><StatusIndicator tone={statusTone(contract.status)} label={contract.status} /></strong>
                  <p>Version {contract.version}</p>
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => setSelectedContractId(contract.contractId)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-product-state">No contract terms are available for this workspace yet.</div>
          )}
        </section>
      </div>

      {selectedContract ? (
        <>
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Contract detail</h3>
                <p>Current terms are hashed and acceptance records are tied to the active version.</p>
              </div>
              <div className="proof-actions">
                <button className="button button-secondary" type="button" onClick={() => void handleSubmitOffer()} disabled={isBusy}>
                  Submit revised offer
                </button>
                <button className="button button-primary" type="button" onClick={() => void handleAccept()} disabled={isBusy || !currentAcceptanceParty || hasCurrentPartyAccepted}>
                  Accept current terms
                </button>
              </div>
            </div>
            <div className="workflow-meta-grid">
              <div className="workflow-meta-panel">
                <span>Status</span>
                <strong><StatusIndicator tone={statusTone(selectedContract.status)} label={selectedContract.status} /></strong>
                <p>Version {selectedContract.version}</p>
              </div>
              <div className="workflow-meta-panel">
                <span>Terms hash</span>
                <strong><code>{selectedContract.termsHash}</code></strong>
                <p>Machine-readable terms hash for this version.</p>
              </div>
              <div className="workflow-meta-panel">
                <span>Linked document</span>
                <strong><code>{selectedContract.humanReadableDocumentId ?? 'not linked'}</code></strong>
                <p>The human document reference is metadata only in this slice.</p>
              </div>
            </div>
            <dl className="admin-definition-grid">
              <div>
                <dt>Buyer</dt>
                <dd>{selectedContract.machineReadableTerms.parties.buyerName ?? selectedContract.buyerOrganizationId}</dd>
              </div>
              <div>
                <dt>Supplier</dt>
                <dd>{selectedContract.machineReadableTerms.parties.supplierName ?? selectedContract.supplierOrganizationId}</dd>
              </div>
              <div>
                <dt>Financier</dt>
                <dd>{selectedContract.machineReadableTerms.parties.financierName ?? selectedContract.financierOrganizationId ?? 'not assigned'}</dd>
              </div>
              <div>
                <dt>Delivery terms</dt>
                <dd>{selectedContract.machineReadableTerms.deliveryTerms}</dd>
              </div>
              <div>
                <dt>Acceptance criteria</dt>
                <dd>{fieldList(selectedContract.machineReadableTerms.acceptanceCriteria)}</dd>
              </div>
              <div>
                <dt>Escrow release conditions</dt>
                <dd>{fieldList(selectedContract.machineReadableTerms.escrowReleaseConditions)}</dd>
              </div>
              <div>
                <dt>Payment terms</dt>
                <dd>{selectedContract.machineReadableTerms.paymentTerms}</dd>
              </div>
              <div>
                <dt>Dispute rules</dt>
                <dd>{selectedContract.machineReadableTerms.disputeAndArbitrationRules}</dd>
              </div>
            </dl>
          </section>

          <div className="order-action-grid">
            <section className="workspace-panel">
              <div className="admin-section-header">
                <div>
                  <h3>Offer history</h3>
                  <p>Each offer records actor, comment, version hash, and timestamp.</p>
                </div>
              </div>
              {selectedContract.offers.length > 0 ? (
                <ol className="proof-timeline-list">
                  {selectedContract.offers.map(offer => (
                    <li className="proof-timeline-item" key={offer.offerId}>
                      <strong>{offer.actorOrganizationId ?? offer.actorUserId}</strong>
                      <p>{offer.comment ?? 'Offer submitted without comment.'}</p>
                      <code>{offer.proposedTermsHash}</code>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="empty-product-state">No revised offers have been submitted.</div>
              )}
            </section>

            <section className="workspace-panel">
              <div className="admin-section-header">
                <div>
                  <h3>Acceptance and audit trail</h3>
                  <p>Acceptance records and lifecycle events are kept for review before downstream order or escrow linking.</p>
                </div>
              </div>
              <dl className="admin-definition-grid">
                <div>
                  <dt>Buyer accepted</dt>
                  <dd>{selectedContract.acceptances.some(item => item.acceptedBy === 'buyer') ? 'yes' : 'pending'}</dd>
                </div>
                <div>
                  <dt>Supplier accepted</dt>
                  <dd>{selectedContract.acceptances.some(item => item.acceptedBy === 'supplier') ? 'yes' : 'pending'}</dd>
                </div>
                <div>
                  <dt>Latest lifecycle event</dt>
                  <dd>{selectedContract.lifecycleEvents.at(-1)?.eventType ?? 'not recorded'}</dd>
                </div>
                <div>
                  <dt>Lifecycle count</dt>
                  <dd>{selectedContract.lifecycleEvents.length}</dd>
                </div>
              </dl>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default ContractNegotiationPage;
