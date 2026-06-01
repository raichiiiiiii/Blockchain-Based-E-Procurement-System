# Product Owner Decision Map

## Current Product Thesis

The repository is best understood as a compliance-first procurement evidence platform. Its strongest differentiator is not "blockchain everywhere"; it is a coherent chain of controlled procurement records, role-based actions, audit events, proof hashes, and conservative PLS seedbed governance.

Current readiness:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

## What Is Truly Working

1. Credential-only sign-in and server-derived actor context.
2. Role-specific dashboards and navigation.
3. Organization registration/profile/network graph with safe metadata.
4. Membership and RBAC governance.
5. KYC/AML eligibility workflow.
6. Source-to-award workflow from requisition through award.
7. Purchase orders, supplier acknowledgement, delivery evidence, invoice review, and closeout.
8. PostgreSQL persistence for critical MVP/pilot-hardening records through migration 019.
9. Blockchain proof lookup/verification with honest proof states.
10. Export bundle, local signing, and evidence review workflow.

## What Is Only Partially Working

1. Productivity saved views and tasks are useful but not fully collaborative/durable.
2. Payment is manual/sandbox only.
3. ISO 20022 is mapping only.
4. ERP/accounting is local JSON adapter only.
5. Document processing is metadata/local extraction only.
6. IoT/QR/EPCIS delivery proof is adapter foundation only.
7. PLS is seedbed/simulation only.
8. Shariah certificates are artifact tracking only.
9. Fabric is lab/proof infrastructure, not managed production consortium.
10. Export signing is local software-key only.

## What Looks Implemented But Needs Caution

- Production-extension PBIs marked Completed often mean "foundation", "adapter", or "lab-proven", not production operation.
- Organization graph channel nodes describe proof/visibility scope, not live Fabric channels for every relationship.
- Company ledger is a read-model projection, not a private ledger.
- Proof verifies payload hash integrity, not business truth or legal compliance.
- PLS scenario output explains allocation logic, not actual finance operations.

## Top 10 Product Risks

1. Overclaiming commercial or production readiness.
2. Stakeholders mistaking proof anchoring for full business validation.
3. PLS language implying certification or guaranteed return.
4. Payment/ISO mapping being mistaken for bank execution.
5. ERP adapter being mistaken for live ERP connectivity.
6. Incomplete OpenAPI coverage for implemented routes.
7. Demo data being mistaken for real KYC/payment/commercial data.
8. Role labels becoming confusing across buyer/procurement/finance actors.
9. Product direction splitting between procurement depth, blockchain ops, and financing depth.
10. Lack of external stakeholder UAT.

## Top 10 Technical Risks

1. Production secrets, identity, and certificate lifecycle are not operationalized.
2. Production Fabric operations require substantial governance and monitoring.
3. External API needs rate limiting/key rotation for real clients.
4. Document storage/extraction needs production object storage and scanning.
5. Payment status reconciliation needs real adapter failure handling.
6. OpenAPI contract needs expansion to all route groups.
7. Productivity process-local state may surprise multi-user pilots.
8. Policy matrices for approvals/spend thresholds are under-modeled.
9. Browser smoke is not a substitute for automated E2E regression.
10. Backup/restore runbooks need real environment drills.

## Top 10 Research-to-Product Gaps

1. Procurement process depth versus broad feature surface.
2. Budget/category/catalog controls.
3. Supplier master-data verification.
4. Contract obligation tracking.
5. Real invoice exception management and AP integration.
6. Supplier performance history and analytics.
7. Mudarabah due diligence and financial accounting.
8. Shariah/legal review outside repository artifacts.
9. Production Fabric consortium governance.
10. Evidence export/legal retention policy.

## Recommended Next Build Order

1. Complete OpenAPI coverage for all implemented route groups.
2. Add procurement policy controls: approval thresholds, categories, budget checks.
3. Add durable productivity state if multi-user company operations are desired.
4. Run full PostgreSQL restart smoke for source-to-award, invoice, and closeout.
5. Add automated browser/E2E smoke for the canonical Amanah-Barakah-Mabrur case.
6. Deepen invoice exception workflow and AP readiness.
7. Expand contract obligation tracking before ERP work.
8. Prepare stakeholder UAT pack for buyer/supplier/compliance/auditor.
9. Only then decide between payment, Fabric operations, or PLS depth.
10. Defer commercial claims until external controls are proven.

## Features To Defer

- Real payment execution.
- Production Fabric consortium operations.
- Formal Shariah certification.
- Production ERP/Peppol/ISO 20022 certification.
- Device PKI and production logistics network integration.
- DID/VC federation.

## Evidence Confidence Summary

| Area | Confidence | Reason |
|---|---:|---|
| Auth/session/RBAC | 6 | Route tests, browser smoke, seeded credentials. |
| Source-to-award/invoice/closeout | 5 | API tests and PostgreSQL persistence, limited browser smoke. |
| Delivery/order/escrow | 5 to 6 | Strong route/evidence coverage; no real payment. |
| Blockchain proof | 6 for app/lab evidence, 0 for production ops | Proof APIs and lab evidence exist; production operations not claimed. |
| PLS/Shariah | 5 | Seedbed and certificate artifact tracking; no external certification. |
| Integrations | 3 to 5 | Adapter foundations and tests; no live external systems. |
| Frontend journey | 4 to 6 | Build and smoke evidence; E2E automation limited. |

## Product Direction Options

### Option A: Procurement Workflow Depth First

Best if the goal is a credible pilot with buyers/suppliers. Build policy controls, exception handling, and automated UAT.

### Option B: Distributed/Self-Hosted Topology First

Best if stakeholders care most about Fabric/network architecture. Higher operational cost and risk.

### Option C: Financing/Mudarabah Depth First

Best if the product thesis is Islamic SME financing. Requires formal Shariah/legal and accounting review early.

### Option D: UX/Network Graph Depth First

Best if the goal is stakeholder delight and demo clarity. Useful, but should not replace workflow depth.

## Recommended Decision

Choose Option A next: procurement workflow depth first. It is the most directly supported by the research, the current implementation, and the product's market positioning. Keep Fabric, payment, ERP, and PLS as bounded proof/integration/seedbed tracks until external stakeholders validate the core procurement workflow.
