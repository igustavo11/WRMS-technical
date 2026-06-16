# WRMS — Warehouse Reservation Management System

A full-stack warehouse management application for tracking inventory and managing reservations across multiple warehouses. Built with TypeScript end-to-end, using Node.js + Fastify on the backend and React on the frontend.

## Stack

| Layer | Technology |
|---|---|
| **Backend runtime** | Node.js + Bun |
| **Backend framework** | Fastify 5 |
| **Frontend** | React + TypeScript + Vite |
| **UI library** | shadcn/ui |
| **ORM** | Prisma 7 |
| **Database** | SQL Server 2022 (Docker) |
| **Auth** | JWT (HS256) |
| **Validation** | Zod 4 |
| **Backend tests** | Vitest + Supertest |
| **Frontend tests** | Vitest + React Testing Library |
| **Linting** | Biome |
| **AI harness** | Claude Code |
| **Infrastructure** | Docker + Docker Compose |

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + shadcn/ui + React Query + React Hook Form│
│  JWT stored in localStorage, injected via Axios   │
└────────────────────┬─────────────────────────────┘
                     │ HTTP (JSON)
                     ▼
┌──────────────────────────────────────────────────┐
│                  Backend API                      │
│  Fastify → authenticate → authorize → use case   │
│  Zod validation → DomainError → errorHandler     │
└────────────────────┬─────────────────────────────┘
                     │ Prisma Client
                     ▼
┌──────────────────────────────────────────────────┐
│               SQL Server 2022                     │
│  tables: users, products, warehouses,            │
│         inventories, reservations                │
└──────────────────────────────────────────────────┘
```

### Backend Layers

| Layer | Responsibility |
|---|---|
| **Domain** | Entities, repository interfaces, typed errors |
| **Application** | Use cases orchestrating business rules |
| **Infrastructure** | Prisma client, repository implementations, JWT service |
| **API** | Fastify routes, middlewares, Zod schemas |

See the full [backend architecture docs](./backend/README.md#architecture) for details.

## Why Node.js?

The original spec considered .NET, but Node.js was chosen for:

- **Unified language** — TypeScript across frontend and backend reduces context switching
- **Development velocity** — Faster iteration for a CRUD-heavy application
- **Ecosystem maturity** — Excellent tooling for JSON APIs (Fastify, Zod, Prisma)
- **Client authorization** — This decision was explicitly approved via email

## Why Claude Code as the Development Harness?

This project was built using **Claude Code** as the primary AI-assisted development environment. This choice was intentional:

- **Agentic workflows** — Claude Code can execute multi-step tasks (scaffolding, testing, refactoring) autonomously, not just generate snippets
- **Tool access** — Direct filesystem, terminal, and browser interaction from within the conversation
- **Skill system** — Reusable, version-controlled instruction sets that enforce disciplined workflows

### Skills Used

| Skill | Purpose |
|---|---|
| **grill-me** | Stress-test architectural decisions before implementation. Used to validate the domain model, transaction strategy, and role-based permission design against the PRD. |
| **superpowers** | Meta-skill that ensures all relevant skills are discovered and loaded before any response. Enforces the discipline of checking for applicable skills on every task. |
| **context7** | Real-time documentation lookup for libraries (Prisma, Fastify, Zod). Ensures code references current API docs rather than training-cutoff knowledge. |
| **TDD** | Red-green-refactor loop for all use cases. Tests were written before implementation code for every business rule. |
| **writing-plans** | Structured implementation plans broken into sequential subsystems before touching code. |
| **requesting-code-review** | Verification pass before marking work complete — checks tests, linting, type errors, and regressions. |

### Workflow

1. **PRD analysis** → Breaking down requirements into entities, rules, and endpoints
2. **Skill invocation** → Loading the appropriate skill before each task
3. **Context7 research** → Looking up current library docs for Prisma + SQL Server, Fastify patterns, etc.
4. **Grill-me sessions** → Stress-testing design decisions against the PRD before implementation
5. **TDD loop** → Writing test → confirming it fails → implementing → confirming it passes
6. **Code review** → Verification pass ensuring tests, linting, and types are all green

## Repository Structure

```
wrms/
├── backend/               # Node.js + Fastify + Prisma
│   ├── src/
│   │   ├── domain/        # Entities, repository interfaces, errors
│   │   ├── application/   # Use cases
│   │   ├── infrastructure/# Prisma client, repos, JWT
│   │   └── api/           # Routes, middlewares, validators
│   ├── prisma/            # Schema, migrations, seed
│   ├── tests/             # Unit + integration tests
│   └── docs/              # Database schema, task plans
├── frontend/              # React + Vite + shadcn/ui
│   └── src/
│       ├── contexts/      # AuthContext
│       ├── hooks/         # React Query hooks
│       ├── services/      # API client (Axios)
│       ├── pages/         # Route pages
│       └── components/    # UI components
└── docker-compose.yml     # SQL Server service
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) 20+

### 1. Start the database

```bash
docker compose up -d
```

This starts SQL Server 2022 on port 1433.

### 2. Backend setup

```bash
cd backend
cp .env.example .env
bun install
bunx prisma db push
bun run dev
```

The API starts at `http://localhost:3333`.

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app opens at `http://localhost:5173`.

### 4. Seed credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@wrms.com | Admin@123 |
| Operator | operator@wrms.com | Operator@123 |

### Run everything with Docker

```bash
docker compose --profile full up --build
```

## API Overview

Full API reference in the [backend README](./backend/README.md#api).

| Endpoint | Description | Roles |
|---|---|---|
| `POST /api/auth/login` | Login | Public |
| `GET /api/products` | List products | Admin |
| `POST /api/products` | Create product | Admin |
| `PUT /api/products/:id` | Update product | Admin |
| `POST /api/warehouses` | Create warehouse | Admin |
| `GET /api/inventory` | List inventory | Admin, Operator |
| `PUT /api/inventory` | Adjust inventory | Admin |
| `POST /api/reservations` | Create reservation | Admin, Operator |
| `PUT /api/reservations/:id/cancel` | Cancel reservation | Admin, Operator |
| `GET /api/dashboard` | Dashboard totals | Admin, Operator |

## Design

Frontend UI reference: **[Figma — WRMS Design](https://www.figma.com/design/idNN29HocMNZAPIzPnUnBB/Wtec-technical-assessment-WRMS?node-id=0-1&t=KFTCkeIEqVoQfAQh-1)** 

The design follows the shadcn/ui component library with a clean, functional layout. See the [backend docs](./backend/docs/database-schema.md) for the data model behind the UI.

## Documentation

| Resource | Description |
|---|---|
| [Backend README](./backend/README.md) | Stack, setup, API, architecture, assumptions |
| [Database Schema](./backend/docs/database-schema.md) | ER diagram and modeling notes |
| [Task Plans](./backend/docs/tasks/) | Implementation breakdown by subsystem |
| [Backend CLAUDE.md](./backend/CLAUDE.md) | Agent instructions for backend development |

## Assumptions and Trade-offs

- **GET /api/warehouses allowed for Operator** — The reservation form needs to list warehouses. A conscious trade-off documented in the backend README.
- **No public user registration** — Internal system. Users are created only via seed.
- **No pagination** — Acceptable for the test scope. Would add with more time.
- **No refresh token** — Simple JWT with 7-day expiration. Sufficient for the test scope.
- **No caching** — Stock consistency is critical. Transactions solve concurrency; caching would add stale-data risk.
- **Prisma enums not used** — SQL Server doesn't support Prisma native enums, so role and status are stored as `String` and validated via Zod.

## Future Improvements

- Pagination and filters on list endpoints
- Refresh token + blacklist for revoked tokens
- Reservation confirmation (Pending → Confirmed) by Admin
- Real-time notifications (WebSocket) for operators
- Stock movement reports

## AI Usage

Claude Code was used as the primary development harness for this project. Specific uses include:

- **Architecture planning** — Domain modeling, layer design, transaction strategy
- **Scaffold generation** — Use cases, repositories, routes, middleware
- **Business rule review** — Validation against PRD via grill-me sessions
- **Documentation research** — Library API lookup via Context7 (Prisma, Fastify, Zod)
- **Test suggestion** — Edge case identification for TDD

All engineering decisions, final implementation, and code review were performed by the developer.
