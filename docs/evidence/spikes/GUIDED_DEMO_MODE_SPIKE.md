# Guided Supervisor Demo Mode Spike

Date: 2026-05-26

Branch: main

Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Question

Can the product add a lightweight guided walkthrough that improves supervisor presentation flow without bypassing authentication, creating fake state, or hiding unsupported behavior?

## Decision

Implement a small route-aware walkthrough panel activated by `?demo=guided`.

The guide is acceptable because it:

- provides presenter prompts only;
- preserves normal sign-in and role switching;
- does not call mutation APIs;
- does not fabricate blockchain proof or verified states;
- can be closed and leaves the ordinary product experience intact.

## Recommended Flow

1. Landing
2. Sign in
3. Administrator
4. Compliance
5. Buyer order
6. Supplier delivery
7. Buyer escrow
8. Auditor proof
9. Shariah Review
10. Financing
11. Export Bundle
12. Known limitations

## Implementation Notes

- Activation: append `?demo=guided` to `/`, `/login`, or `/dashboard`.
- Routing: preserve the query parameter during app navigation until the presenter closes the guide.
- Authentication: the guide sends the presenter to sign in when the next actor changes; it does not impersonate actors.
- Proof integrity: proof verification remains in the existing proof panel and proof client.
- Scope safety: visible wording avoids production payment, production Fabric consortium, ERP, ISO20022, or formal Islamic finance compliance claims.

## Risks

- The panel could obscure dense dashboard content on small screens.
- The guide could become stale if actor routes change.
- A presenter may mistake guidance for automatic workflow execution unless wording remains clear.

## Mitigations

- Keep the panel compact and closable.
- Drive labels from product roles and navigation names.
- State expected outcomes instead of claiming automatic completion.

## Outcome

Proceed with implementation in the same phase because the spike is low-risk, frontend-only, and directly addresses the rehearsal friction around presenting the story in sequence.
