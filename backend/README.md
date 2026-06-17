# WRMS — Backend

Warehouse Reservation Management System backend — a core inventory and reservation management API
built with clean architecture principles, designed for database portability and horizontal scaling.

---

## Table of Contents

1. [System Design](#system-design)
2. [Database Model](#database-model)
3. [Stack](#stack)
4. [Request Flow](#request-flow)
5. [Transaction Flow (Reservations)](#transaction-flow-reservations)
6. [Error Handling Pipeline](#error-handling-pipeline)
7. [Database Swappability](#database-swappability)
8. [MySQL → SQL Server Synchronization (Optional Discussion Topic)](#mysql--sql-server-synchronization-optional-discussion-topic)
9. [Scaling & Performance](#scaling--performance)
10. [Trade-offs](#trade-offs)
11. [Technical Decisions](#technical-decisions)
12. [Scripts](#scripts)
13. [Setup](#setup)
14. [Testing](#testing)
15. [Future Improvements](#future-improvements)

---

## System Design

The project follows **Clean Architecture** (also known as Hexagonal Architecture), with strict layer
separation and dependency inversion: the domain layer knows nothing about frameworks, databases, or
HTTP — it defines contracts (interfaces) that the infrastructure layer implements.

```mermaid
graph TB
    subgraph "API Layer (inbound)"
        Routes["routes/*.ts<br/>Fastify handlers"]
        Middlewares["middlewares/*.ts<br/>authenticate / authorize / errorHandler"]
        Schemas["schemas/*.ts<br/>Zod validation + OpenAPI"]
    end

    subgraph "Application Layer"
        UseCases["use-cases/*.ts<br/>Business orchestration"]
    end

    subgraph "Domain Layer (pure TS)"
        Entities["entities/*.ts<br/>Business objects"]
        Repositories["repositories/*.ts<br/>Abstract interfaces"]
        Errors["errors/*.ts<br/>Typed domain errors"]
    end

    subgraph "Infrastructure Layer (outbound)"
        PrismaRepos["repositories/Prisma*.ts<br/>Prisma implementations"]
        Database["database/prisma.ts<br/>PrismaClient + adapter"]
        Auth["auth/JwtService.ts<br/>JWT sign/verify"]
    end

    subgraph "External"
        DB[("SQL Server<br/>(or MySQL/PG)")]
    end

    Routes --> Middlewares
    Middlewares --> UseCases
    UseCases --> Repositories
    Repositories -.->|"implemented by"| PrismaRepos
    PrismaRepos --> Database
    Database --> DB
    UseCases --> Entities
    UseCases --> Errors
    Schemas --> Routes
```

### Layer rules

| Layer | Depends on | Knows about |
|-------|------------|-------------|
| `domain/` | Nothing | Business entities, repository contracts, error types |
| `application/` | `domain/` | Use case orchestration, business rules |
| `infrastructure/` | `domain/` | Prisma, JWT, database specifics |
| `api/` | `application/`, `domain/` | Fastify, Zod, HTTP concerns |

The dependency rule: **outer layers can depend on inner layers, never the reverse**.
The domain layer has zero imports from Prisma, Fastify, or any external library.

---

## Database Model

```mermaid
erDiagram
    USER {
        string id PK
        string email UK
        string passwordHash
        string role
        datetime createdAt
    }

    PRODUCT {
        string id PK
        string sku UK
        string name
        string description
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    WAREHOUSE {
        string id PK
        string name
        string location
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    INVENTORY {
        string id PK
        string productId FK
        string warehouseId FK
        int quantity
        datetime updatedAt
    }

    RESERVATION {
        string id PK
        string productId FK
        string warehouseId FK
        int quantity
        string status
        datetime createdAt
        datetime updatedAt
    }

    PRODUCT ||--o{ INVENTORY : "stock per warehouse"
    WAREHOUSE ||--o{ INVENTORY : "stock per product"
    PRODUCT ||--o{ RESERVATION : "reserved in"
    WAREHOUSE ||--o{ RESERVATION : "reserved in"
```

### Modeling notes

- **`INVENTORY`** has a composite unique key `(productId, warehouseId)` — one stock record per product × warehouse combination.
- **`PRODUCT.sku`** and **`USER.email`** are unique.
- **`RESERVATION.status`** and **`USER.role`** are `String`, not Prisma `enum` — the `sqlserver` connector doesn't support native Prisma enums. Valid values (`Pending`/`Confirmed`/`Cancelled`, `Admin`/`Operator`) are validated via Zod at the API layer.
- There is no relation between `USER` and `RESERVATION` — the PRD does not associate the authenticated user with the reservation they create; the JWT is only used for authentication/authorization.
- A missing `INVENTORY` row for a product × warehouse combination is treated as quantity `0` (no pre-created "zero" row).
- **`USER.passwordHash`** is never serialized in any API response. The login response (and any other
  user-facing payload) returns only `id`, `email`, and `role` — the hash stays internal to the
  repository layer and is excluded at the response-schema level, not just by convention.

---

## Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | **Bun** 1.3+ | Fast JavaScript runtime with built-in bundler, test runner, and TS support. ~4x faster startup than Node.js. |
| HTTP Framework | **Fastify** 5 | One of the fastest Node.js frameworks. Native schema validation, TypeScript-first, plugin-based architecture. |
| ORM | **Prisma** 7 | Type-safe queries, auto-generated client with full IntelliSense, declarative schema. Adapter-based driver system enables database portability. |
| Database | **SQL Server 2022** (Docker) | Required by the PRD. Runs locally in Docker for development. See [Database Swappability](#database-swappability) for why this is not a constraint. |
| Auth | **JWT (HS256)** via `jsonwebtoken` | Stateless authentication. Token carries user ID, email, and role. |
| Validation | **Zod** 4 | Runtime validation + TypeScript type inference. Integrated with Fastify via `@fastify/type-provider-zod` for automatic request/response validation and OpenAPI spec generation. |
| Tests | **Vitest** + **Supertest** | Fast test runner compatible with both Bun and Node. Supertest provides HTTP-level assertions for integration tests. |

### Why not .NET?

The original specification considered .NET, but Node.js (via Bun) was chosen because:

- **Faster development cycle** for a CRUD-heavy application — no compilation step, hot reload, instant feedback
- **Unified language** across frontend and backend — the frontend is also TypeScript
- **Excellent ecosystem** for JSON APIs — Fastify + Zod is purpose-built for this workload
- The client explicitly authorized this decision via email

---

## Request Flow

```mermaid
graph TD
    A["HTTP Request"] --> B["Route handler"]
    B --> C["Zod validation<br/>(body / params / query)"]
    C -->|"invalid"| D["400 Validation Error"]
    C -->|"valid"| E["authenticate middleware<br/>(JWT verification)"]
    E -->|"invalid token"| F["401 Unauthorized"]
    E -->|"valid token"| G["authorize middleware<br/>(role check)"]
    G -->|"wrong role"| H["403 Forbidden"]
    G -->|"allowed"| I["Use case<br/>(business rules)"]
    I -->|"rule violated"| J["DomainError →<br/>errorHandler maps to HTTP status"]
    I -->|"success"| K["Repository<br/>(Prisma database call)"]
    K --> L["JSON Response"]
    J --> L
```

The pipeline applies in this order:
1. **Zod validation** — request body, params, and query are validated before the handler runs. Invalid input returns `400` immediately.
2. **Authenticate** — verifies the JWT from the `Authorization: Bearer <token>` header. Sets `request.user` on success.
3. **Authorize** — checks if the user's role is in the allowed list for the route.
4. **Use case** — executes business logic. If a rule is violated, throws a typed `DomainError`.
5. **Repository** — persists data via Prisma. The reservation flow uses a Unit of Work with Serializable isolation.
6. **Error handler** — catches any thrown error and maps it to a consistent JSON error response.

---

## Transaction Flow (Reservations)

Reservation creation and cancellation use a **Unit of Work** pattern with **Serializable isolation**
to guarantee stock consistency under concurrent access:

```mermaid
sequenceDiagram
    participant Client
    participant Route as POST /api/reservations
    participant UseCase as CreateReservation
    participant UoW as UnitOfWork<br/>(Serializable tx)
    participant ProdRepo as ProductRepository
    participant WhRepo as WarehouseRepository
    participant InvRepo as InventoryRepository
    participant ResRepo as ReservationRepository

    Client->>Route: { productId, warehouseId, quantity }
    Route->>Route: Zod validation
    Route->>UseCase: execute(input)

    Note over UseCase,UoW: Quantity validation (>= 1)

    UseCase->>UoW: run(repositories)

    UoW->>ProdRepo: findById(productId)
    ProdRepo-->>UoW: product
    alt product is null
        UoW-->>UseCase: throw NotFoundError('Product')
    end

    alt product.isActive is false
        UoW-->>UseCase: throw InactiveProductError (422)
    end

    UoW->>WhRepo: findById(warehouseId)
    WhRepo-->>UoW: warehouse
    alt warehouse is null
        UoW-->>UseCase: throw NotFoundError('Warehouse')
    end

    alt warehouse.isActive is false
        UoW-->>UseCase: throw InactiveWarehouseError (422)
    end

    UoW->>InvRepo: findByProductAndWarehouse(productId, warehouseId)
    InvRepo-->>UoW: inventory
    alt inventory is null or inventory.quantity < quantity
        UoW-->>UseCase: throw InsufficientStockError (422)
    end

    UoW->>InvRepo: decrementQuantity(inventoryId, quantity)
    UoW->>ResRepo: create({ productId, warehouseId, quantity, status: 'Pending' })
    ResRepo-->>UoW: reservation

    UoW-->>UseCase: reservation
    UseCase-->>Route: 201 Created
    Route-->>Client: Reservation JSON
```

### Retry on write conflict

The `UnitOfWork` wraps the transaction in a retry loop (up to 3 attempts) that catches
Prisma error code `P2034` (write conflict). This happens when two concurrent transactions try
to modify the same inventory record — Serializable isolation detects the conflict and aborts
one transaction. The retry re-executes the entire reservation flow with fresh data.

```typescript
// PrismaUnitOfWork.ts (simplified)
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    return await prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error.code !== 'P2034') throw error;
    // retry on write conflict
  }
}
```

---

## Error Handling Pipeline

```mermaid
graph TD
    Err[Any thrown error] --> DomainError{DomainError?}
    DomainError -->|"Yes"| Send["Send error.code, error.message, error.statusCode"]
    DomainError -->|"No"| ZodErr{Zod validation error?}
    ZodErr -->|"Yes"| ValErr["Send 400 + joined validation messages"]
    ZodErr -->|"No"| SerialErr{Response serialization error?}
    SerialErr -->|"Yes"| LogInternal["Log internal details<br/>(issues, method, url)"]
    LogInternal -->|"Don't leak"| Generic500["Send 500 + generic message"]
    SerialErr -->|"No"| UnknownErr["Send 500 + generic message"]
    UnknownErr -->|"Also log"| Log["Log full error"]
```

All error responses follow the same JSON format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description.",
  "statusCode": 400
}
```

### Error codes

| Code | HTTP Status | Source | Trigger |
|------|-------------|--------|---------|
| `VALIDATION_ERROR` | `400` | `errorHandler.ts` | Zod schema validation failure |
| `UNAUTHORIZED` | `401` | `authenticate.ts` | Missing, invalid, or expired JWT |
| `FORBIDDEN` | `403` | `authorize.ts` | Role not in allowed list |
| `NOT_FOUND` | `404` | `NotFoundError.ts` | Resource (product/warehouse/etc.) not found |
| `DUPLICATE_SKU` | `409` | `DuplicateSkuError.ts` | Product SKU already exists |
| `INACTIVE_PRODUCT` | `422` | `InactiveProductError.ts` | Attempt to reserve an inactive product |
| `INACTIVE_WAREHOUSE` | `422` | `InactiveWarehouseError.ts` | Attempt to reserve from an inactive warehouse |
| `INSUFFICIENT_STOCK` | `422` | `InsufficientStockError.ts` | Requested quantity exceeds available stock |
| `NEGATIVE_QUANTITY` | `422` | `AdjustInventory.ts` | Attempt to set negative inventory quantity |
| `RESERVATION_ALREADY_CANCELLED` | `422` | `ReservationAlreadyCancelledError.ts` | Attempt to cancel an already cancelled reservation |
| `INVALID_CREDENTIALS` | `401` | `Login.ts` | Email or password does not match |
| `INTERNAL_SERVER_ERROR` | `500` | `errorHandler.ts` | Unexpected error (response serialization failure, unhandled exception) |

**Serialization errors** (Fastify cannot serialize the response against the declared Zod schema)
return `500` without leaking internal details — the validation issues are logged server-side only.

---

## Database Swappability

One of the core architectural decisions: **the system is not coupled to SQL Server**.
Switching to MySQL, PostgreSQL, or another Prisma-supported database requires changing
exactly two lines of code and the connection string.

```mermaid
graph LR
    subgraph "Domain Layer (unchanged)"
        IProductRepo["<<interface>> IProductRepository"]
        IWhRepo["<<interface>> IWarehouseRepository"]
        IInvRepo["<<interface>> IInventoryRepository"]
        IResRepo["<<interface>> IReservationRepository"]
        IUserRepo["<<interface>> IUserRepository"]
        IUoW["<<interface>> IUnitOfWork"]
    end

    subgraph "Infrastructure Layer (swap here)"
        PrismaProd["PrismaProductRepository"]
        PrismaWh["PrismaWarehouseRepository"]
        PrismaInv["PrismaInventoryRepository"]
        PrismaRes["PrismaReservationRepository"]
        PrismaUser["PrismaUserRepository"]
        PrismaUoW["PrismaUnitOfWork"]
    end

    subgraph "Prisma Client"
        Client["PrismaClient"]
    end

    subgraph "Database Adapter"
        MSSQL["PrismaMssql<br/>(current)"]
        MySQL["PrismaMysql<br/>(alternative)"]
        PG["PrismaPg<br/>(alternative)"]
    end

    subgraph "Database"
        SQLSrv[("SQL Server 2022")]
        MySQLDB[("MySQL 8")]
        PGDB[("PostgreSQL 16")]
    end

    IProductRepo -.->|"implements"| PrismaProd
    IWhRepo -.->|"implements"| PrismaWh
    IInvRepo -.->|"implements"| PrismaInv
    IResRepo -.->|"implements"| PrismaRes
    IUserRepo -.->|"implements"| PrismaUser
    IUoW -.->|"implements"| PrismaUoW

    PrismaProd --> Client
    PrismaWh --> Client
    PrismaInv --> Client
    PrismaRes --> Client
    PrismaUser --> Client
    PrismaUoW --> Client

    Client --> MSSQL
    Client --> MySQL
    Client --> PG

    MSSQL --> SQLSrv
    MySQL --> MySQLDB
    PG --> PGDB
```

### How it works

**1. Repository interfaces are pure contracts**

Located in `domain/repositories/`, they define only TypeScript types — no database imports:

```typescript
// domain/repositories/IProductRepository.ts
export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  create(data: CreateProductInput): Promise<Product>;
  // ...
}
```

**2. Prisma implementations depend on an adapter**

The Prisma client is instantiated with a database-specific adapter:

```typescript
// infrastructure/database/prisma.ts
import { PrismaMssql } from '@prisma/adapter-mssql';

const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });
```

**3. To switch databases, change the adapter and connection string**

| Target | Adapter | Package | Connection string format |
|--------|---------|---------|-------------------------|
| SQL Server (current) | `PrismaMssql` | `@prisma/adapter-mssql` | `sqlserver://host:1433;database=wrms;user=sa;password=...;encrypt=true` |
| PostgreSQL | `PrismaPg` | `@prisma/adapter-pg` | `postgresql://user:password@host:5432/wrms` |
| MySQL | `PrismaMysql` | `@prisma/adapter-mysql` | `mysql://user:password@host:3306/wrms` |

**4. The Prisma schema would also need minor adjustments**

```prisma
// Current (SQL Server)
datasource db {
  provider = "sqlserver"
}

// For PostgreSQL
datasource db {
  provider = "postgresql"
}

// For MySQL
datasource db {
  provider = "mysql"
}
```

### Why this matters

The original PRD specified SQL Server, but considered MySQL as an alternative. The clean
architecture ensures this decision can be deferred or reversed without touching business logic,
use cases, routes, or tests. The domain layer (`entities/`, `repositories/`, `errors/`) and
application layer (`use-cases/`) are completely database-agnostic.

The only files that change are:

| File | Change |
|------|--------|
| `prisma/schema.prisma` | `provider = "mysql"` (or `"postgresql"`) |
| `src/infrastructure/database/prisma.ts` | Swap `PrismaMssql` for `PrismaMysql` (or `PrismaPg`) |
| `package.json` | Swap `@prisma/adapter-mssql` for the appropriate adapter package |
| `.env` | Update `DATABASE_URL` format |

Zero changes to:

- All `domain/` files (entities, repository interfaces, errors)
- All `application/` files (use cases)
- All `api/` files (routes, schemas, middlewares)
- All test files

---

## MySQL → SQL Server Synchronization (Optional Discussion Topic)

> Discussion only, per the assessment's scope — no implementation is included in this repository.

**Scenario**: the company acquires another business whose product catalog lives in a separate MySQL
database. Both catalogs need to coexist without duplicating SKUs or drifting out of sync.

### 1. Initial migration (one-time)

A batch ETL job:

1. Extract the MySQL product table (`mysqldump` or a direct `SELECT`).
2. Transform rows into the WRMS `Product` shape (`sku`, `name`, `description`, `isActive`), deduplicating
   by `sku` — if a SKU already exists in WRMS, the MySQL row updates it instead of creating a duplicate.
3. Load into SQL Server (Prisma `createMany`/`upsert` for moderate volumes, `BULK INSERT` for large ones).
4. Each imported row stores the source table's original primary key in a new `externalId` column, so the
   link back to the MySQL row is never lost.

### 2. Continuous synchronization (ongoing)

Two approaches, in order of preference:

- **CDC (Change Data Capture)** — a connector (e.g. Debezium) reads the MySQL binlog and publishes
  row-level change events (insert/update/delete) to a message queue (RabbitMQ/Kafka). A consumer service
  applies those events to SQL Server using the same `externalId`/`sku` rules as the initial migration.
  Near-real-time, no polling load on the source database.
- **Polling fallback** — if CDC infrastructure isn't available, a scheduled job queries MySQL for rows
  where `updatedAt > lastSyncTimestamp` and applies the same upsert logic. Simpler to operate, higher
  latency, and depends on the source table actually maintaining `updatedAt`.

```mermaid
graph LR
    MySQL[("MySQL<br/>(acquired catalog)")] -->|binlog| CDC["CDC connector<br/>(Debezium)"]
    CDC --> Queue[["Message Queue<br/>(RabbitMQ / Kafka)"]]
    Queue --> Consumer["Sync consumer"]
    Consumer -->|"upsert by externalId,<br/>dedupe by sku"| SQLServer[("SQL Server<br/>Product table")]
```

### 3. Consistency strategy

- **`externalId`** (nullable, unique when present) on `Product` maps each WRMS row back to its MySQL
  source row. This makes every sync operation an idempotent upsert (`WHERE externalId = ?`) instead of a
  blind insert — replaying the same event twice has no effect.
- **`sku`** is the deduplication key *between* the two systems — both already enforce SKU uniqueness
  internally, so a SKU collision across systems is treated as "the same product" and merged, not
  duplicated.
- **Ownership boundary**: rows with `externalId IS NOT NULL` are owned by MySQL (sync is one-directional,
  MySQL → SQL Server); WRMS-native rows (`externalId IS NULL`) are never touched by the sync job. This
  avoids two-way conflict resolution for the scope of this discussion — if the catalogs eventually need
  to merge into one system of record, that's a separate migration, not an ongoing sync concern.

---

## Scaling & Performance

### Stateless architecture

The application server holds no in-memory state tied to a specific instance. JWT tokens carry
all authentication data, and the database is the single source of truth for business data.
This means:

- **Horizontal scaling**: add more server instances behind a load balancer with no code changes
- **Zero-downtime deployments**: new instances start accepting traffic immediately
- **No sticky sessions**: any instance can handle any request

### Database bottleneck

For a CRUD-heavy inventory system, the database is the primary bottleneck:

- **Read-heavy**: dashboard queries aggregate across all tables. In a high-volume scenario, read
  replicas would serve these queries while the primary handles writes.
- **Write contention**: the Serializable isolation level guarantees correctness but limits
  concurrency on the `inventory` table during peak reservation throughput.
- **Connection pool**: Prisma manages a connection pool. The default works for development;
  production deployments should tune `connection_limit` in the `DATABASE_URL`.

### Why no cache

Stock data is write-heavy and correctness-critical. Caching inventory quantities introduces
stale-read risk — a cache hit could show available stock that was just reserved. For this
domain, **consistency over latency** is the correct trade-off.

The `GET /api/dashboard` endpoint is the most expensive query (it reads all 4 tables and
joins in-memory). If this becomes a bottleneck, the first optimization would be a materialized
view or a dedicated dashboard table updated via triggers, not a cache layer.

### Current limits (acceptable for scope)

| Aspect | Current | Production target |
|--------|---------|-------------------|
| Pagination | None | Cursor-based pagination on list endpoints |
| Connection pool | Default | Configurable via `DATABASE_URL` |
| Read replicas | None | Dashboard queries → replica |
| Connection pooling | None (direct) | PgBouncer (if PG) or similar |

---

## Trade-offs

### String roles instead of enums

`USER.role` and `RESERVATION.status` are stored as `String` columns, not Prisma enums.
The `sqlserver` provider does not support native Prisma enums. Validation is done at the
API layer via Zod:

```typescript
z.enum(['Admin', 'Operator'])
z.enum(['Pending', 'Confirmed', 'Cancelled'])
```

**Cost**: the database does not enforce valid values — a direct SQL insert could bypass validation.
**Benefit**: works with SQL Server without workarounds.

### No refresh token

JWT has a 7-day expiration (configurable via `JWT_EXPIRES_IN`). There is no refresh token
endpoint or token blacklist.

**Cost**: a leaked token is valid for up to 7 days. Revoking access requires changing the
`JWT_SECRET` (which invalidates all tokens). No way to force logout a specific user.
**Benefit**: simpler architecture — no refresh token storage, no rotation logic. Acceptable for
an internal system with trusted users.

### No pagination

List endpoints (`GET /api/products`, `GET /api/reservations`, etc.) return all records at once.

**Cost**: with thousands of records, response sizes grow and database queries slow down.
**Benefit**: simplifies the initial implementation. The PRD scope does not require large datasets.

### No WebSocket / real-time

The system uses HTTP request-response only. There are no WebSocket connections for live updates.

**Cost**: operators must refresh the page to see new reservations or stock changes.
**Benefit**: simpler infrastructure (no sticky sessions, no pub/sub, no connection management).

### Serializable isolation level

Reservation transactions use `SERIALIZABLE` isolation with retry on write conflict.

**Cost**: higher contention under concurrent load. Two overlapping reservation attempts on the
same inventory record cause one to abort and retry.
**Benefit**: guarantees no oversell — two concurrent reservations cannot both succeed if the
combined quantity exceeds available stock. Correctness over throughput.

### User not linked to reservations

The `Reservation` entity has no `userId` field. Any authenticated user (Admin or Operator)
can create or cancel any reservation.

**Cost**: no audit trail of who created or cancelled a reservation. No per-user reservation
filtering.
**Benefit**: simpler domain model. The PRD did not require user-reservation association.

### Tests run against a real database

Integration tests spin up a separate `wrms_test` database and push the schema before each run.
They are not mocked.

**Cost**: slower than pure unit tests. Requires a running SQL Server instance.
**Benefit**: tests actually verify SQL queries, constraints, and transaction behavior. The
unit tests (use cases) are mocked and fast — the integration tests cover the real integration
points.

### `GET /api/products` opened to Operator

The PRD's permission table scoped every product endpoint to Admin only. However, the reservation
form — used by both Admin and Operator — needs to populate a product dropdown.

**Decision**: `GET /api/products` is open to both roles; `POST /api/products` and
`PUT /api/products/:id` stay Admin-only.

**Cost**: Operator gets read access to the full product catalog (SKU, name, status) that the
original spec scoped to Admin only. An alternative would have been a dedicated dropdown endpoint
returning only `{ id, name }` for active products, but that would add an extra endpoint for no
real security gain — the product list is not sensitive data.

**Benefit**: the reservation form works without inventing a second, redundant endpoint.

### `GET /api/warehouses` opened to Operator

The PRD's first-pass permission table scoped every warehouse endpoint to Admin only. In practice,
the reservation form — used by both Admin and Operator — needs to populate a warehouse dropdown.

**Decision**: `GET /api/warehouses` is open to both roles; `POST /api/warehouses` stays Admin-only.

**Cost**: Operator gets read access to warehouse data (name, location, active status) that the
original spec scoped to Admin only.
**Benefit**: the reservation form works without inventing a second, redundant endpoint just to
list warehouse names for a dropdown.

### No public user registration

There is no `POST /api/auth/register` endpoint. Users (Admin and Operator) are created exclusively
via the Prisma seed script.

**Cost**: onboarding a new user requires direct database/seed access — there's no self-service
signup flow.
**Benefit**: this is an internal operational tool, not a public-facing product — every user is a
known, vetted employee. Skipping registration removes a whole surface (email verification,
password policy, account recovery) that has no real use case here.

---

## Technical Decisions

### Zod 4 + `@fastify/type-provider-zod` for schema validation

The combination of Zod 4 and the Fastify type provider generates:

- **Runtime validation**: request body, params, query, and response are validated automatically
- **OpenAPI 3.0.3 spec**: every Zod schema is converted to an OpenAPI-compatible JSON Schema
  via `jsonSchemaTransform` — no manual Swagger annotations needed
- **TypeScript types**: inferred from Zod schemas, no type duplication

```typescript
// One schema → validation + types + OpenAPI
export const createProductBodySchema = z.object({
  sku: z.string().min(1).describe('Unique product SKU'),
  name: z.string().min(1).describe('Product name'),
});
```

### `bcryptjs` instead of `bcrypt`

The `bcrypt` package uses native C++ bindings (node-gyp), which can cause installation issues
with Bun and different Node versions. `bcryptjs` is a pure JavaScript implementation:

- **Zero native dependencies** — works in any JavaScript runtime
- **Identical API** — drop-in replacement
- **Slightly slower** — the difference is negligible for a login endpoint (sub-millisecond)

### `PrismaMssql` adapter

Prisma 7 introduced the adapter-based driver system. Instead of using the built-in SQL Server
connector, the project uses the adapter pattern:

```typescript
const adapter = new PrismaMssql(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });
```

This is the same mechanism that enables database swappability — PostgreSQL and MySQL have
their own adapters (`PrismaPg`, `PrismaMysql`) with the same `PrismaClient` API.

### Unit of Work with retry

The `PrismaUnitOfWork` wraps reservation transactions in a retry loop (up to 3 attempts) that
only retries on **write conflict errors** (Prisma code `P2034`). This is distinct from a simple
`$transaction` call — the retry handles the case where two concurrent transactions conflict
under Serializable isolation:

```typescript
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    return await prisma.$transaction(fn, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error.code !== 'P2034') throw error;
    // Only retry on write conflict
  }
}
```

### Vitest (not Bun test)

Tests use Vitest with Supertest, not Bun's built-in test runner. This is because:

- **Vitest workers run under Node** — `typeof Bun` is `undefined` inside test files
- **Environment loading** — Bun's automatic `.env` loading does not reach Vitest workers,
  so `vitest.config.ts` and `tests/setup/global-setup.ts` use `dotenv` explicitly
- **Supertest** — provides HTTP-level assertions against Fastify's server instance without
  needing a running server

---

## Scripts

```bash
bun run dev              # start with watch mode (hot reload)
bun run start            # start server
bun run lint             # lint & auto-fix (Biome)
bun run format           # format (Biome)
bun run check            # lint + format + organize imports (Biome)
bun run test             # run all tests (Vitest)
bun run test:watch       # run tests in watch mode
bunx prisma db push      # sync Prisma schema to database
bunx prisma db seed      # seed database with test data
bunx prisma studio       # open Prisma Studio (data browser)
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

Configure these variables in `.env`:

| Variable | Description |
|----------|-------------|
| `SA_PASSWORD` | SQL Server SA password (used by Docker) |
| `DATABASE_URL` | Prisma connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | Token expiration duration (e.g. `7d`) |
| `PORT` | Server port (default: `3333`) |
| `CORS_ORIGIN` | Allowed origin for browser requests (frontend dev server, e.g. `http://localhost:5173`) |

### Run with Docker (database only)

```bash
docker compose up -d
```

This starts SQL Server on port 1433. Wait until you see
`SQL Server is now ready for client connections` in the logs:

```bash
docker compose logs -f
```

### Run locally

```bash
bun install
bunx prisma db push
bunx prisma db seed
bun --hot src/server.ts
```

The server starts at `http://localhost:3333`.

Swagger UI is available at `http://localhost:3333/documentation`.

### Run with everything in Docker

```bash
docker compose --profile full up --build
```

This starts SQL Server + backend + frontend.

### Seed credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@wtec.com` | `Admin@123` |
| Operator | `operator@wtec.com` | `Operator@123` |

---

## Testing

```bash
bun run test         # run all tests
bun run test:watch   # run in watch mode during development
```

### Test structure

```
tests/
├── unit/
│   ├── CreateProduct.test.ts        # mocked product repository
│   ├── CreateReservation.test.ts    # mocked unit of work + repositories
│   ├── CancelReservation.test.ts    # mocked unit of work + repositories
│   ├── AdjustInventory.test.ts      # mocked inventory repository
│   ├── domain/errors.test.ts        # pure unit tests for error classes
│   └── infrastructure/JwtService.test.ts
├── integration/
│   ├── app.test.ts                  # error handler, auth, swagger
│   ├── auth.test.ts                 # login flow
│   ├── products.test.ts             # CRUD against real database
│   ├── warehouses.test.ts
│   ├── inventory.test.ts
│   ├── reservations.test.ts
│   ├── dashboard.test.ts            # aggregation queries
│   ├── authorization.test.ts        # role-based access
│   └── repositories.test.ts         # Prisma repository implementations
└── setup/
    └── global-setup.ts              # pushes schema to wrms_test database
```

- **Unit tests** mock all repository interfaces. They test use case logic in isolation — fast, no database needed.
- **Integration tests** run against a separate `wrms_test` database (configured in `.env.test`). The global setup pushes the Prisma schema before the test suite runs.
- The test database is automatically kept in sync — no manual migration management.

---

## Future Improvements

- **Pagination and filters** on list endpoints (cursor-based or offset-based)
- **Refresh token + blacklist** for revoked tokens
- **Reservation confirmation** workflow (Pending → Confirmed) by Admin
- **Real-time notifications** (WebSocket) for operators
- **Stock movement reports** (history of inventory changes)
- **User-reservation association** for audit trail
- **Dashboard materialized view** for faster aggregation queries
- **Database read replicas** for separating read and write traffic

---

## AI Usage

Claude was used for: architecture planning, scaffolding generation, business rule review,
and test suggestions. All engineering decisions, implementation, and code review were
performed by the developer.

---

> **Document generated:** 2026-06-16
