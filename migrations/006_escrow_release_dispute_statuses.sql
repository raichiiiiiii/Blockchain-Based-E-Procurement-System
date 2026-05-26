ALTER TABLE procure_to_pay_lifecycle_events
  DROP CONSTRAINT IF EXISTS procure_to_pay_lifecycle_events_lifecycle_stage_check;

ALTER TABLE procure_to_pay_lifecycle_events
  ADD CONSTRAINT procure_to_pay_lifecycle_events_lifecycle_stage_check
  CHECK (lifecycle_stage IN ('purchaseOrder', 'delivery', 'invoice', 'settlement', 'escrow'));

ALTER TABLE escrows
  DROP CONSTRAINT IF EXISTS escrows_status_check;

ALTER TABLE escrows
  ADD CONSTRAINT escrows_status_check
  CHECK (status IN (
    'accepted',
    'escrowCreated',
    'funded',
    'awaitingProof',
    'releasePending',
    'releaseReady',
    'releaseRequested',
    'releaseApproved',
    'releaseRejected',
    'onHold',
    'disputeOpen',
    'arbitration',
    'released',
    'refunded',
    'cancelled',
    'expired',
    'settlementInstructionReady',
    'disputed'
  ));

DROP INDEX IF EXISTS idx_escrows_active_order;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escrows_active_order
  ON escrows(order_id)
  WHERE status IN (
    'accepted',
    'escrowCreated',
    'funded',
    'awaitingProof',
    'releasePending',
    'releaseReady',
    'releaseRequested',
    'releaseApproved',
    'releaseRejected',
    'onHold',
    'disputeOpen',
    'arbitration',
    'disputed',
    'settlementInstructionReady'
  );
