# Thabayehkom Backend — Documentation Index

This folder contains the full reverse-engineered specification for the **new Node.js backend**
that must be compatible with the existing Thabayehkom Flutter mobile app.

The old backend is gone. Everything here was reconstructed by analyzing:
- `lib/controllers/api_controller.dart` and `lib/controllers/cart_controller.dart` (the HTTP client)
- `lib/models/*.dart` and `lib/responses/*.dart` (JSON shapes the app expects)
- `lib/views/**/*.dart` (how status/code values drive UI flows)
- the repo-root `openapi.yaml` (a prior reconstruction, cross-checked here)

## Read in this order

1. **[01_REQUIREMENTS.md](01_REQUIREMENTS.md)** — Full requirements specification (functional,
   non-functional, security, workflows, assumptions, open questions, risks).
2. **[02_API_CONTRACT.md](02_API_CONTRACT.md)** — Every endpoint the app calls: method, path,
   headers, params, body, expected response JSON, and status/code semantics.
3. **[03_DATA_MODEL.md](03_DATA_MODEL.md)** — Database entities, columns, relationships, and how
   they map to the JSON the app deserializes.
4. **[04_IMPLEMENTATION_PLAN.md](04_IMPLEMENTATION_PLAN.md)** — Architecture, tech choices, project
   structure, phased task list, and dependencies.
5. **[05_DECISIONS_AND_STATUS.md](05_DECISIONS_AND_STATUS.md)** — Decision log, assumptions,
   what is done, what remains. **Update this file every session.**

## Continuity rule

If you (a future AI/developer) pick this up: read all five files first. Do **not** re-run the
analysis from scratch. Record new discoveries and decisions in `05_DECISIONS_AND_STATUS.md`.

## Current status (high level)

- Phase 1 (Analysis): **complete**
- Phase 2 (Requirements): **complete** (this document set)
- Phase 3 (Gap review): **complete** (see section in 01_REQUIREMENTS.md)
- Phase 4 (Implementation plan): **complete**
- Implementation: **not started** — no backend code written yet.
