# Actor UAT Results

Date: 2026-05-26  
Status: Release baseline

## Summary

Actor UAT scripts are recorded in `docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md`. This file records release-level pass status and remaining caveats for supervisor review.

| Actor | Result | Evidence |
|---|---|---|
| Administrator | Pass | Member governance, role controls, and access history covered by admin evidence and backend authorization tests. |
| Buyer / Procurement Officer | Pass | Order creation, accepted-order escrow readiness, proof metadata, and eligibility block covered by procurement and escrow evidence. |
| SME / Supplier | Pass | Received orders, acknowledgement, delivery metadata placeholder, and unrelated-order denial covered by procurement evidence. |
| Compliance Reviewer | Pass | Case queue, decision controls, redaction guardrail, and eligibility states covered by compliance evidence. |
| Shariah Reviewer | Pass | PLS review detail, checklist metadata, and decision controls covered by PLS/Shariah evidence. |
| Bank / Financier | Pass | Shariah-gated activation and profit/loss distribution scenarios covered by PLS/Shariah evidence. |
| Auditor | Pass | Audit/export/proof read-only flows covered by export and blockchain proof evidence. |
| Regulator / Reporting User | Pass | Export request, bundle detail, and verification metadata covered by export evidence. |
| Security Operator | Pass with read-only MVP scope | Security status, proof failure, and denied-action views covered by security operator evidence. |
| Platform Operator | Pass with local prerequisites | Local demo, database, Fabric runbooks, and smoke test documented. |
| Developer / Integrator | Pass | API quickstart documents login, proof, escrow, export, and PLS examples. |

## Caveats

- Live Fabric deployment requires local Hyperledger Fabric sample prerequisites.
- Runtime Postgres persistence is partial and explicitly scoped in runbooks.
- PLS distribution is simulation-only and does not execute payments.
- Export bundle integrity is MVP metadata, not production signing infrastructure.
