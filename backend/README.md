# WRMS — Backend

Warehouse Reservation Management System backend.

## Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Runtime    | Bun                      |
| Framework  | Fastify                  |
| ORM        | Prisma                   |
| Database   | SQL Server 2022 (Docker) |
| Auth       | JWT (HS256)              |
| Validation | Zod                      |
| Tests      | Vitest + Supertest       |

---

## Scripts

```bash
bun run dev          # start with watch mode
bun run start        # start
bun run lint         # lint & fix (Biome)
bun run format       # format (Biome)
bun run check        # lint + format + organize imports (Biome)
bun run test         # run tests (Vitest)
bun run test:watch   # run tests in watch mode
bunx prisma db push  # sync schema to database
bunx prisma db seed  # seed database
bunx prisma studio   # open Prisma Studio
```

---

## Setup

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Environment

```bash
cp .env.example .env
```

### Run with Docker (database only)

```bash
docker compose up -d
```

This starts SQL Server on port 1433. Wait until you see `SQL Server is now ready for client connections` in the logs (`docker compose logs -f`).

### Run locally

```bash
bun install
bunx prisma db push
bunx prisma db seed
bun --hot index.ts
```

The server starts at `http://localhost:3333`.

### Run with everything in Docker

```bash
docker compose --profile full up --build
```

This starts SQL Server + backend + frontend.

### Seed credentials

| Role     | Email             | Password     |
| -------- | ----------------- | ------------ |
| Admin    | admin@wrms.com    | Admin@123    |
| Operator | operator@wrms.com | Operator@123 |

---

## Architecture

### Folder structure

```
backend/
├── src/
│   ├── domain/
│   │   ├── entities/         # Business objects
│   │   ├── repositories/     # Abstract contracts
│   │   └── errors/           # Typed domain errors
│   ├── application/
│   │   └── use-cases/        # Business rules orchestration
│   ├── infrastructure/
│   │   ├── database/         # Prisma client
│   │   ├── repositories/     # Prisma implementations
│   │   └── auth/             # JWT service
│   └── api/
│       ├── routes/           # Fastify route handlers
│       ├── middlewares/       # authenticate, authorize, errorHandler
│       └── schemas/          # Zod validation schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── tests/
    ├── unit/
    └── integration/
```

### Request flow

```
HTTP Request
    ↓
Route → Zod validation → 400 if invalid
    ↓
authenticate middleware → verify JWT → 401 if invalid
    ↓
authorize middleware → check role → 403 if insufficient
    ↓
Use Case → business rules → throw DomainError if violated
    ↓
Repository (Prisma) → database in transaction
    ↓
errorHandler → map DomainError to HTTP status
```

### Why Node.js instead of .NET?

The original spec considered .NET, but Node.js was chosen for:

- Faster development cycle for a CRUD-heavy application
- Unified language across frontend and backend
- Excellent ecosystem for JSON APIs
- The client explicitly authorized this decision via email.

### Why Fastify?

- Performance — one of the fastest Node.js frameworks
- Native schema validation (serialization/deserialization)
- TypeScript-first with excellent type inference
- Plugin-based architecture for clean separation

### Why Prisma?

- Type-safe queries — no raw SQL strings
- Auto-generated client with full IntelliSense
- Declarative migrations
- Native SQL Server support

### JWT approach

- Algorithm: HS256
- Token sent via `Authorization: Bearer <token>` header
- Payload contains: `userId`, `email`, `role`
- Expiration: 7 days (configurable via `JWT_EXPIRES_IN`)
- No refresh token (see trade-offs)

---

## API

### Authentication

| Method | Route           | Auth      |
| ------ | --------------- | --------- |
| POST   | /api/auth/login | ❌ public |

### Products (Admin only)

| Method | Route             |
| ------ | ----------------- |
| GET    | /api/products     |
| GET    | /api/products/:id |
| POST   | /api/products     |
| PUT    | /api/products/:id |

### Warehouses

| Method | Route           | Role            |
| ------ | --------------- | --------------- |
| GET    | /api/warehouses | Admin, Operator |
| POST   | /api/warehouses | Admin           |

### Inventory

| Method | Route          | Role            |
| ------ | -------------- | --------------- |
| GET    | /api/inventory | Admin, Operator |
| PUT    | /api/inventory | Admin           |

### Reservations

| Method | Route                        | Role            |
| ------ | ---------------------------- | --------------- |
| GET    | /api/reservations            | Admin, Operator |
| POST   | /api/reservations            | Admin, Operator |
| PUT    | /api/reservations/:id/cancel | Admin, Operator |

### Dashboard

| Method | Route          | Role            |
| ------ | -------------- | --------------- |
| GET    | /api/dashboard | Admin, Operator |

---

## Testing

```bash
bun run test
```

Integration tests run against a separate `wrms_test` database (see `.env.test`), kept in sync automatically via Vitest's global setup.

---

## Assumptions and Trade-offs

- **GET /api/warehouses allowed for Operator** — the reservation form needs to list warehouses. Documented as a conscious decision.
- **No public user registration** — internal system. Users are created only via seed.
- **No pagination** — acceptable for the test scope. Would add with more time.
- **No refresh token** — simple JWT with 7-day expiration. Sufficient for the test scope.
- **No caching** — stock consistency is critical. Transactions solve concurrency, caching would add stale-data risk.

## Future Improvements

- Pagination and filters on list endpoints
- Refresh token + blacklist for revoked tokens
- Reservation confirmation (Pending → Confirmed) by Admin
- Real-time notifications (WebSocket) for operators
- Stock movement reports

---

## AI Usage

Claude was used for: architecture planning, scaffolding generation, business rule review, and test suggestions. All engineering decisions, implementation, and code review were done by the developer.
