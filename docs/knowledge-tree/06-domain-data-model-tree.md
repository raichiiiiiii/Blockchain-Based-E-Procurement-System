# Domain Data Model Tree

| Entity | Domain file | Repository interface | PostgreSQL repository? | In-memory repository? | Migration/table? | Seed coverage? | Evidence |
|---|---|---|---|---|---|---|---|
| organizations | `membership/domain/member-organization.ts`, organization-network domain | member organization, organization network repo | Yes | Yes | `001`, `018` | Yes | membership and organization network evidence |
| users | auth/access-control/org network domain | credentials, org users | Yes | Yes | `001`, `018` | Yes | PBI-456 seeded accounts |
| credentials | `auth/domain/platform-user-credential.ts` | platform user credential repo | Yes | Yes | `001` | Yes | auth evidence |
| organization memberships | membership/access-control | membership lookup | Yes | Yes | `001` | Yes | RBAC evidence |
| role assignments | access-control domain | role assignment repo | Yes | Yes | `001` | Yes | PBI-425 matrix |
| network relationships | organization-network domain | organization network repo | Yes | Yes | `018` | Yes | PBI-463 to PBI-472 |
| source-to-award cases | `procurement/domain/source-to-award.ts` | source-to-award repo | Yes | Yes | `019` | Demo path | Issue 27 evidence |
| requisitions | source-to-award aggregate | source-to-award repo | Yes, JSONB within case | Yes | `019` | Demo path | PBI-498 |
| RFQs | source-to-award aggregate | source-to-award repo | Yes, JSONB within case | Yes | `019` | Demo path | PBI-498 |
| quotations | source-to-award aggregate | source-to-award repo | Yes, JSONB within case | Yes | `019` | Demo path | PBI-498 |
| awards | source-to-award aggregate | source-to-award repo | Yes, JSONB within case | Yes | `019` | Demo path | PBI-498 |
| orders | `procurement/domain/procurement-order.ts` | procurement order repo | Yes | Yes | `005` | Yes | PBI-372 |
| delivery evidence | `procurement/domain/delivery-evidence.ts` | delivery evidence repo | Yes | Yes | `005` | Yes | PBI-379 |
| invoices | `procurement/domain/invoice.ts` | invoice repo | Yes | Yes | `019` | Demo path | PBI-499/Issue 27 |
| match results | invoice aggregate | invoice repo | Yes, JSONB | Yes | `019` | Demo path | PBI-499 |
| escrows | `escrow/domain/escrow.ts` | escrow repo | Yes | Yes | `004`, `006` | Yes | PBI-006/PBI-441 |
| PLS contracts | `financing/domain/pls-contract.ts` | PLS contract repo | Yes | Yes | `009` | Yes | PBI-393 |
| Shariah reviews | `shariah-review/domain/shariah-review.ts` | Shariah review repo | Yes | Yes | `008` | Yes | PBI-393 |
| Shariah certificates | `shariah-certification/domain/shariah-certificate.ts` | certificate repo | Yes | Yes | `012` | Yes | PBI-447 |
| export bundles | `reporting/domain/export-bundle.ts` | export bundle repo | Yes | Yes | `010` | Yes | PBI-406/PBI-448 |
| blockchain anchor metadata | blockchain app types | anchor metadata repo | Yes | Yes | `003` | Yes | PBI-323 |
| productivity state | `productivity/domain/productivity.ts` | productivity state repo | No full Postgres repo for saved views/tasks | Yes | None dedicated | Derived/demo | Productivity evidence |
| email notifications | organization-network/productivity models | organization network repo | Yes | Local route/read model | `018` | Yes | email outbox evidence |
| documents | `documents/domain/document.ts` | document repo/storage/extraction ports | Yes metadata | Yes | `013` | Demo path | PBI-445/446 |
| contracts | `contracts/domain/procurement-contract.ts` | procurement contract repo | Yes | Yes | `014` | Demo path | PBI-450/451 |
| payments | `payments/domain/payment-instruction.ts` | payment instruction repo | Yes | Yes | `016` | Demo path | PBI-439/440 |
| external clients/jobs | integration domain | credential/idempotency/audit/job repos | Yes | Yes | `015`, `017` | Demo path | PBI-458/449 |
| operational incidents | ops app type | incident repo | Yes | Yes | `011` | Demo path | PBI-460 |

## Critical In-Memory / Local-Only Notes

- Productivity saved views and task completion are still not a fully collaborative durable domain in the same way procurement records are.
- Document storage uses local file storage behind a port; only metadata/extraction state is PostgreSQL-backed.
- Payment, ERP, ISO 20022, QR, EPCIS, and external API integrations are adapter foundations, not live external networks.
