# Organization Network Contract

Status: Issue #14 implementation contract
Owner: Product Engineering
Date: 2026-05-31

## Purpose

The organization network contract defines safe organization profile metadata,
network relationship requests, graph projection, channel/scope indicators, and
blockchain trail metadata for the Organization Network workspace.

## Route Summary

- `POST /api/v1/organizations/register`
- `GET /api/v1/organizations/me/profile`
- `PATCH /api/v1/organizations/me/profile`
- `GET /api/v1/organizations/search?identifier=...`
- `POST /api/v1/organization-network/requests`
- `GET /api/v1/organization-network/requests`
- `POST /api/v1/organization-network/requests/:requestId/accept`
- `POST /api/v1/organization-network/requests/:requestId/reject`
- `GET /api/v1/organization-network/graph`
- `GET /api/v1/organization-network/graph/:edgeId/trail`

All routes except public registration require an authenticated bearer session
and must derive actor identity from trusted server-side session context.

## Safe Organization Profile

```ts
type OrganizationProfile = {
  organizationId: string;
  legalName: string;
  displayName?: string;
  alias?: string;
  uniqueIdentifier: string;
  logoUrl?: string;
  status: 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted';
  eligibilityStatus: 'unknown' | 'eligible' | 'flagged' | 'blocked';
  businessCategory?: string;
  publicProfileSummary?: string;
  contactEmail?: string;
};
```

`contactEmail` is allowed only on own-profile/admin views. Search and graph
surfaces use safe profile metadata and omit private onboarding documents.

## Relationship Request

```ts
type OrganizationNetworkRequest = {
  requestId: string;
  requesterOrganizationId: string;
  targetOrganizationId: string;
  targetUniqueIdentifier: string;
  relationshipType:
    | 'buyer'
    | 'supplier'
    | 'financier'
    | 'logistics'
    | 'auditorRegulator'
    | 'mixed';
  message?: string;
  purpose?: string;
  state:
    | 'draft'
    | 'sent'
    | 'received'
    | 'accepted'
    | 'rejected'
    | 'cancelled'
    | 'blocked'
    | 'expired';
  createdByUserId: string;
  decidedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
};
```

Accepted requests create a durable organization relationship. Relationship
acceptance does not bypass KYC/AML eligibility gates and does not authorize
transaction actions by itself.

## Graph Projection

The graph projection returns only organizations and relationships visible to
the signed-in actor's organization.

```ts
type OrganizationGraphNode = {
  id: string;
  organizationId: string;
  uniqueIdentifier: string;
  displayName: string;
  alias?: string;
  logoUrl?: string;
  organizationStatus: string;
  eligibilityStatus: 'unknown' | 'eligible' | 'flagged' | 'blocked';
  relationshipToCurrentOrg:
    | 'self'
    | 'connected'
    | 'pendingInbound'
    | 'pendingOutbound'
    | 'blocked';
  relationshipRole:
    | 'buyer'
    | 'supplier'
    | 'financier'
    | 'auditor'
    | 'regulator'
    | 'logistics'
    | 'mixed';
  activeDealCount: number;
  lastInteractionAt?: string;
  profileSummary?: string;
  proofChannelSummary?: string;
};
```

```ts
type OrganizationGraphEdge = {
  id: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  direction: 'outbound' | 'inbound' | 'bidirectional';
  relationshipType:
    | 'buyerSupplier'
    | 'financing'
    | 'audit'
    | 'logistics'
    | 'regulatory'
    | 'mixed';
  channelScope:
    | 'sharedChannelA'
    | 'sharedChannelB'
    | 'privateChannelC'
    | 'localProofOnly'
    | 'unavailable';
  fabricChannelName?: string;
  privateDataCollectionName?: string;
  currentStage: string;
  latestLifecycleEventId?: string;
  latestPayloadHash?: string;
  anchorStatus?: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  verificationStatus?: 'verified' | 'mismatch' | 'notFound' | 'unavailable';
  safeSummary: string;
};
```

## Blockchain Trail

Trail entries are proof metadata only:

- lifecycle event id
- event type
- timestamp
- payload hash
- anchor status
- verification status
- channel or visibility scope
- related order, escrow, delivery, export, or network record

Raw KYC, payment credentials, private documents, commercial terms, and raw
payloads must not be returned.

## Channel Scope Mapping

- `procurement-proof-channel` maps to `sharedChannelA`
- `regulated-export-channel` maps to `sharedChannelB`
- `pls-governance-channel` maps to `privateChannelC`
- local-only hashes map to `localProofOnly`
- missing or degraded proof configuration maps to `unavailable`

These aliases are product visibility scopes, not production Fabric consortium
claims.
