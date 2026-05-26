# Blockchain Proof Timeline Spike

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Question

Can auditor and regulator comprehension improve by showing procurement lifecycle events and proof states in a single sequence without fabricating blockchain data?

## Decision

Implement a frontend proof timeline component for the current supervisor demo scope.

The implementation is acceptable because it:

- uses existing proof records and proof-state types;
- displays not anchored, pending, anchored, failed, verified, mismatch, not found, and unavailable as distinct states;
- shows event IDs and proof hashes only when the existing proof record provides them;
- does not create transaction IDs, block numbers, or verified states;
- does not expose raw procurement, escrow, KYC, payment, or delivery documents.

## Timeline Events

1. Order created
2. Order accepted
3. Delivery evidence submitted
4. Escrow created
5. Shariah decision
6. Export generated

## Recommended Surface

- Auditor Blockchain Proof
- Regulator Blockchain Proof
- Audit event detail proof review

## Risks

- A timeline could imply all events are anchored if state badges are unclear.
- Local demo proof records could be mistaken for live Fabric data.
- Long hashes can make the layout hard to scan on smaller screens.

## Mitigations

- Use explicit state badges and proof-state colors.
- Keep language limited to proof metadata and proof service availability.
- Wrap hashes and avoid showing chain metadata unless the proof record supplies it.

## Outcome

Proceed with a frontend timeline because it is low-risk, improves supervisor comprehension, and stays within the existing proof UI contract.
