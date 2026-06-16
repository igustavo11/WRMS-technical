# WRMS Frontend

React SPA (React Router v7, SPA mode — no SSR) for the Warehouse Reservation Management System.
Talks to the Fastify API in `../backend`.

## Stack

- React 19 + React Router v7 (framework mode, `ssr: false`)
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Axios
- Biome (lint/format)
- Vitest + React Testing Library (tests)

## Why shadcn/ui instead of Material UI?

The original assessment suggested MUI or Ant Design as optional UI libraries. The Figma design,
however, uses a fully custom dark theme with specific colors (`#1CC8A8` primary, `#0C0C0C`
background, etc.) that don't align with Material Design's opinionated system.

**shadcn/ui** was chosen because:

- It provides copy-paste components built on Radix UI — fully customizable since you own the code
- No design system lock-in; the WTEC theme is implemented via CSS custom properties
- The dark, minimal aesthetic of the WTEC brand is much easier to achieve without fighting
  Material Design's defaults
- Smaller bundle — only the components you actually use
- Tailwind CSS v4 theming maps directly to the design tokens in the WTEC Design System

## Setup

```bash
cp .env.example .env
bun install
bun run dev      # http://localhost:5173
```

## Scripts

```bash
bun run dev         # dev server
bun run build       # production build (static output)
bun run typecheck   # react-router typegen + tsc
bun run lint        # biome check --write
bun run format      # biome format --write
bun run check       # biome check --write
bun run test        # vitest run
bun run test:watch  # vitest watch mode
```

## Adding shadcn/ui components

```bash
bun x shadcn add <component-name>
```

See [`docs/api-contract.md`](./docs/api-contract.md) for the full API contract.
