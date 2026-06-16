# WRMS Frontend — Task Breakdown Overview

> Source spec: PRD frontend requirements + Figma (`Wtec-technical-assessment-WRMS`). API contract: `../api-contract.md`.

Index of frontend work, written one subsystem at a time as it's built (mirrors `backend/docs/tasks/`). Unlike the backend, these are written *after* each slice lands (no formal spec/plan doc per slice) — see each file's own notes for decisions made along the way.

## Status legend

- `Not started` — no page/feature built yet.
- `Done` — implemented and manually verified in the browser.

## Subsystems

| # | Subsystem | File | Status | Depends on |
|---|-----------|------|--------|-------------|
| 0 | Scaffold (Vite/React Router SPA, Biome, Vitest, deps) | — (no doc, see commit `d4b983e`) | Done | — |
| 1 | Auth & Login | [01-auth-login.md](./01-auth-login.md) | Done | 0 |
| 2 | Dashboard | — | Not started | 1 |
| 3 | Products | — | Not started | 1 |
| 4 | Inventory | — | Not started | 1, 3 |
| 5 | Reservations | — | Not started | 1, 3, 4 |

## Conventions

- Runtime: Bun. Path alias `~/*` → `./app/*` (React Router v7 convention).
- Folder structure: feature-based (`app/features/<name>/`) for anything with real logic; `app/shared/` for cross-feature primitives (API client, route guards). Empty feature folders are not pre-created — they show up when that feature is actually built.
- Formatting: tabs, single quotes (Biome, `biome.json`).
- UI: shadcn/ui (Tailwind v4) — chosen over Material UI because the Figma uses a fully custom dark theme that doesn't map to Material Design's defaults. Theme tokens in `app/app.css` are set to the exact Figma hex values, not shadcn's generated defaults.
- Server state: TanStack Query. Client/session state: Context API (`AuthContext`) — required explicitly by the PRD's frontend stack section.
- Forms: React Hook Form + Zod, schemas mirroring the backend's Zod schemas where applicable.
