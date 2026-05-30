# ADR-003: Operational State Belongs In PostgreSQL

Status: Accepted
Date: 2026-05-30

## Context

The product is a procurement evidence platform. Operational records such as users, sessions, organizations, roles, orders, delivery evidence, escrow, eligibility, and audit events must be queryable, mutable where appropriate, and recoverable after backend restart.

Fabric proof anchoring exists for selected hashes and verification metadata, not operational workflow storage.

## Decision

PostgreSQL is the operational source of truth for MVP business state.

Domain and application layers depend on repository interfaces. PostgreSQL adapters live in infrastructure folders. In-memory repositories remain for tests and explicitly documented local/demo use.

## Consequences

- Migrations are required for durable MVP-critical records.
- Runtime persistence gaps must be visible in `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`.
- Fabric must not be used as a substitute application database.
- Backend services, not frontend state, own business workflow decisions.

## Follow-Up

Prioritize PostgreSQL repositories for MVP-critical in-memory modules before making stronger deployment claims.
