# Backlog Traceability Tree

Canonical backlog: `backlog/backlog.csv`.

## Major Ranges

| PBI range | Feature area | Current status pattern | Source/evidence | Implemented files | Risk |
|---|---|---|---|---|---|
| PBI-001 to PBI-030 | Original broad features | Mix of Completed, Planned, Deferred | backlog and reconciliation evidence | many modules | Broad parent rows can overstate production scope. |
| PBI-253 to PBI-262 | Auth/session branch | Completed | auth evidence | auth module, server plugin | OIDC remains boundary only. |
| PBI-263 to PBI-295 | Entry/dashboard UX | Completed | product entry/dashboard evidence | frontend pages/layout/session | Product UI must keep no PBI labels. |
| PBI-296 to PBI-308 | PostgreSQL baseline | Completed | Postgres evidence | migrations, Postgres repos | Some local adapters remain by design. |
| PBI-309 to PBI-332 | Fabric baseline/gateway | Completed | Fabric and blockchain evidence | chaincode, blockchain module | Production Fabric ops not certified. |
| PBI-341 to PBI-360 | Escrow first slice | Completed for first slice | escrow evidence | escrow module/pages | Parent PBI-006 broader lifecycle remains carefully bounded. |
| PBI-361 to PBI-428 | Deployment-ready MVP | Mostly completed after governance passes | actor/runbook/evidence docs | all major modules | Commercial/pilot claims still bounded. |
| PBI-429 to PBI-435 | Commercial readiness governance | Completed | commercial governance evidence | docs only | Artifacts do not make product commercial-ready. |
| PBI-436 to PBI-462 | Production extension | Completed in backlog | production-extension evidence | devops/integration/doc/payment/Fabric docs | "Completed" often means adapter/lab foundation, not production operation. |
| PBI-463 to PBI-497 | Company-centric and API hardening | Completed | Issue 24/25 evidence | org network, frontend, OpenAPI | Company ledger/projections must stay labelled. |
| PBI-498 to PBI-506 | Executable actor workflows | Completed | Issue 26 evidence | procurement/productivity/org graph | Initial persistence gap superseded by Issue 27. |
| PBI-507 to PBI-512 | Issue 27 merge gate | Completed | Issue 27 evidence | migration 019, Postgres repos, CI | Live DB restart smoke still recommended. |

## Completed But Needs Caution

- PBI-438: completed for production-like local Fabric lab guidance and runtime wiring, not managed production Fabric.
- PBI-439/PBI-440: payment adapter and ISO mapping are sandbox/mapping only, not payment execution.
- PBI-447: certificate artifacts are tracked, not formal Shariah certification.
- PBI-448: local software-key signing exists, not production KMS/HSM.
- PBI-443/PBI-444: IoT/QR/EPCIS intake is an adapter foundation, not certified logistics infrastructure.

## Planned Or Deferred Blockers For Stronger Claims

- Production legal/compliance controls: retention, legal hold, privacy/consent, jurisdictional policies.
- External stakeholder UAT.
- Production operations: secrets, monitoring, backup drills, incident response.
- Live integrations: ERP, payment, identity provider, logistics network.
