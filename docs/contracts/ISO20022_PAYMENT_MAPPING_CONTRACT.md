# ISO 20022 Payment Mapping Contract

Status: production-extension mapping reference
Owner: Integration Engineer / Backend Engineer
Related PBIs: PBI-440, PBI-439
Related requirements: R11, R12

## 1. Purpose

This contract defines the platform's ISO 20022-like payment artifact mapping for sandbox/manual payment instructions.

The mapping produces deterministic JSON artifacts shaped around ISO 20022 payment initiation and payment status concepts. It does not execute payment, connect to a bank, generate certified production bank messages, or claim ISO 20022 certification.

## 2. External References

Official ISO 20022 sources used for this slice:

- ISO 20022 standard overview: https://www.iso20022.org/iso-20022-standard
- ISO 20022 repository overview: https://www.iso20022.org/financial-repository
- ISO 20022 message definitions catalogue: https://www.iso20022.org/iso-20022-message-definitions
- ISO 20022 catalogue of messages: https://www.iso20022.org/catalogue-messages
- Payments Initiation catalogue entries for `pain.001.001.13` and `pain.002.001.15`: https://www.iso20022.org/iso-20022-message-definitions?search=pain

These sources describe ISO 20022 as a universal financial industry message scheme with a repository made of a Data Dictionary and Business Process Catalogue. The catalogue exposes message definitions, schemas, examples, and message sets such as Payments Initiation.

## 3. In Scope

- Internal payment instruction to ISO 20022-like `pain.001.001.13` JSON.
- Internal payment status to ISO 20022-like `pain.002.001.15` JSON.
- Deterministic mapping of:
  - debtor organization id
  - creditor organization id
  - amount
  - currency
  - payment reference / remittance
  - requested execution date
  - sandbox/manual status
- API export route for authorized readers.
- Validation for missing required mapping fields.

## 4. Out of Scope

- production bank submission.
- XML schema validation against official XSD.
- SWIFT, Peppol, bank, or payment-network certification.
- ISO 20022 transport, acknowledgement, or settlement.
- account-number, IBAN, BIC, or payment credential storage.
- real payment reconciliation files.

## 5. API Route

```text
GET /api/v1/payments/instructions/{paymentInstructionId}/iso20022?requestedExecutionDate=YYYY-MM-DD
```

The route uses the same payment instruction read authorization as:

```text
GET /api/v1/payments/instructions/{paymentInstructionId}
```

Response:

```json
{
  "data": {
    "paymentInitiation": {
      "standard": "ISO20022-like",
      "syntax": "json",
      "messageDefinition": "pain.001.001.13",
      "messageName": "CustomerCreditTransferInitiationV13",
      "claimBoundary": "mappingOnlyNoBankExecution"
    },
    "paymentStatusReport": {
      "standard": "ISO20022-like",
      "syntax": "json",
      "messageDefinition": "pain.002.001.15",
      "messageName": "CustomerPaymentStatusReportV15",
      "claimBoundary": "mappingOnlyNoBankExecution"
    }
  }
}
```

## 6. Required Fields

The mapper rejects artifacts when any of the following are missing or invalid:

- `paymentInstructionId`
- `escrowId`
- `amount`
- `currency`
- `debtorOrganizationId`
- `creditorOrganizationId`
- `paymentReference`
- `requestedExecutionDate`

The requested execution date must use `YYYY-MM-DD`.

## 7. Status Mapping

| Internal status | ISO 20022-like status code | Meaning in this MVP |
| --- | --- | --- |
| `pending` | `PDNG` | Sandbox/manual instruction is pending. |
| `accepted` | `ACCP` | Sandbox adapter accepted the instruction. |
| `settled` | `ACSC` | Sandbox/manual reconciliation marked the instruction settled. |
| `failed` | `RJCT` | Sandbox/manual reconciliation marked the instruction failed. |
| `cancelled` | `CANC` | Sandbox/manual instruction was cancelled. |

These codes are used as internal mapping discipline only. They are not proof that a bank or payment network accepted or settled a payment.

## 8. Claim Boundary

Every exported artifact includes:

```json
{
  "claimBoundary": "mappingOnlyNoBankExecution"
}
```

Product and evidence wording may say:

- ISO 20022-like JSON mapping.
- payment initiation artifact.
- payment status artifact.
- mapping-only export.

Product and evidence wording must not say:

- ISO 20022 payment execution is complete.
- bank payment has been initiated.
- bank confirmation has been received.
- certification or network acceptance is complete.
