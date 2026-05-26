# PBI-450/PBI-451 Contract Negotiation and Machine-Readable Model Validation

Date: 2026-05-26

Branch: `feature/PBI-450-451-contract-negotiation-model`

Base commit before phase: `44a763c`

## Scope

This phase adds a first contract negotiation and machine-readable terms slice:

- contract domain model with buyer, supplier, optional financier, document reference, version, status, terms hash, offers, acceptances, and lifecycle events
- machine-readable terms model for parties, line items, delivery terms, acceptance criteria, escrow release conditions, payment terms, dispute rules, PLS seedbed metadata, document references, clause references, and standards mapping references
- backend repository seam with in-memory adapter
- authenticated contract APIs
- frontend Contract Negotiation workspace
- runbook/demo updates
- roadmap status update for PBI-450 and PBI-451

This is not legal e-signature, production contract lifecycle management, ERP synchronization, payment execution, automatic escrow release, or formal Shariah certification.

## Files Changed

- `backlog/production-extension-roadmap.csv`
- `docs/contracts/CONTRACT_NEGOTIATION_MODEL_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `docs/evidence/qa/PBI-450_451_CONTRACT_NEGOTIATION_MODEL_VALIDATION.md`
- `src/app/server.ts`
- `src/modules/contracts/**`
- `src/frontend/App.tsx`
- `src/frontend/api/contracts.ts`
- `src/frontend/components/layout/AppLayout.tsx`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/pages/ContractNegotiationPage.tsx`
- `src/frontend/types/contract.ts`

## API Routes Added

- `GET /api/v1/contracts`
- `POST /api/v1/contracts`
- `GET /api/v1/contracts/:contractId`
- `POST /api/v1/contracts/:contractId/offers`
- `POST /api/v1/contracts/:contractId/acceptance`

## Authorization Behavior

- All contract routes require authenticated bearer-session context.
- Buyer/supplier organization users can create or negotiate contracts where their organization is a party.
- Financier organization users can participate in offers for contracts where they are assigned as financier.
- Administrator can create and govern contract records.
- Auditor, regulator, compliance reviewer, security operator, and Shariah reviewer can read visible contracts for review/governance.
- Unrelated buyer attempts are rejected with `FORBIDDEN`.
- Anonymous requests are rejected with `UNAUTHORIZED`.

## Contract Behavior

- Terms are canonicalized and hashed as `sha256:<hex>`.
- Revised offers update the current terms, increment version, reset acceptance state, and record an `offerSubmitted` lifecycle event.
- Buyer and supplier acceptance records bind party, actor, organization, version, hash, and timestamp.
- Contract status becomes `accepted` only after both buyer and supplier accept the same current terms hash.
- Lifecycle events include company/private-network readiness milestones as MVP audit metadata.

## Standards References

External standards are used as mapping references, not as the internal domain model.

- OCDS official schema and release reference: https://standard.open-contracting.org/latest/en/schema/ and https://standard.open-contracting.org/latest/en/schema/reference/
- OASIS UBL 2.1: https://docs.oasis-open.org/ubl/UBL-2.1.html
- Peppol BIS documentation: https://docs.peppol.eu/poacc/billing/3.0/
- GS1 EPCIS 2.0 standard: https://ref.gs1.org/standards/epcis/2.0.0/

## Frontend Flow

- Buyer, supplier, administrator, and financier navigation includes `Contract Negotiation`.
- The workspace can create the Amanah-Barakah-Mabrur contract terms.
- The workspace displays status, version, terms hash, linked document reference, parties, delivery/payment/dispute terms, offer history, acceptance state, and lifecycle count.
- The page avoids PBI/sprint/backlog/roadmap labels in product UI.

## Validation Results

| Command | Result |
| --- | --- |
| `node --loader ts-node/esm --test src/modules/contracts/api/contract.routes.test.ts` | Passed: 6 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed: 723 tests, 0 failures |
| `npm run db:migrate -- --dry-run` | Passed: validated migrations 001 through 005 |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts and MVP seed records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed: no duplicate PBI IDs |
| `rg "PBI|Sprint|Backlog|Roadmap|User stories|implementation slice|feature lane" src/frontend` | Passed: no product-source matches |
| `git diff --check` | Passed with line-ending normalization warnings only |

## Browser Smoke

Browser path: in-app browser on `http://127.0.0.1:5173`.

Result: Passed for the Contract Negotiation interaction path.

Flow exercised:

1. Opened `/login`.
2. Signed in as `buyer.demo` with the documented local demo password.
3. Confirmed buyer dashboard and `Contract Negotiation` navigation rendered from backend session context.
4. Opened `Contract Negotiation`.
5. Confirmed the page rendered with no forbidden product labels.
6. Saved the default Amanah-Barakah-Mabrur machine-readable contract terms.
7. Confirmed status, version, linked document reference, and `sha256:<hex>` terms hash rendered.
8. Submitted a revised offer and confirmed offer history displayed a new hash.
9. Accepted current terms as buyer and confirmed buyer acceptance plus latest `contractAccepted` lifecycle event.

Console result: no relevant error or warning logs during the checked flow.

Screenshot result: screenshot capture through the in-app browser bridge timed out, so the smoke evidence is DOM and interaction based.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-450 and PBI-451 as `Completed` with this evidence file referenced in their Notes fields.

## Known Limitations

- In-memory repository only; no PostgreSQL contract adapter in this slice.
- No production redline editor.
- No legal signature workflow.
- No automatic order or escrow creation from accepted contract terms.
- No ERP/OCDS/UBL export endpoint in this slice.
- No payment execution.
- No formal Shariah certification.
