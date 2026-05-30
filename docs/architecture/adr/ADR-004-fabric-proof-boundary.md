# ADR-004: Fabric Is A Proof Boundary, Not The Application Database

Status: Accepted
Date: 2026-05-30

## Context

The system must be blockchain-based without overclaiming decentralization or production consortium readiness. Procurement, KYC, documents, escrow, payment, and Shariah data include sensitive business and personal information.

## Decision

Use Hyperledger Fabric only for selected proof anchoring and audit verification.

Allowed proof-level data:

- event id
- hashed case id
- event type
- payload hash
- schema version
- canonicalization profile
- occurrence and anchor timestamps
- previous event hash where needed

Raw sensitive business data remains off-chain.

## Consequences

- A failed anchor cannot delete or invalidate a persisted business event.
- Proof states must remain honest: notAnchored, pending, anchored, failed, verified, mismatch, notFound, unavailable.
- Product UI must not imply Fabric proves real-world delivery truth, KYC truth, payment execution, or Shariah validity.
- Production Fabric consortium work remains separate from MVP proof anchoring.
