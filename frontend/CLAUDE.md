# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WRMS Frontend — a React SPA (no SSR) for a Warehouse Reservation Management System. Talks to the Fastify API in `../backend` (base URL: `http://localhost:3333/api`). See `docs/api-contract.md` for the full API contract.

## Commands

```bash
bun run dev          # dev server at http://localhost:5173
bun run build        # production static build
bun run typecheck    # react-router typegen + tsc
bun run lint         # biome check --write
bun run test         # vitest run (all tests)
bun run test:watch   # vitest watch mode
```

Run a single test file:
```bash
bunx vitest run tests/login.test.tsx
```

Add a shadcn/ui component:
```bash
bun x shadcn add <component-name>
```

## Architecture

**SPA mode** — `react-router.config.ts` has `ssr: false`. No loaders, no server actions; all data fetching is client-side via TanStack Query + Axios.

**Folder layout:**

- `app/features/<name>/` — feature slices (pages, hooks, services, schemas, context). Only created when the feature is built.
- `app/shared/` — cross-feature primitives (API client, route guard).
- `app/components/ui/` — shadcn/ui components (copy-paste, owned by this repo).
- `app/routes.ts` — route config (React Router v7 `layout()` / `route()` / `index()` helpers).

**Auth flow:**

1. `app/shared/api/authToken.ts` — localStorage session (`wrms_session` key, stores `{ token, user }` together since there's no `/me` endpoint).
2. `app/shared/api/client.ts` — Axios instance; request interceptor attaches `Authorization: Bearer`, response interceptor clears session and redirects to `/login` on 401.
3. `app/features/auth/context/AuthContext.tsx` — Context API provider (required by PRD); exposes `{ token, user, login, logout }`.
4. `app/features/auth/hooks/useLogin.ts` — TanStack Query `useMutation` wrapping `loginRequest`; calls `AuthContext.login()` on success.
5. `app/shared/components/ProtectedLayout.tsx` — reads `useAuth().token`; redirects to `/login` if absent; wraps all guarded routes via `layout()` in `routes.ts`.

**State management:**
- Server state: TanStack Query
- Session/auth state: Context API (`AuthContext`) — explicitly required by the PRD; do not replace with zustand or similar
- Forms: React Hook Form + Zod

**UI/Theming:**
- shadcn/ui on Radix UI primitives — components live in `app/components/ui/` and are owned code (not imported from a package)
- Tailwind CSS v4 — theme tokens in `app/app.css` are set to exact Figma hex values (`#131313` background, `#161616` card, `#1cc8a8` primary, etc.) — do not reset these to shadcn defaults
- `app/app.css` must start with `@import "tailwindcss";` before `shadcn/tailwind.css` — removing it silently breaks all utility classes

**Path alias:** `~/*` → `./app/*` (configured in both `vite.config.ts` and `vitest.config.ts`; both must be kept in sync).

## Testing

Tests live in `tests/`, run under Vitest with jsdom. Setup file: `tests/setup/setup.ts` (calls RTL `cleanup()` in `afterEach` — required because `test.globals` is not enabled). The `~` alias is configured separately in `vitest.config.ts`.

## Feature status

| Subsystem | Status |
|-----------|--------|
| Scaffold + infra | Done |
| Auth & Login | Done |
| Dashboard | Not started |
| Products | Not started |
| Inventory | Not started |
| Reservations | Not started |

See `docs/tasks/` for per-feature architecture notes.

## Code style

Biome enforces formatting (tabs, single quotes). Run `bun run lint` before committing. Generated types in `.react-router/types/` and `**/+types/**` are excluded from linting.
