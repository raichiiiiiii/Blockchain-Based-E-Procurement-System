# PBI-007 — Basic PLS profit/loss calculation and recording

This folder contains Sprint 2 implementation artifacts for the PLS calculation story.

## Parent story
PBI-007 — Basic PLS profit/loss calculation and recording

## ReqID
R07

## Governing ADR
ADR-2026-001 — Adopt restricted single-venture mudarabah as MVP PLS baseline

## Stack alignment
- Backend: Node.js + TypeScript
- ORM: Prisma
- Database: PostgreSQL

## Child PBIs
- PBI-013 — Create PLS contract schema and persistence model
- PBI-014 — Implement PLS contract validation and create/read API
- PBI-015 — Add manual settlement record for approved invoices
- PBI-016 — Implement PLS profit/loss calculation service
- PBI-017 — Persist PLS calculation result and emit audit event
- PBI-018 — Add unit and integration tests for PLS calculations

## PBI-013 scope
PBI-013 defines the persistence model for restricted single-venture mudarabah contracts. It does not yet implement full API behavior, profit calculation, or audit emission.