# Procurement Standards Mapping Research

Date: 2026-05-30
Status: production-extension research closure
Related roadmap rows: PBI-462, PBI-436

## Purpose

This research maps public procurement and business-document standards to the platform's machine-readable contract, ERP/accounting, export, delivery evidence, and payment mapping boundaries.

The standards are used as adapter and reporting references. They do not replace the internal procurement, escrow, PLS, audit, or proof domain models.

## Official Sources Checked

- Open Contracting Data Standard: https://www.open-contracting.org/data-standard/
- OCDS schema reference: https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS Universal Business Language 2.4: https://docs.oasis-open.org/ubl/UBL-2.4.html
- Peppol BIS version 3 documentation: https://docs.peppol.eu/poacc/upgrade-3/
- GS1 EPCIS 2.0.1 standard: https://ref.gs1.org/standards/epcis/2.0.1/
- ISO 20022 message definitions: https://www.iso20022.org/iso-20022-message-definitions
- ISO 20022 repository overview: https://www.iso20022.org/financial-repository

## Research Findings

### OCDS

OCDS is the best fit for regulator/reporting exports and public-procurement transparency views. The official data-standard material organizes procurement disclosure around planning, tender, award, contract, and implementation stages. In this platform, OCDS should be used for export packages and contract release mappings, not operational workflow storage.

Platform mapping:

| OCDS area | Platform source | Current or target mapping |
|---|---|---|
| Planning | Procurement program metadata, buyer organization, funding/financing context | Future export metadata only |
| Tender | Buyer order intent, line items, buyer requirements | Machine-readable contract/order fields |
| Award | Accepted supplier/order relationship | Order acceptance lifecycle event and contract parties |
| Contract | Machine-readable contract, terms hash, linked documents, signatures | Contract release package export |
| Implementation | Delivery evidence, escrow state, payment instruction status, export bundle evidence | Regulator bundle and audit/proof timeline |

### UBL and Peppol

UBL provides procurement and supply-chain document schemas such as Order, Order Response, Despatch Advice, Receipt Advice, and Invoice. Peppol BIS provides profile and rule guidance for post-award transactions including Order, Order Response, Despatch Advice, and Invoice Response.

Platform mapping:

| UBL/Peppol document area | Platform source | Current or target mapping |
|---|---|---|
| Order | Buyer procurement order | `ublOrder` local JSON export |
| Order Response | Supplier acknowledgement/acceptance | Future export profile; current supplier acknowledgement is internal |
| Despatch Advice | Delivery evidence metadata and accepted order | `ublDespatchAdvice` local JSON export |
| Invoice | Accepted order/payment context | `ublInvoice` local JSON export |
| Invoice Response | Buyer review, payment status, dispute state | Future export profile |

The current implementation intentionally emits UBL/Peppol-like JSON artifacts, not certified UBL XML or Peppol network messages.

### EPCIS

EPCIS is appropriate for external logistics visibility data and supports event families such as ObjectEvent, AggregationEvent, TransactionEvent, TransformationEvent, and AssociationEvent. In this platform, EPCIS-compatible intake should create safe delivery evidence and lifecycle metadata first, then expose hashes and proof references where appropriate.

Platform mapping:

| EPCIS event family | Platform source | Current or target mapping |
|---|---|---|
| ObjectEvent | Shipment or item observed, received, inspected, or delivered | External EPCIS route maps to delivery evidence |
| AggregationEvent | Package/pallet/container relationship | Future logistics metadata extension |
| TransactionEvent | Link between physical/digital object and order/contract transaction | External EPCIS route can link orderId and business transaction metadata |
| TransformationEvent | Processing/transformation of goods | Future manufacturing or value-add workflow |
| AssociationEvent | Association between objects and parent/container or transaction context | Future custody/relationship metadata |

The platform does not claim a full EPCIS capture/query repository, production device PKI, or external logistics network integration.

### ISO 20022

ISO 20022 provides a financial message-definition discipline through a repository with a Data Dictionary and Business Process Catalogue. Payment initiation and payment status artifacts should stay behind the payment adapter boundary.

Platform mapping:

| ISO 20022 area | Platform source | Current or target mapping |
|---|---|---|
| Payments Initiation | Payment instruction created from settlement-ready escrow | ISO 20022-like payment initiation JSON |
| Payment status | Sandbox/manual reconciliation status | ISO 20022-like payment status JSON |
| Remittance/reference data | Escrow ID, order ID, contract reference, payment reference | Adapter-level remittance metadata |
| Message schemas | Future bank-specific implementation | Not implemented; no bank certification claimed |

The current implementation is mapping-only and does not execute bank payments or claim ISO 20022 certification.

## Machine-Readable Contract Field Justification

The machine-readable contract model should retain the following field groups because they support both internal workflow integrity and standards-based exports:

| Field group | Reason |
|---|---|
| Parties and registration numbers | Needed for OCDS parties, UBL buyer/supplier parties, audit attribution, and eligibility gates |
| Line items, quantities, unit prices, currency | Needed for UBL Order/Invoice and OCDS contract value |
| Delivery terms, location, acceptance criteria | Needed for delivery evidence, Despatch Advice-style mapping, and escrow release conditions |
| Payment terms and escrow release conditions | Needed for payment instruction generation and ISO 20022-like remittance references |
| PLS terms and Shariah references | Needed for restricted PLS seedbed governance without claiming production Islamic finance certification |
| Document references, signature status, hashes | Needed for audit/export bundles and proof anchoring without storing raw documents on-chain |
| Clause references and version | Needed for negotiation history, deterministic terms hash, and amendment traceability |

## Adapter Boundary Decisions

- Internal domain models remain canonical for workflow decisions.
- OCDS, UBL, Peppol, EPCIS, and ISO 20022 mappings are import/export or integration profiles.
- Mapping failures must return explicit `mappingErrors` and must not mutate operational workflow state.
- Idempotency is required for external/import/export requests that can be retried.
- Raw documents, raw delivery payloads, payment credentials, and unrestricted contract text must not be written on-chain.
- Proof views must distinguish `pending`, `unavailable`, `failed`, `notFound`, `mismatch`, and `verified`.

## Current Implementation Alignment

- Machine-readable contract model includes parties, line items, delivery terms, acceptance criteria, escrow release conditions, PLS terms, document references, clause references, UBL/OCDS mapping fields, and deterministic terms hash.
- ERP/accounting adapter emits local JSON artifacts for UBL/Peppol-like Order, Invoice, Despatch Advice, payment status, journal event, and OCDS-like contract release package.
- External API gateway accepts signed scoped external delivery proof requests, including EPCIS-compatible event intake, and maps them to safe delivery evidence metadata.
- Payment adapter emits ISO 20022-like payment initiation/status JSON for review only.
- Export bundle and proof surfaces preserve claim-safe integrity metadata without claiming production signing, payment execution, or production Fabric operation.

## Remaining Production Work

- Certified UBL XML generation and validation.
- Peppol access point delivery.
- Full OCDS release package export and validation.
- Full EPCIS capture/query repository and logistics partner integration.
- Real ISO 20022 bank rail connectivity, bank-specific validation, and certification.
- Production-grade schema registry and mapping governance.

## Closure Decision

PBI-462 acceptance criteria are satisfied for research-spike closure: machine-readable contract and ERP/export mappings now have justified field sets, official references, and explicit adapter-boundary decisions.
