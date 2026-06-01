# Procurement Process Tree

```mermaid
flowchart LR
  Need --> Approval --> RFQ --> Quotation --> Award --> PO["Purchase order"]
  PO --> Acceptance --> Delivery --> Invoice --> Match["Three-way match"]
  Match --> Escrow --> Proof --> Exception["Dispute/exception"] --> Closeout
```

| Stage | Implemented? | UI? | API? | PostgreSQL persistent? | In-memory only? | Proof/audit backed? | Research requirement? | Gap |
|---|---|---|---|---|---|---|---|---|
| Need / requisition | Yes | SourceToAwardPage | `POST /source-to-award/requisitions` | Yes, `source_to_award_cases` | Tests only | Case state, not direct proof | S2C process start | Spend policy and budget integration missing. |
| Approval | Yes | SourceToAwardPage | `POST /source-to-award/requisitions/:id/approve` | Yes | Tests only | Stored in case JSON | Approval control | Approval matrix is simple. |
| RFQ | Yes | SourceToAwardPage | `POST /source-to-award/rfqs` | Yes | Tests only | Stored in case JSON | RFQ process | No external supplier portal notification guarantee. |
| Quotation | Yes | Supplier flow and SourceToAwardPage | `POST /source-to-award/rfqs/:id/quotations` | Yes | Tests only | Stored in case JSON | Supplier quotation | No signed quotation document workflow. |
| Evaluation / award | Yes | SourceToAwardPage | `POST /source-to-award/rfqs/:id/award` | Yes | Tests only | Award can hand off to order | Supplier evaluation | Scoring model is MVP-level. |
| Purchase order | Yes | Orders | `POST /orders`, `GET /orders` | Yes | Tests only | Lifecycle event and payload hash | P2P order | No ERP purchase order posting. |
| Supplier acceptance | Yes | Supplier dashboard | `POST /orders/:orderId/acknowledgement` | Yes | Tests only | Lifecycle event | Supplier acknowledgement | No external legal acceptance signature. |
| Delivery evidence / receipt | Yes, metadata/hash | Delivery Evidence panel | `POST/GET /orders/:orderId/delivery-evidence` | Yes | Tests only | `deliveryEvidenceSubmitted` and proof state | Receipt/proof | Production IoT/QR/EPCIS remains adapter foundation. |
| Invoice | Yes | InvoiceWorkspacePage | `POST /invoices`, `GET /invoices/:id` | Yes, migration 019 | Tests only | Invoice hash and events | Accounts payable | No tax/e-invoice network integration. |
| Three-way match | Yes | InvoiceWorkspacePage | `POST /invoices/:id/verify-match` | Yes | Tests only | Match result persisted | Invoice exception control | Match logic is deterministic MVP. |
| Escrow / payment readiness | Yes | Escrow, Payments | escrow and payment routes | Yes | Tests only | Escrow and payment instruction states auditable | Settlement readiness | No real settlement execution. |
| Audit / proof | Yes | Audit Trail, Blockchain Proof | transaction history, access history, blockchain anchors | Yes | Tests only plus lab Fabric docs | Fabric/local proof boundary | Non-repudiation | Production Fabric operations not certified. |
| Dispute / exception handling | Yes, MVP | Escrow lifecycle | escrow dispute/arbitration routes | Yes | Tests only | State transitions auditable | Exception handling | No external arbitration integration. |
| Closeout / supplier performance | Yes | SupplierPerformancePage | `POST /procurement-cases/:caseId/closeout` | Yes, migration 019 | Tests only | Closeout metrics and evidence references | Feedback loop | No long-run supplier benchmark history. |

## Current Coverage Judgment

The repository now covers the core S2C and P2P chain for supervisor-demo and selected pilot-hardening review. The strongest remaining product decision is not "more pages"; it is whether to deepen procurement policy controls, payment integration, or external delivery/document trust next.
