# External API Gateway Contract

Date: 2026-05-26

Status: MVP integration boundary

## Purpose

The external API gateway defines a safe boundary for future IoT, logistics, ERP, payment callback, and external proof verification clients. External schemas and protocols remain adapter inputs/outputs; they do not replace the internal procurement, escrow, proof, or audit domain models.

## Claim Boundary

This contract does not implement production payment execution, ERP integration, IoT/EPCIS integration, production Fabric consortium operation, or production bank certification. It provides authenticated and audited intake foundations only.

## Client Credential Model

External clients are represented by:

- `clientId`
- `clientName`
- `scopes`
- `status`
- `secretHash`
- `createdAt`
- `revokedAt`

Raw shared secrets must not be returned in API responses or logged.

## Supported Scopes

- `evidence:write`
- `logistics:write`
- `payment:callback`
- `erp:sync`
- `proof:verify`

## Authentication Headers

Every external request must include:

- `x-client-id`
- `x-request-timestamp`
- `x-signature`
- `idempotency-key`

Timestamp skew must be within the configured request window. The MVP default is five minutes.

## HMAC Signature

The MVP signed request payload is:

```text
<HTTP_METHOD>
<REQUEST_PATH>
<X_REQUEST_TIMESTAMP>
<IDEMPOTENCY_KEY>
<CANONICAL_JSON_BODY>
```

The signature header uses:

```text
x-signature: sha256=<hex-hmac-sha256>
```

The HMAC secret is configured out-of-band. The application stores or compares only the configured secret hash for the client credential model.

## Idempotency

`idempotency-key` is scoped by:

- `clientId`
- route
- idempotency key

First accepted request returns HTTP `202`. Replayed request with the same key returns HTTP `200` with `replayed: true` and the original `requestId`.

## MVP Route

### POST `/api/v1/external/proof/verify`

Required scope:

```text
proof:verify
```

Request body:

```json
{
  "eventId": "event-123",
  "payloadHash": "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Success response:

```json
{
  "data": {
    "accepted": true,
    "replayed": false,
    "requestId": "uuid",
    "clientId": "proof-client",
    "scope": "proof:verify"
  }
}
```

Replay response:

```json
{
  "data": {
    "accepted": true,
    "replayed": true,
    "requestId": "original-request-id",
    "clientId": "proof-client",
    "scope": "proof:verify"
  }
}
```

## Error Semantics

All errors use the existing API error envelope:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "External request signature is invalid"
  }
}
```

Expected error categories:

- `UNAVAILABLE`: signing secret not configured
- `UNAUTHORIZED`: missing headers, unknown client, revoked client, stale timestamp, invalid signature
- `FORBIDDEN`: client is valid but lacks required scope
- `VALIDATION_ERROR`: authenticated request body is invalid

## Audit Requirement

Every accepted or rejected external request must record an external API audit event with:

- `eventId`
- `occurredAt`
- `clientId` when known
- `action`
- `route`
- `method`
- `outcome`
- `reason` when rejected or replayed
- `idempotencyKey` when supplied

Do not log raw secrets, raw commercial documents, raw KYC data, payment credentials, or private blockchain payloads.

## Rate Limiting

The MVP includes a documented rate-limit placeholder only. Production or pilot deployment must add a real rate limiter at the gateway, reverse proxy, or adapter layer.
