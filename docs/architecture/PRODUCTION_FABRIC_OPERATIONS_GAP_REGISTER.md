# Production Fabric Operations Gap Register

Date: 2026-05-31
Owner: Platform Operator / Blockchain Engineer / Security Lead
Related PBI: PBI-438

## Current Validated State

PBI-438 is Completed for a production-like local Fabric lab and runtime Fabric
Gateway validation. The validated state includes:

- external CA/MSP/channel/lifecycle material kept outside the repository
- distinct lab organizations for platform operator, buyer, supplier, financier,
  regulator/auditor, and orderer
- TLS-enabled local lab peers and orderers
- `procurement-proof-channel`
- committed `audit-anchor` chaincode
- live `anchorEvent`, `getAnchor`, `verifyEvent` verified, mismatch, notFound,
  and duplicate-anchor rejection checks
- backend Fabric Gateway runtime mode
- backend proof API verification against the live lab
- browser DOM evidence showing configured Fabric gateway mode

Primary evidence:

```text
docs/evidence/qa/PBI-438_PRODUCTION_LIKE_FABRIC_LAB_VALIDATION.md
docs/evidence/qa/POST_PBI438_RELEASE_RECONCILIATION.md
```

## Claim Boundary

Safe readiness wording:

```text
Supervisor-demo plus selected pilot-hardening and production-like Fabric lab validation; not commercial-ready or production-certified.
```

Do not claim:

- managed production Fabric consortium operations
- production CA governance
- HSM/KMS-backed identity custody
- production payment execution
- production ERP/accounting certification
- formal Shariah certification
- commercial-ready or production-certified deployment

PBI-438 proves that the application can use a configured Fabric Gateway in a
production-like local lab. It does not prove that the consortium is operationally
ready for external pilot or production-certified use.

## Gap Register

| Gap ID | Area | Gap | Current Evidence | Required Evidence To Close | Owner | Priority | Stage |
|---|---|---|---|---|---|---|---|
| FAB-OPS-001 | Production CA governance | CA enrollment, TLS CA separation, admin authority, certificate issuance policy, and CA operator duties are not operationalized. | PBI-438 lab used external CA/MSP material for local validation. | Approved CA operating procedure, role separation matrix, CA backup procedure, issuance/revocation transcript, and security review sign-off. | Platform Operator + Security Lead | P0 | Pre-pilot |
| FAB-OPS-002 | Certificate rotation and revocation | Rotation and revocation are documented at concept level but not rehearsed end to end. | Architecture notes and channel plan mention rotation/revocation. | Successful rotation drill for a gateway client identity, revoked old identity blocked, CRL/MSP update evidence, proof API smoke after rotation. | Blockchain Engineer | P0 | Pre-pilot |
| FAB-OPS-003 | MSP lifecycle operations | Member onboarding/offboarding, MSP update approvals, and channel config update workflow are not rehearsed. | PBI-438 created static lab MSPs. | Channel config update transcript for adding/removing a lab org or identity, approval record, rollback plan, and sanitized evidence. | Blockchain Engineer + Consortium Governance | P0 | Pre-pilot |
| FAB-OPS-004 | External key custody and signing policy | Lab keys are local files outside repo; no HSM/KMS or managed key custody policy exists. | No secrets committed; local MSP material kept outside repo. | Key custody policy, KMS/HSM adapter decision, key access audit, break-glass procedure, and proof that app does not read admin keys. | Security Lead | P0 | Pre-production |
| FAB-OPS-005 | Production connection profile management | Current runtime resolves the first configured peer; profile distribution, rotation, and environment-specific storage are not governed. | Fabric Gateway reads external connection profile and MSP path. | Environment-specific profile storage procedure, profile rotation smoke, multi-env config review, and no-secret artifact scan. | Platform Operator | P1 | Pre-pilot |
| FAB-OPS-006 | Peer and orderer availability planning | Availability targets, node placement, orderer quorum, and ledger storage durability are not defined for pilot. | Local lab uses multiple orderers and one peer per organization. | Availability target, deployment topology, backup/restore plan, quorum failure test, and node restart smoke. | Platform Operator | P0 | Pre-pilot |
| FAB-OPS-007 | Multi-peer gateway selection and failover | Backend currently selects one peer endpoint from the connection profile and does not perform production failover. | Runtime Gateway validates one configured profile path and peer. | Gateway selection design, failover test across at least two peers, degraded readiness behavior, and proof API continuity evidence. | Backend Engineer + Blockchain Engineer | P1 | Pre-production |
| FAB-OPS-008 | Backup and restore drills | Fabric ledger/MSP backup and PostgreSQL anchor metadata restore consistency are not drilled together. | PostgreSQL backup runbooks exist; PBI-438 lab evidence is external. | Full restore rehearsal for PostgreSQL metadata plus Fabric ledger/MSP material, restored proof lookup/verify smoke, and rollback decision log. | Platform Operator + DBA | P0 | Pre-pilot |
| FAB-OPS-009 | Private data collection live exercise | Private data collection templates exist but were not exercised by the `audit-anchor` lab. | `collections-config.json` templates exist; AuditAnchor stores proof metadata only. | Live PDC chaincode exercise using proof-level private metadata, endorsement/read authorization checks, and no raw private payload scan. | Blockchain Engineer | P1 | Pre-production |
| FAB-OPS-010 | Chaincode upgrade and lifecycle governance | Upgrade sequence, approval governance, and rollback readiness are not rehearsed with consortium approvals. | `audit-anchor` was committed at version 1.0.0 sequence 1 in the lab. | Version/sequence upgrade drill, multi-org approvals, querycommitted evidence, rollback/compatibility note, and app smoke after upgrade. | Blockchain Engineer + Product Owner | P0 | Pre-pilot |
| FAB-OPS-011 | Consortium change-control process | Channel, policy, chaincode, and participant changes do not have an approved governance workflow. | Architecture lists participant and policy templates. | Change-control policy, approver matrix, sample change request, emergency change procedure, and audit evidence mapping. | Consortium Governance | P0 | Pre-pilot |
| FAB-OPS-012 | Monitoring and alerting | Production peer/orderer/CA/gateway telemetry, alert thresholds, and operator dashboards are not integrated. | Backend readiness and security alerts exist for app runtime. | Metrics inventory, alert thresholds, peer/orderer/CA log collection, proof failure alert drill, and operator dashboard evidence. | Platform Operator + Security Lead | P1 | Pre-pilot |
| FAB-OPS-013 | Incident response | Fabric outage and degraded proof behavior are safe in app logic, but production incident response is not rehearsed. | App reports unavailable/degraded proof states and preserves business events. | Incident playbook, severity matrix, simulated peer outage, recovery transcript, customer-facing status language, and post-incident review template. | Security Lead + Platform Operator | P0 | Pre-pilot |
| FAB-OPS-014 | Disaster recovery | Region/site loss, ledger restore, CA restore, and proof metadata reconciliation are not validated. | No production DR evidence. | DR runbook, RPO/RTO targets, restore drill, regenerated gateway profile procedure, and proof verification after restore. | Platform Operator | P0 | Pre-production |
| FAB-OPS-015 | Security review | Threat model, penetration test scope, dependency review, and generated artifact controls are not complete for production Fabric operations. | Secret-material scans run during PBI-438 and reconciliation. | Threat model, dependency/license review, secret scanning in CI, mTLS review, signing identity review, and remediation log. | Security Lead | P0 | Pre-pilot |
| FAB-OPS-016 | Performance and load validation | Throughput, latency, endorsement behavior, and proof API response times under load are unknown. | PBI-438 proves functional smoke only. | Load test plan, target event volume, latency/error budget, peer/orderer resource profile, and app proof API performance report. | Performance Engineer | P1 | Pre-production |
| FAB-OPS-017 | Privacy impact assessment | Fabric proof metadata, private data templates, retention, and organization-level access have not been reviewed as a privacy program. | Data placement rules prohibit raw sensitive data on-chain. | Privacy impact assessment, data retention policy, pseudonymization review, PDC access review, and regulator/auditor read boundary evidence. | Compliance Lead + Privacy Officer | P0 | Pre-pilot |
| FAB-OPS-018 | Formal Shariah/legal review for PLS claims | PLS proof and Shariah artifacts are bounded to seedbed/artifact tracking; formal certification review is not complete. | Shariah certificate artifact and PLS seedbed evidence exist. | External legal/Shariah review record, approved claim language, certificate artifact handling policy, and restrictions for demos/pilot. | Product Owner + Shariah Governance Lead | P0 | Pre-pilot |
| FAB-OPS-019 | Payment and ERP certification boundaries | Payment/ERP adapter foundations exist, but production integration certification boundaries are not complete. | Sandbox/manual payment and ERP/accounting adapter evidence exists. | Certification boundary statement, external provider sandbox evidence, no-production-payment claim review, and integration data protection review. | Product Owner + Integration Lead | P1 | Pre-production |

## Pre-Pilot Gate

Before any external or supervised pilot claim, complete or formally accept risks
for:

- FAB-OPS-001 through FAB-OPS-003
- FAB-OPS-006
- FAB-OPS-008
- FAB-OPS-010 through FAB-OPS-013
- FAB-OPS-015
- FAB-OPS-017 and FAB-OPS-018

Minimum pre-pilot evidence:

- CA/MSP lifecycle procedure and rotation drill
- gateway identity policy and no-admin-key runtime proof
- node restart/failure smoke
- backup/restore drill across PostgreSQL metadata and Fabric evidence
- chaincode upgrade governance drill
- production operations incident playbook
- security and privacy reviews
- approved market-claim language

## Pre-Production Gate

Before any production-certified operation claim, complete all pre-pilot gaps and:

- HSM/KMS-backed or equivalent approved key custody
- multi-peer gateway failover
- private data collection live exercise where used
- disaster recovery drill with RPO/RTO targets
- performance and load validation
- production monitoring and alerting
- payment/ERP certification boundary review if those integrations are enabled

## Evidence Required

Every future gap closure must include:

- scope and environment
- owner and approver
- command transcript or operator checklist
- sanitized configuration references
- proof that secrets/private keys are not tracked
- failure-mode evidence where relevant
- app readiness/API proof where relevant
- claim-boundary statement
- rollback or follow-up limitation notes

Evidence belongs under:

```text
docs/evidence/qa/
```

Do not copy real CA secrets, MSP keystores, wallets, private keys, channel
blocks, or generated connection profiles into the repository.

## Known Non-Goals

This gap register does not implement:

- new runtime code
- new chaincode
- production Fabric deployment
- payment settlement
- ERP/accounting production integration
- formal Shariah certification
- production legal-signature verification

It is a release-readiness control that keeps PBI-438's completed lab evidence
separate from future pilot and production operations claims.
