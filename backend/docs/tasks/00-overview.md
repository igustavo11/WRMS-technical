# WRMS Backend — Task Breakdown Overview

> Source spec: `../../../docs/PRD.md`. Database modeling: `../database-schema.md`.

This is an index of every implementation plan for the backend. Each subsystem has (or will have) its own file in this folder, written in full TDD detail (exact files, code, test commands) using the `superpowers:writing-plans` format. Plans are written **one at a time** — only the next unstarted plan is detailed in full; the rest are listed here as placeholders until their turn comes.

## Status legend

- `Not started` — no plan file written yet, only listed here.
- `Planned` — plan file written, implementation not started.
- `In progress` — implementation underway.
- `Done` — implemented, tested, merged.

## Dependency order

Each subsystem depends on the ones above it. Build top to bottom.

| # | Subsystem | File | Status | Depends on |
|---|-----------|------|--------|-------------|
| 1 | Domain foundations | [01-domain-foundations.md](./01-domain-foundations.md) | Planned | — |
| 2 | Infrastructure & API skeleton | `02-infrastructure.md` | Not started | 1 |
| 3 | Auth | `03-auth.md` | Not started | 2 |
| 4 | Products | `04-products.md` | Not started | 2 |
| 5 | Warehouses | `05-warehouses.md` | Not started | 2 |
| 6 | Inventory | `06-inventory.md` | Not started | 2, 4, 5 |
| 7 | Reservations | `07-reservations.md` | Not started | 2, 4, 5, 6 |
| 8 | Dashboard | `08-dashboard.md` | Not started | 4, 6, 7 |
| 9 | Seed data | `09-seed.md` | Not started | 1 (schema already exists) |
| 10 | Docker & deployment | `10-docker.md` | Not started | 3–8 |

### What each subsystem covers

1. **Domain foundations** — `src/domain/entities`, `src/domain/errors`, `src/domain/repositories`. Pure TypeScript, no Prisma, no Fastify. Everything else imports from here.
2. **Infrastructure & API skeleton** — Fastify app factory (testable via Supertest without `listen()`), Zod type provider wiring, `authenticate`/`authorize` middlewares, global `errorHandler` (maps `DomainError` → HTTP status), Prisma repository implementations, `JwtService`. Produces a running server with no business routes yet, just the plumbing every feature route needs.
3. **Auth** — `POST /api/auth/login`. First vertical slice end-to-end (route → use case → repository → JWT). Proves the skeleton works.
4. **Products** — `GET/POST/PUT /api/products`, `GET /api/products/:id`. Admin only.
5. **Warehouses** — `GET/POST /api/warehouses`. Admin + Operator read, Admin write only (no update endpoint per PRD §4.2).
6. **Inventory** — `GET/PUT /api/inventory`. Read for Admin + Operator, adjust for Admin only.
7. **Reservations** — `GET/POST /api/reservations`, `PUT /api/reservations/:id/cancel`. The critical path: transaction + row-level lock on create/cancel.
8. **Dashboard** — `GET /api/dashboard`. Aggregates from products/inventory/reservations repositories.
9. **Seed data** — `prisma/seed.ts` per PRD §11 (2 users, 4 products, 2 warehouses, 5 inventory rows, 3 reservations in different statuses).
10. **Docker & deployment** — backend `Dockerfile` (multi-stage), `docker-compose.yml` updates (backend + frontend services, healthcheck, `depends_on: service_healthy`), `.dockerignore`.

## Already done (outside this task breakdown)

- `prisma/schema.prisma` — all 5 models (`User`, `Product`, `Warehouse`, `Inventory`, `Reservation`), reviewed against the PRD.
- `wrms` (dev) and `wrms_test` (integration tests) SQL Server databases provisioned and schema-synced.
- Vitest + Supertest installed and configured (`vitest.config.ts`, `tests/setup/global-setup.ts`, `tests/setup/reset-database.ts`).
- `.env`, `.env.example`, `.env.test`, `.gitignore` updated.
- `database-schema.md` (Mermaid ER diagram + modeling notes).

## PRD deliverables checklist mapping (§13 — Backend)

| Deliverable | Covered by |
|---|---|
| Prisma schema with all entities | Done |
| Migration generated and functional | Done (`prisma db push`, dev + test DB) |
| Seed with full initial data | Subsystem 9 |
| Typed domain errors | Subsystem 1 |
| Use cases implementing all business rules | Subsystems 3–8 |
| Transaction with row-level lock on Create/CancelReservation | Subsystem 7 |
| REST endpoints exactly as specified | Subsystems 3–8 |
| JWT auth with roles | Subsystems 2, 3 |
| Authentication (401) / authorization (403) middleware | Subsystem 2 |
| Global error handler mapping DomainErrors → HTTP status | Subsystem 2 |
| Zod request validation (400) | Subsystems 2–8 (schemas live per-feature) |
| Unit tests (CreateReservation, CancelReservation, AdjustInventory, CreateProduct) | Subsystems 6, 7, 4 |
| Integration tests (auth, reservations, authorization) | Subsystems 3, 7, 2 |
| Dockerfile multi-stage | Subsystem 10 |
| `.env.example` | Done |

## Conventions for every plan in this folder

- Runtime: Bun for application code (`src/`). Vitest test workers run under Node — no `Bun.*` globals inside `tests/`. See `../../CLAUDE.md`.
- Formatting: tabs, single quotes (Biome, `biome.json`). `bun run check` only targets `src/`.
- `type` over `interface` except for repository contracts (`IXxxRepository`), which use `interface` because they are `implements`-ed by concrete classes.
- All error messages and docs in English.
- Each plan's execution handoff (Subagent-Driven vs Inline) is decided when that plan starts, not in advance.
