# API Quickstart

Status: Deployment-ready MVP baseline  
Audience: Developer / Integrator

## Purpose

This quickstart shows how to authenticate locally and call the core demo APIs for procurement, escrow, blockchain proof, export bundles, and PLS financing. Examples use local demo credentials only.

## Start Services

```powershell
.\scripts\start-local-demo.ps1
```

Default API base URL:

```text
http://localhost:3100/api/v1
```

## Sign In

```powershell
$baseUrl="http://localhost:3100/api/v1"
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/auth/login" `
  -ContentType "application/json" `
  -Body '{"username":"buyer.demo","password":"demo-password"}'
$token = $login.data.sessionToken
$headers = @{ Authorization = "Bearer $token" }
```

Use the demo account that matches the API path:

```text
admin.demo
buyer.demo
supplier.demo
compliance.demo
shariah.demo
financier.demo
auditor.demo
regulator.demo
security.demo
```

## Orders

Create an order as Buyer:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/orders" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"supplierOrganizationId":"demo-supplier-org","title":"Halal packaging supply","description":"Metadata-safe procurement demo order","amount":"12000.00","currency":"MYR"}'
```

List orders visible to the signed-in actor:

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/orders" -Headers $headers
```

Acknowledge an assigned order as Supplier:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/orders/<orderId>/acknowledgement" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"decision":"accept"}'
```

## Escrow

Create escrow as Buyer after an accepted order exists:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/escrows" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"orderId":"<acceptedOrderId>","buyerOrganizationId":"demo-buyer-org","supplierOrganizationId":"demo-supplier-org","termsHash":"sha256:1111111111111111111111111111111111111111111111111111111111111111","acceptedOrderReference":"accepted-order-demo"}'
```

Read escrow as Buyer, Auditor, or Security Operator:

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/escrows/<escrowId>" -Headers $headers
```

Escrow responses expose hashes, lifecycle identifiers, status, and proof metadata only. Raw commercial terms and payment credentials are not returned.

## Blockchain Proof

Sign in as Auditor or Security Operator, then retrieve and verify proof metadata:

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/blockchain/anchors/<eventId>" -Headers $headers
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/blockchain/anchors/<eventId>/verify" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"payloadHash":"sha256:<64-hex-value>"}'
```

Expected verification states:

```text
verified
mismatch
notFound
unavailable
```

Missing proof must not display a fabricated transaction ID.

## Export Bundles

Sign in as Regulator or Auditor:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/export-bundles" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"scope":"combinedAudit","purpose":"Supervisor walkthrough","occurredFrom":"2026-01-01T00:00:00.000Z","occurredTo":"2026-12-31T23:59:59.999Z"}'
```

Verify a bundle:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/export-bundles/<bundleId>/verify" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"bundleHash":"<bundleHash-from-detail>"}'
```

## PLS Financing

Sign in as Financier to inspect and activate approved contracts:

```powershell
Invoke-RestMethod -Method Get -Uri "$baseUrl/financing/pls-contracts" -Headers $headers
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/financing/pls-contracts/<contractId>/activate" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"shariahReviewId":"<approvedReviewId>"}'
```

Record a simulation-only profit or loss distribution:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/financing/pls-contracts/<contractId>/distributions" `
  -Headers $headers `
  -ContentType "application/json" `
  -Body '{"eventType":"profit","grossResultAmount":"1000.00","calculationBasis":"demo scenario"}'
```

PLS APIs do not execute payments, guarantee profit, or guarantee principal.

## Error Envelope

Expected errors use the shared envelope:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "User is not allowed to perform this action"
  }
}
```

Common codes are `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, and `INTERNAL_ERROR`.
