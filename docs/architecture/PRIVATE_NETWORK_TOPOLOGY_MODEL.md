# Private Network Topology Model

Date: 2026-06-01

## Purpose

This model documents the pilot-hardening graph used by the Digital Procurement and PLS Seedbed MVP to explain how companies, governed relationships, proof boundaries, and external adapter boundaries relate to each other.

The graph is a product-read model. It is not a production Fabric consortium deployment, ERP integration, legal certification, or logistics network implementation.

## Node Types

| Node type | Meaning |
|---|---|
| `platformOperator` | Platform governance and operations organization. |
| `buyer` | Procurement buyer or regulated purchaser organization. |
| `supplier` | SME or supplier organization participating in procurement. |
| `financier` | Financing partner for restricted PLS seedbed review. |
| `regulator` | Reporting or supervisory review organization. |
| `auditor` | Audit and proof-review actor or organization. |
| `compliance` | Compliance or KYC/AML reviewer function. |
| `shariah` | Shariah review function for restricted PLS governance. |
| `security` | Security operator function for denied actions and proof failures. |
| `fabricProofBoundary` | Boundary node representing proof anchoring, not a full production consortium. |
| `apiIntegrationClient` | Boundary node representing authenticated external API clients. |
| `erpAccountingAdapter` | Boundary node for UBL/OCDS/Peppol-style import/export mapping. |
| `logisticsProofProvider` | Boundary node for future IoT, QR, or EPCIS-compatible proof intake. |
| `unknown` | Safe fallback when a node cannot be classified from current metadata. |

## Edge Types

| Edge type | Meaning |
|---|---|
| `membership` | Organization membership, role assignment, or platform governance relationship. |
| `procurement` | Buyer-supplier procurement relationship. |
| `financing` | Financing or PLS seedbed relationship. |
| `complianceReview` | Compliance/KYC review relationship. |
| `shariahReview` | Shariah review relationship. |
| `auditReview` | Audit, regulator, or reporting review relationship. |
| `proofAnchoring` | Hash/proof metadata boundary for blockchain evidence. |
| `externalApi` | Authenticated external API boundary for adapters. |
| `erpSync` | ERP/accounting mapping boundary. |
| `logisticsProof` | External delivery proof boundary. |
| `unknown` | Safe fallback when an edge cannot be classified. |

## Runtime Projection

The backend graph route enriches the organization graph with typed nodes and typed edges:

- real organization nodes come from the organization-network read model
- synthetic boundary nodes explain proof, integration, ERP, and logistics boundaries
- synthetic boundary edges are labeled with explicit claim boundaries
- no raw KYC data, commercial documents, delivery payloads, or payment credentials are exposed in the graph

The frontend displays node type, relationship or edge type, and claim boundary metadata in the organization network workspace.

## Claim Boundaries

The topology must be described as:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

Do not present this graph as:

- a live production Hyperledger Fabric consortium
- a production ERP or accounting connection
- a production logistics/EPCIS integration
- formal Shariah certification
- legal document-signature verification

## Future Hardening

Future production-extension work can replace synthetic boundary nodes with live adapter status and signed integration evidence after the relevant external infrastructure is implemented and validated.
