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
- Runtime PostgreSQL composition persists the current MVP-critical repositories including auth/session, membership/RBAC, access audit, procurement lifecycle events, procurement orders, delivery evidence metadata, blockchain anchor metadata, escrow records, KYC/AML onboarding cases, Shariah reviews, PLS contracts/distributions, export bundles, and operational incidents.
- Documents, machine-readable contract negotiation records, external API credentials/idempotency/audit, payment instructions, and ERP/accounting jobs still need later persistence hardening before broader pilot claims.
- Security operator workflow is read-only; operational readiness incidents and security alert source data are persistent where backed by PostgreSQL, but external SIEM/escalation workflow remains future work.
- Export bundle signing uses a local software-key detached manifest signature, not production KMS/HSM custody, external signing, or regulator portal integration.
- PLS workflows are seedbed simulations and must not be represented as guaranteed profit, guaranteed principal, or production Islamic finance compliance.

## Post-MVP Roadmap

- Add remaining PostgreSQL adapters for document metadata, contract negotiation records, external API credentials/idempotency/audit, payment instructions, and ERP/accounting jobs.
- Automate a live Fabric smoke script beyond the documented peer CLI path.
- Add production-grade Fabric identity, CA, channel lifecycle, and private data collection design.
- Add external payment/settlement integration behind an approved compliance boundary.
- Add production export signing and key management.
- Add full dispute/arbitration workflow.
- Add DID/VC onboarding evidence federation where jurisdictionally appropriate.
- Add operational observability, audit retention policy, backup/restore playbooks, and incident response drills.
- Add security alert escalation workflows and external monitoring integrations.

## Release Guardrails

- Do not expose raw KYC/AML documents, commercial terms, invoice payloads, payment credentials, personal data, or organization-sensitive documents on-chain.
- Do not use Fabric as the application database.
- Do not treat UI hiding as authorization; backend routes must reject unauthorized actions.
- Do not show fake transaction IDs or verified states in proof UI.
- Do not imply production Islamic finance certification from the PLS seedbed.
