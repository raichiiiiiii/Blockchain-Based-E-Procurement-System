# Action Inbox and Scorecard Validation

Date: 2026-06-01
Branch: `feature/PBI-485-496-productivity-api-auth-hardening`

## Scope

Validates PBI-488 from GitHub Issue #24 and supports PBI-487.

## Implementation

The Productivity workspace exposes:

- action inbox / next actions
- task completion
- supplier scorecards
- evidence checklist
- notification center

Notification center data is mapped from the existing local email notification outbox. It does not send real email.

## Authorization

Routes require a valid bearer session and organization context. Unsupported actors and anonymous users are rejected.

## Validation

- `node --test --loader ts-node/esm src/modules/productivity/api/productivity.routes.test.ts` passed.
- Tests cover anonymous rejection, unsupported-role rejection, task completion, export manifest hash, and notification list shape.

## Known Limitations

- Notification records are safe local outbox metadata only.
- No SMTP, push notification, user device delivery, or production notification service is claimed.
