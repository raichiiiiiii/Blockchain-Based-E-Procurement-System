# ADR-005: Preserve React/Vite And Refactor Incrementally

Status: Accepted
Date: 2026-05-30

## Context

The repository already has a working React 18, Vite, and TypeScript frontend with role-specific workspaces, status components, proof panels, and a responsive shell.

The immediate product need is actor-complete procurement workflow clarity, not a frontend rewrite.

## Decision

Preserve the current React/Vite frontend and refactor incrementally.

New frontend work should:

- reuse existing pages and components where practical
- add shared components only when they reduce duplication
- keep credential-only login
- derive role navigation from authenticated session actor context
- avoid adding React Router unless explicitly justified and approved
- keep product labels free of internal backlog or implementation terminology

## Consequences

- Web MVP remains the priority.
- React Native or mobile-native implementation is a later staged extension.
- Visual polish should not weaken authorization, proof semantics, or business-state accuracy.
