# Email Notification Outbox Contract

Status: Issue #14 implementation contract
Owner: Backend Engineering
Date: 2026-05-31

## Purpose

The email notification outbox provides a safe, local notification record for
workflow events. It is an integration boundary, not a production SMTP claim.

## Route Summary

- `GET /api/v1/email-notifications/outbox`

The route requires bearer authentication. Users can read notifications for
their own organization. Auditors, security operators, and administrators may
inspect notification metadata for governance and support.

## Notification Shape

```ts
type EmailNotification = {
  notificationId: string;
  recipientOrganizationId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  templateKey: string;
  subject: string;
  safeBody: string;
  relatedEntityType: string;
  relatedEntityId: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
};
```

## Triggered Events

Issue #14 implementation records local outbox notifications for:

- network request sent
- network request accepted
- network request rejected

Future adapters can add notifications for order, escrow, delivery, export,
proof failure, and release-readiness events.

## Safety Rules

Email records must not include:

- raw private documents
- bearer tokens or secrets
- raw KYC/AML data
- private keys
- payment credentials
- unrestricted commercial terms

Bodies are safe summaries only. The local adapter records queued/skipped
metadata and does not require SMTP to pass MVP tests.
