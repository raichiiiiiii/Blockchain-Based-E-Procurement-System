# Known Limitations And Post-MVP Roadmap

Status: Deployment-ready MVP release note  
Date: 2026-05-26

## Delivered MVP Boundary

The MVP demonstrates actor-ready local procurement workflows, PostgreSQL-backed persistence where adapters exist, a local Fabric AuditAnchor baseline, backend proof APIs, blockchain proof UI, escrow first slice, export bundles, and a PLS/Shariah seedbed.

## Known Limitations

- Fabric is a local sandbox/test-network baseline, not a production consortium deployment.
- Payment rails are not integrated; escrow and PLS distribution flows do not execute external payments.
- ERP integration is not included.
- DID/VC federation is not included.
- Tokenized receivables and full receivables lifecycle are not included.
- Full arbitration/dispute workflow is not included.
- Multi-jurisdiction policy engine is not included.
- Fabric private data collections are not implemented.
- Automated consortium governance, CA lifecycle hardening, and production key management are not implemented.
- Runtime PostgreSQL composition persists implemented repositories only: auth/session, membership/RBAC, access audit, procurement lifecycle events, blockchain anchor metadata, and escrow records.
- Procurement orders, KYC cases, export bundles, Shariah reviews, and PLS contracts still use in-memory repositories in the default runtime unless supplied by a future adapter.
- Security operator workflow is read-only and demo-oriented; a persistent security alert read model remains future work.
- Export bundle signing is MVP-equivalent integrity metadata, not production external signing or regulator portal integration.
- PLS workflows are seedbed simulations and must not be represented as guaranteed profit, guaranteed principal, or production Islamic finance compliance.

## Post-MVP Roadmap

- Add remaining PostgreSQL adapters for orders, onboarding cases, export bundles, Shariah reviews, and PLS contracts.
- Automate a live Fabric smoke script beyond the documented peer CLI path.
- Add production-grade Fabric identity, CA, channel lifecycle, and private data collection design.
- Add external payment/settlement integration behind an approved compliance boundary.
- Add production export signing and key management.
- Add full dispute/arbitration workflow.
- Add DID/VC onboarding evidence federation where jurisdictionally appropriate.
- Add operational observability, audit retention policy, backup/restore playbooks, and incident response drills.
- Add security alert persistence and escalation workflows.

## Release Guardrails

- Do not expose raw KYC/AML documents, commercial terms, invoice payloads, payment credentials, personal data, or organization-sensitive documents on-chain.
- Do not use Fabric as the application database.
- Do not treat UI hiding as authorization; backend routes must reject unauthorized actions.
- Do not show fake transaction IDs or verified states in proof UI.
- Do not imply production Islamic finance certification from the PLS seedbed.
