# IoT, QR, and EPCIS Delivery Proof Contract

Date: 2026-05-26

## Purpose

This contract defines the pilot-hardening delivery proof intake boundary for external IoT devices, QR proof clients, and EPCIS-compatible logistics systems. It extends the MVP delivery evidence workflow by accepting signed external requests, validating safe metadata, recording delivery evidence, and emitting procurement lifecycle events.

This is not production IoT infrastructure, legal QR signature certification, a full EPCIS repository, or a production logistics integration.

## Standards References

- GS1 EPCIS is used as an adapter-facing visibility-event reference for physical or digital object movement. GS1 describes EPCIS as a data-sharing standard for supply-chain visibility and pairs it with the Core Business Vocabulary.
- The EPCIS 2.0.1 standard includes the event families accepted by this MVP boundary: ObjectEvent, AggregationEvent, TransactionEvent, TransformationEvent, and AssociationEvent.
- GS1 CBV terms such as business step, disposition, and read point are treated as external metadata fields and do not replace the platform's internal procurement lifecycle model.

## Authentication

All endpoints require the external API gateway signature headers:

- `x-client-id`
- `x-request-timestamp`
- `x-signature`
- `idempotency-key`

Requests are signed with the configured HMAC shared secret. The signature covers method, path, timestamp, idempotency key, and canonical request body. Requests outside the allowed timestamp window are rejected. Replayed idempotency keys return the original request id and do not create duplicate delivery evidence.

## Endpoints

### POST /api/v1/external/iot/events

Required scope: `evidence:write`

Required fields:

- `orderId`
- `supplierOrganizationId`
- `deviceId`
- `eventType`
- `observedAt`

Optional fields:

- `locationId`
- `readingSummary`
- `evidenceReference`
- `payloadHash`

Result:

- Creates a delivery evidence record with `evidenceType=inspectionRecord`.
- Emits `deliveryProofSubmitted`.
- Stores only safe reference, notes, evidence hash, lifecycle event id, and proof status.

### POST /api/v1/external/qr/proofs

Required scope: `evidence:write`

Required fields:

- `orderId`
- `supplierOrganizationId`
- `qrProofId`
- `publicKeyId`
- `signature`

Optional fields:

- `observedAt`
- `payload`
- `evidenceReference`
- `payloadHash`

Result:

- Creates a delivery evidence record with `evidenceType=deliveryNote`.
- Emits `deliveryProofSubmitted`.
- Validates signature metadata format only in this slice. Production public-key signature verification is a later adapter.

### POST /api/v1/external/epcis/events

Required scope: `logistics:write`

Required fields:

- `orderId`
- `supplierOrganizationId`
- `type`
- `eventTime`

Supported `type` values:

- `ObjectEvent`
- `AggregationEvent`
- `TransactionEvent`
- `TransformationEvent`
- `AssociationEvent`

Optional fields:

- `bizStep`
- `disposition`
- `readPoint`
- `epcList`
- `evidenceReference`
- `payloadHash`

Result:

- Creates a delivery evidence record with `evidenceType=warehouseReceipt`.
- Emits `logisticsEventRecorded`.
- Stores EPCIS-compatible summary metadata only.

## Authorization and Order Rules

External delivery proof is accepted only when:

- the signed external client has the required scope,
- the order exists,
- the submitted supplier organization matches the order supplier,
- the order status is `accepted`,
- validation passes.

The external client cannot claim a buyer, administrator, auditor, or platform role. The intake service maps the signed external client to a supplier-scoped submission context for the matching supplier organization and then reuses the existing delivery evidence authorization service.

## Proof and Privacy Boundary

Raw IoT readings, QR payloads, EPCIS payloads, documents, commercial terms, and credentials are not written on-chain. The platform stores proof-level hashes, safe references, lifecycle event ids, and anchor status metadata.

If a payload hash is supplied, it must use `sha256:<64 lowercase-or-uppercase-hex>`. If no payload hash is supplied, the platform computes a SHA-256 hash from the received request body for proof integrity while storing only safe metadata in the delivery evidence record.

## Response Shape

Accepted requests return:

```json
{
  "data": {
    "accepted": true,
    "replayed": false,
    "requestId": "request-id",
    "clientId": "external-client",
    "scope": "evidence:write",
    "evidence": {
      "evidenceId": "delivery_evidence_id",
      "orderId": "order-id",
      "evidenceType": "inspectionRecord",
      "evidenceHash": "sha256:...",
      "verificationStatus": "metadataRecorded",
      "lifecycleEventId": "event-id",
      "anchorStatus": "anchored"
    }
  }
}
```

Rejected requests use the shared API error envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "External IoT event payload is invalid"
  }
}
```

## Known Limitations

- No production device registry or certificate authority is implemented.
- QR proof signature verification is metadata-level only; no public-key cryptographic verifier is claimed.
- EPCIS support is a compatible intake mapping, not a complete EPCIS capture/query repository.
- No external logistics network, ERP, or carrier integration is implemented.
- No raw external payload is exposed in product proof panels.
