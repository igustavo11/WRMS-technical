# Seed Data Implementation Plan

**Goal:** Create a comprehensive seed script (`prisma/seed.ts`) that populates the database with enough data for a recruiter/QA to test every endpoint and edge case.

**Approach:** Idempotent script — deletes all existing data in reverse FK order, then inserts fresh records. Run via `bunx prisma db seed` (configured in `prisma.config.ts`).

---

## Data

### Users (2)

| Email | Password | Role |
|-------|----------|------|
| `admin@wtec.com` | `Admin@123` | Admin |
| `operator@wtec.com` | `Operator@123` | Operator |

### Products (5)

| SKU (UUID format) | Name | Active |
|---|---|---|
| `a1000000-0000-0000-0000-000000000001` | Cabo Solar 10mm² | ✅ |
| `a1000000-0000-0000-0000-000000000002` | Viga I 6m | ✅ |
| `a1000000-0000-0000-0000-000000000003` | Tubo de Torque | ✅ |
| `a1000000-0000-0000-0000-000000000004` | Produto Inativo | ❌ |
| `a1000000-0000-0000-0000-000000000005` | Sem Estoque | ✅ |

### Warehouses (3)

| Name | Location | Active |
|------|----------|--------|
| Armazém Central | São Paulo, SP | ✅ |
| Armazém Sul | Curitiba, PR | ✅ |
| Armazém Inativo | Rio de Janeiro, RJ | ❌ |

### Inventory (7 records)

| Product | Warehouse | Quantity |
|---------|-----------|----------|
| Cabo Solar | Central | 200 |
| Cabo Solar | Sul | 100 |
| Viga I | Central | 50 |
| Viga I | Sul | 30 |
| Tubo de Torque | Central | 10 |
| Tubo de Torque | Sul | **3** (low stock) |
| Sem Estoque | Central | **0** (zero stock) |

### Reservations (3)

| Product | Warehouse | Qty | Status |
|---------|-----------|-----|--------|
| Cabo Solar | Central | 20 | Pending |
| Viga I | Sul | 5 | Confirmed |
| Tubo de Torque | Central | 3 | Cancelled |

---

## Test scenarios covered

| # | Scenario | How to test |
|---|----------|-------------|
| 1 | Login admin | `POST /api/auth/login` with `admin@wtec.com` / `Admin@123` |
| 2 | Login operator | `POST /api/auth/login` with `operator@wtec.com` / `Operator@123` |
| 3 | Invalid credentials | Wrong password → 401 |
| 4 | List products | `GET /api/products` → 5 products |
| 5 | Create product | `POST /api/products` → 201 |
| 6 | Duplicate SKU | `POST /api/products` with existing SKU → 409 |
| 7 | Product by ID | `GET /api/products/:id` → 200 |
| 8 | Operator on products | `GET /api/products` as Operator → 403 |
| 9 | List warehouses | `GET /api/warehouses` → 3 |
| 10 | Create warehouse | `POST /api/warehouses` → 201 |
| 11 | List inventory | `GET /api/inventory` → 7 records |
| 12 | Adjust inventory | `PUT /api/inventory` → 200 |
| 13 | Negative adjust | `PUT /api/inventory` qty=-1 → 422 |
| 14 | Inventory not found | `PUT /api/inventory` random UUIDs → 404 |
| 15 | Normal reservation | `POST /api/reservations` CAB-001×Central qty=5 → 201 |
| 16 | Insufficient stock | `POST /api/reservations` qty=999 → 422 |
| 17 | Inactive product | `POST /api/reservations` with INA-001 → 422 |
| 18 | Inactive warehouse | `POST /api/reservations` with inactive wh → 422 |
| 19 | Product not found | `POST /api/reservations` random UUID → 404 |
| 20 | Warehouse not found | `POST /api/reservations` random UUID → 404 |
| 21 | Quantity = 0 | `POST /api/reservations` qty=0 → 400 |
| 22 | No inventory record | `POST /api/reservations` SEM-001×Central → 422 |
| 23 | Cancel Pending | `PUT /api/reservations/:id/cancel` → 200 + stock restored |
| 24 | Cancel Confirmed | `PUT /api/reservations/:id/cancel` → 200 |
| 25 | Cancel Cancelled | `PUT /api/reservations/:id/cancel` → 422 |
| 26 | Cancel not found | `PUT /api/reservations/:id/cancel` random UUID → 404 |
| 27 | List reservations | `GET /api/reservations` → 3 |
| 28 | Dashboard metrics | `GET /api/dashboard` → totalProducts=5, warehouses=3, etc |
| 29 | Low stock alert | Dashboard lowStockItems → Tubo de Torque × Sul (qty=3) |
| 30 | Warehouse metrics | Dashboard warehouseMetrics → per-warehouse breakdown |

## Files

| Action | File |
|--------|------|
| Create | `prisma/seed.ts` — seed script |
| Modify | `prisma.config.ts` — add `migrations.seed` config |
| Create | `docs/tasks/09-seed.md` — this file |
