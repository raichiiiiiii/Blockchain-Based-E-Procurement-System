# Contract Negotiation and Machine-Readable Terms Contract

Date: 2026-05-26

Status: MVP pilot-hardening contract. This is not a production legal-document automation system, payment settlement system, ERP integration, or formal Shariah certification workflow.

## Purpose

This contract defines the first machine-readable contract and negotiation seam for the Digital Procurement and PLS Seedbed MVP. It connects a human-readable document reference to a structured terms model, versioned terms hash, offer history, acceptance records, and lifecycle events.

## Scope

Included:

- Create a contract record with buyer, supplier, optional financier, human document reference, machine-readable terms, and deterministic terms hash.
- Submit revised offers with new terms hash and actor metadata.
- Record buyer and supplier acceptance against the current terms version and hash.
- Retain lifecycle events for registration, KYC approval, network membership, private network establishment, contract creation, offer submission, and acceptance.
- Expose authenticated APIs for the contract workspace.

Excluded:

- Production legal signing.
- Real payment execution.
- ERP/accounting sync.
- Full clause redlining editor.
- External Shariah certificate issuance.
- Automatic escrow release.

## API

All routes require authenticated bearer-session context.

### `GET /api/v1/contracts`

Returns contracts visible to the authenticated actor.

Visibility:

- buyer/supplier/financier organization can read contracts where their organization is a party.
- administrator, auditor, regulator, compliance reviewer, security operator, and Shariah reviewer can read for governance/review.

### `POST /api/v1/contracts`

Creates a contract terms record.

Allowed roles:

- administrator
- buyer
- supplier

Non-administrator users can create only for their own buyer or supplier organization.

Required fields:

- `contractNumber`
- `buyerOrganizationId`
- `supplierOrganizationId`
- `machineReadableTerms.lineItems`
- `machineReadableTerms.deliveryTerms`
- `machineReadableTerms.acceptanceCriteria`
- `machineReadableTerms.escrowReleaseConditions`
- `machineReadableTerms.paymentTerms`
- `machineReadableTerms.disputeAndArbitrationRules`

### `GET /api/v1/contracts/:contractId`

Returns one visible contract.

### `POST /api/v1/contracts/:contractId/offers`

Submits revised machine-readable terms. The current MVP resets acceptances when a new offer changes the active terms hash.

Allowed writers:

- administrator
- buyer organization party
- supplier organization party
- financier organization party

### `POST /api/v1/contracts/:contractId/acceptance`

Records buyer or supplier acceptance against the current terms hash.

Acceptance is complete when both buyer and supplier acceptance records exist for the current hash.

## Machine-Readable Terms

The internal terms model is canonical for the application. External standards are mapping targets, not replacements for the domain model.

Fields:

- `parties`
- `lineItems`
- `deliveryTerms`
- `acceptanceCriteria`
- `escrowReleaseConditions`
- `paymentTerms`
- `disputeAndArbitrationRules`
- `plsTerms`
- `documentReferences`
- `clauseReferences`
- `ocdsMapping`
- `ublMapping`

The `termsHash` is generated from stable JSON canonicalization and stored as `sha256:<hex>`.

## Standards Mapping

OCDS is used as an optional transparency/export mapping for contracting and implementation metadata. See the official OCDS schema and release reference:

- https://standard.open-contracting.org/latest/en/schema/
- https://standard.open-contracting.org/latest/en/schema/reference/

UBL/Peppol-style fields are used as import/export references for order, despatch advice, invoice, and related procurement document exchange. See:

- https://docs.oasis-open.org/ubl/UBL-2.1.html
- https://docs.peppol.eu/poacc/billing/3.0/

GS1 EPCIS remains a future delivery/logistics proof mapping target rather than part of the contract model. See:

- https://ref.gs1.org/standards/epcis/2.0.0/

## Privacy and Integrity

- Raw commercial documents are referenced by document ID only.
- Raw documents are not returned through the contract API.
- Raw contract text is not written on-chain.
- Terms hash can be anchored by later proof workflows.
- Acceptance records bind actor, party, version, hash, and timestamp.

## Current Limitations

- In-memory contract repository only.
- No PostgreSQL contract persistence in this slice.
- No production redline editor.
- No formal legal signing.
- No automatic downstream order/escrow creation.
- No ERP, UBL, Peppol, or OCDS export API in this slice.
