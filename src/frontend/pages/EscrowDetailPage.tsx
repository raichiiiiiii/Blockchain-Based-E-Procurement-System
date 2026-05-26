import { useState } from 'react';
import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import {
  escrowToProofRecord,
  transitionEscrow,
  type EscrowRecord,
  type EscrowTransitionRequest,
} from '../lib/escrow-client';

type EscrowDetailPageProps = {
  escrow?: EscrowRecord;
  session?: AuthenticatedFrontendSession;
  onEscrowChange?: (escrow: EscrowRecord) => void;
};

function formatStatus(status: EscrowRecord['status']): string {
  switch (status) {
    case 'escrowCreated':
      return 'Escrow created';
    case 'releasePending':
      return 'Release pending';
    case 'releaseReady':
      return 'Release ready';
    case 'funded':
      return 'Funded';
    case 'awaitingProof':
      return 'Awaiting proof';
    case 'releaseRequested':
      return 'Release requested';
    case 'releaseApproved':
      return 'Release approved';
    case 'releaseRejected':
      return 'Release rejected';
    case 'onHold':
      return 'On hold';
    case 'disputeOpen':
      return 'Dispute open';
    case 'settlementInstructionReady':
      return 'Settlement instruction ready';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function statusTone(status: EscrowRecord['status']): StatusTone {
  switch (status) {
    case 'escrowCreated':
    case 'releaseReady':
    case 'released':
    case 'releaseApproved':
    case 'settlementInstructionReady':
      return 'success';
    case 'releasePending':
    case 'releaseRequested':
    case 'funded':
    case 'awaitingProof':
    case 'accepted':
      return 'pending';
    case 'disputed':
    case 'disputeOpen':
    case 'arbitration':
    case 'onHold':
    case 'releaseRejected':
      return 'warning';
    case 'cancelled':
    case 'refunded':
    case 'expired':
      return 'danger';
  }
}

function roleCodes(session?: AuthenticatedFrontendSession): string[] {
  return session?.actor.actorRoleCodes ?? [];
}

function canShowAction(
  action: EscrowTransitionRequest['action'],
  escrow: EscrowRecord,
  session?: AuthenticatedFrontendSession,
): boolean {
  const roles = roleCodes(session);
  if (action === 'fund') {
    return escrow.status === 'escrowCreated' && (roles.includes('buyer') || roles.includes('financier'));
  }
  if (action === 'request-release') {
    return ['funded', 'awaitingProof', 'releasePending', 'releaseReady'].includes(escrow.status) &&
      (roles.includes('supplier') || roles.includes('buyer'));
  }
  if (action === 'approve-release') {
    return escrow.status === 'releaseRequested' && roles.includes('buyer');
  }
  if (action === 'hold') {
    return ['escrowCreated', 'funded', 'awaitingProof', 'releasePending', 'releaseReady', 'releaseRequested'].includes(escrow.status) &&
      (roles.includes('buyer') || roles.includes('administrator') || roles.includes('securityOperator'));
  }
  if (action === 'dispute') {
    return ['escrowCreated', 'funded', 'awaitingProof', 'releasePending', 'releaseReady', 'releaseRequested', 'onHold'].includes(escrow.status) &&
      (roles.includes('buyer') || roles.includes('supplier'));
  }
  return ['disputeOpen', 'arbitration', 'onHold', 'disputed'].includes(escrow.status) &&
    (roles.includes('administrator') || roles.includes('auditor'));
}

function EscrowDetailPage({ escrow, session, onEscrowChange }: EscrowDetailPageProps) {
  const [transitionState, setTransitionState] = useState<'idle' | 'submitting'>('idle');
  const [transitionError, setTransitionError] = useState<string | undefined>();
  const [transitionNote, setTransitionNote] = useState<string | undefined>();

  if (!escrow) {
    return (
      <section className="workspace-panel">
        <h2>Blockchain Proof</h2>
        <p>Escrow proof appears after an escrow record has been created for an accepted order.</p>
      </section>
    );
  }

  const proofRecord = escrowToProofRecord(escrow);
  const runTransition = async (request: EscrowTransitionRequest) => {
    setTransitionState('submitting');
    setTransitionError(undefined);
    setTransitionNote(undefined);

    try {
      const response = await transitionEscrow(escrow.escrowId, request, session);
      onEscrowChange?.(response.escrow);
      setTransitionNote(`${formatStatus(response.escrow.status)} recorded.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Escrow action could not be completed';
      setTransitionError(message);
    } finally {
      setTransitionState('idle');
    }
  };

  return (
    <div className="escrow-detail-surface">
      <section className="proof-surface-header" aria-label="Escrow detail">
        <p className="dashboard-role-label">Escrow detail</p>
        <h2>{formatStatus(escrow.status)}</h2>
        <p>
          Escrow proof is based on the lifecycle event hash. Payment credentials and commercial terms stay off-chain.
        </p>
      </section>

      <div className="escrow-status-grid">
        <div className="escrow-status-band">
          <span>Escrow status</span>
          <strong>
            <StatusIndicator label={formatStatus(escrow.status)} tone={statusTone(escrow.status)} compact />
          </strong>
          <p>Created from order {escrow.orderId} for buyer {escrow.buyerOrganizationId}.</p>
        </div>
        <div className="escrow-status-band">
          <span>Proof boundary</span>
          <strong>Hash only</strong>
          <p>The panel shows event proof metadata only. Raw escrow terms are not displayed.</p>
        </div>
        <div className="escrow-status-band">
          <span>Lifecycle event</span>
          <strong>{escrow.lifecycleEventId ?? 'Not recorded'}</strong>
          <p>
            {escrow.lifecycleEventHash ? (
              <code>{escrow.lifecycleEventHash}</code>
            ) : (
              'Lifecycle event hash will appear after recording.'
            )}
          </p>
        </div>
      </div>

      {session ? (
        <section className="workspace-panel" aria-label="Escrow lifecycle actions">
          <h3>Release conditions</h3>
          <div className="escrow-status-grid">
            {([
              ['Accepted order', escrow.releaseConditionSummary?.acceptedOrder],
              ['Delivery evidence', escrow.releaseConditionSummary?.deliveryEvidenceRecorded],
              ['Eligibility', escrow.releaseConditionSummary?.eligibilitySatisfied],
              ['No dispute hold', escrow.releaseConditionSummary?.disputeFree],
            ] as const).map(([label, passed]) => (
              <div className="escrow-status-band" key={label}>
                <span>{label}</span>
                <strong>
                  <StatusIndicator
                    label={passed === undefined ? 'Not checked' : passed ? 'Satisfied' : 'Needs attention'}
                    tone={passed === undefined ? 'neutral' : passed ? 'success' : 'warning'}
                    compact
                  />
                </strong>
              </div>
            ))}
          </div>
          <div className="admin-action-row">
            {canShowAction('fund', escrow, session) ? (
              <button className="button button-secondary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'fund' })}>
                Mark funded
              </button>
            ) : null}
            {canShowAction('request-release', escrow, session) ? (
              <button className="button button-secondary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'request-release' })}>
                Request release
              </button>
            ) : null}
            {canShowAction('approve-release', escrow, session) ? (
              <button className="button button-primary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'approve-release' })}>
                Approve release
              </button>
            ) : null}
            {canShowAction('hold', escrow, session) ? (
              <button className="button button-secondary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'hold', reason: 'Operational review hold' })}>
                Place hold
              </button>
            ) : null}
            {canShowAction('dispute', escrow, session) ? (
              <button className="button button-secondary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'dispute', reason: 'Delivery requires dispute review' })}>
                Open dispute
              </button>
            ) : null}
            {canShowAction('arbitration-decision', escrow, session) ? (
              <button className="button button-primary" type="button" disabled={transitionState === 'submitting'} onClick={() => void runTransition({ action: 'arbitration-decision', arbitrationOutcome: 'approveRelease', reason: 'Evidence supports release instruction preparation' })}>
                Record decision
              </button>
            ) : null}
          </div>
          {transitionError ? <p className="admin-alert admin-alert-error" role="alert">{transitionError}</p> : null}
          {transitionNote ? <p className="admin-alert admin-alert-success">{transitionNote}</p> : null}
          <p className="panel-footnote">Release approval prepares a settlement instruction only. No payment is executed in this workspace.</p>
        </section>
      ) : null}

      <BlockchainProofPanel {...proofRecord} />
    </div>
  );
}

export default EscrowDetailPage;
