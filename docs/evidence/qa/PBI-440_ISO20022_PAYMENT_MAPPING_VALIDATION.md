# PBI-440 ISO 20022 Payment Mapping Validation

Date: 2026-05-26
Branch: feature/PBI-440-iso20022-payment-mapping
Commit inspected before change: 5abcc5f
Readiness statement: supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Scope

PBI-440 adds deterministic ISO 20022-like mapping for the sandbox/manual payment instruction boundary created in PBI-439.

Implemented:

- `mapPaymentInstructionToIso20022Initiation`.
- `mapPaymentInstructionToIso20022StatusReport`.
- `mapPaymentInstructionToIso20022Artifacts`.
- API export route: `GET /api/v1/payments/instructions/:paymentInstructionId/iso20022`.
- Mapper and route tests.
- Contract documentation: `docs/contracts/ISO20022_PAYMENT_MAPPING_CONTRACT.md`.

Not implemented:

- production bank payment execution.
- XML generation or official XSD validation.
- SWIFT, Peppol, bank, or network certification.
- ISO 20022 transport, acknowledgement, or settlement.
- storage of bank account credentials, IBAN, BIC, or payment secrets.

## External Standards Reviewed

Official ISO 20022 sources reviewed:

- https://www.iso20022.org/iso-20022-standard
- https://www.iso20022.org/financial-repository
- https://www.iso20022.org/iso-20022-message-definitions
- https://www.iso20022.org/catalogue-messages
- https://www.iso20022.org/iso-20022-message-definitions?search=pain

Findings applied:

- ISO 20022 is a universal financial industry message scheme.
- The ISO 20022 Repository consists of the Data Dictionary and Business Process Catalogue.
- The message catalogue exposes message definitions, schemas, examples, and message sets.
- The Payments Initiation catalogue includes `pain.001.001.13` / `CustomerCreditTransferInitiationV13` and `pain.002.001.15` / `CustomerPaymentStatusReportV15`.

The implementation uses those references as mapping discipline only. It does not claim conformance testing or payment-network acceptance.

## API Behavior

Route:

```text
GET /api/v1/payments/instructions/:paymentInstructionId/iso20022?requestedExecutionDate=YYYY-MM-DD
```

The route returns:

- `paymentInitiation` with `messageDefinition: pain.001.001.13`.
- `paymentStatusReport` with `messageDefinition: pain.002.001.15`.
- debtor, creditor, amount, currency, payment reference/remittance, requested execution date, and mapped status.
- `claimBoundary: mappingOnlyNoBankExecution`.

The route uses the existing payment instruction read authorization path. Unauthorized and unrelated actors do not receive artifacts.

## Validation Rules

The mapper rejects missing or invalid:

- `paymentInstructionId`
- `escrowId`
- `amount`
- `currency`
- `debtorOrganizationId`
- `creditorOrganizationId`
- `paymentReference`
- `requestedExecutionDate`

Status mapping:

| Internal status | ISO 20022-like status code |
| --- | --- |
| `pending` | `PDNG` |
| `accepted` | `ACCP` |
| `settled` | `ACSC` |
| `failed` | `RJCT` |
| `cancelled` | `CANC` |

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/ISO20022_PAYMENT_MAPPING_CONTRACT.md`
- `docs/contracts/PAYMENT_ADAPTER_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `src/modules/payments/api/payment.routes.ts`
- `src/modules/payments/api/payment.routes.test.ts`
- `src/modules/payments/application/iso20022-payment-mapper.ts`
- `src/modules/payments/application/iso20022-payment-mapper.test.ts`

## Validation Commands

| Command | Result |
| --- | --- |
| `node --test --loader ts-node/esm src/modules/payments/application/iso20022-payment-mapper.test.ts src/modules/payments/api/payment.routes.test.ts` | Passed, 12 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed, 746 tests |
| CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed, no duplicate PBI IDs |
| `rg "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed, no matches |
| `git diff --check` | Passed with existing LF/CRLF normalization warnings only |

Database migration/seed commands were not rerun for this phase because no database schema or seed data changed.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-440 `Completed` for mapping-only ISO 20022-like JSON artifacts.

Canonical `backlog/backlog.csv` was not changed because the production-extension PBI is tracked in `backlog/production-extension-roadmap.csv`.

## Known Limitations

- JSON mapping only; no XML generation in this slice.
- No official XSD validation or certification.
- No bank rails, payment transport, payment credentials, or confirmation.
- No production reconciliation import.
- Payment instruction persistence remains in-memory in this branch stack until a dedicated repository is added.

## Recommended Next Slice

Proceed to PBI-448 export signing and key management only after review/merge, or continue to the next approved phase if this branch stack is being validated as a continuous run. Keep claim boundaries explicit for any signing or payment terminology.
