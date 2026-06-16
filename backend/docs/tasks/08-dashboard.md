# Dashboard Implementation Plan

**Goal:** Implement `GET /api/dashboard` — a rich aggregation endpoint that exposes four data sections for the UI dashboard: `metrics` (6 counters), `lowStockItems` (products below threshold), `recentReservations` (last 5), and `warehouseMetrics` (per-warehouse breakdown).

**Architecture:** Pure read aggregation — no writes, no transactions, no locks. The use case fetches all products, warehouses, inventory, and reservations in parallel via `Promise.all`, joins them in-memory using `Map<string, T>` indexes, and returns the combined result.

**Tech Stack:** Same as all prior subsystems — Fastify, Zod, `@fastify/type-provider-zod`, Prisma. No new dependencies.

---

## Response shape

```json
{
  "metrics": {
    "totalProducts": 2,
    "totalWarehouses": 2,
    "totalInventory": 103,
    "activeReservations": 2,
    "cancelledReservations": 1,
    "reservationsCreatedToday": 3
  },
  "lowStockItems": [
    {
      "productName": "Low Stock Product",
      "productSku": "DASH-LOW-...",
      "warehouseName": "Main Warehouse",
      "quantity": 3,
      "threshold": 10
    }
  ],
  "recentReservations": [
    {
      "id": "uuid",
      "productName": "Main Product",
      "warehouseName": "Main Warehouse",
      "quantity": 3,
      "status": "Cancelled",
      "createdAt": "2026-06-16T..."
    }
  ],
  "warehouseMetrics": [
    {
      "warehouseName": "Main Warehouse",
      "location": "Sao Paulo, SP",
      "totalProducts": 2,
      "totalQuantity": 103,
      "activeReservations": 2
    }
  ]
}
```

## Repository changes

### `IReservationRepository` — 2 new methods

| Method | Returns | SQL |
|--------|---------|-----|
| `countCancelled()` | `Promise<number>` | `COUNT WHERE status = 'Cancelled'` |
| `countCreatedToday()` | `Promise<number>` | `COUNT WHERE createdAt >= today 00:00` |

Both implemented in `PrismaReservationRepository` with Prisma `count()`.

No other repository interfaces changed. Existing methods reused:
- `IProductRepository.countActive()` → `metrics.totalProducts`
- `IProductRepository.findAll()` → product name/SKU lookups
- `IWarehouseRepository.findAll()` → `metrics.totalWarehouses` + warehouse name lookups
- `IInventoryRepository.sumQuantity()` → `metrics.totalInventory`
- `IInventoryRepository.findAll()` → low stock filter + warehouse aggregation
- `IReservationRepository.countActive()` → `metrics.activeReservations`
- `IReservationRepository.findAll()` → recent reservations + warehouse aggregation

## Files

| Action | File |
|--------|------|
| Modify | `src/domain/repositories/IReservationRepository.ts` — add 2 method signatures |
| Modify | `src/infrastructure/repositories/PrismaReservationRepository.ts` — implement both |
| Create | `src/api/schemas/dashboard.schema.ts` — 4 section schemas + root response |
| Create | `src/application/use-cases/dashboard/GetDashboard.ts` — full aggregation logic |
| Modify | `src/api/routes/dashboard.routes.ts` — add `PrismaWarehouseRepository` DI |
| Create | `tests/integration/dashboard.test.ts` — 18 test cases |
| Create | `docs/dashboard-endpoint.md` — API reference |

## Notes

- **No unit test for GetDashboard.** The use case is in-memory aggregation of three repository results. Every repository method it calls is already tested by existing integration tests. The integration test validates the full chain against the real database.
- **Low stock threshold = 10** (matches design spec "vermelho se < 10").
- **Recent reservations limit = 5** (matches design mockup).
- **Route is open to both Admin and Operator** (PRD §6: `Ver dashboard | ✅ | ✅`).
- **In-memory joins** using `Map<string, T>` indexes. All data fits in memory for the expected dataset size (dozens/hundreds of products, warehouses, reservations).
