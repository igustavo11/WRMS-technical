# Dashboard Endpoint

## `GET /api/dashboard`

Returns aggregation data for the UI dashboard: summary metrics, low-stock alerts, recent reservations, and per-warehouse breakdowns.

**Auth:** `Admin` | `Operator`

---

## Response

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
      "id": "0195b0d7-...",
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

---

## Fields

### `metrics`

| Field | Type | Description |
|-------|------|-------------|
| `totalProducts` | `number` | Count of products where `isActive = true` |
| `totalWarehouses` | `number` | Total warehouse count |
| `totalInventory` | `number` | Sum of all inventory quantities across all warehouses |
| `activeReservations` | `number` | Count of reservations with `Pending` or `Confirmed` status |
| `cancelledReservations` | `number` | Count of reservations with `Cancelled` status |
| `reservationsCreatedToday` | `number` | Count of reservations created since 00:00 today |

### `lowStockItems`

Items where inventory quantity is below the threshold (10 units). Each item includes:

| Field | Type | Description |
|-------|------|-------------|
| `productName` | `string` | Product name |
| `productSku` | `string` | Product SKU |
| `warehouseName` | `string` | Warehouse name |
| `quantity` | `number` | Current stock quantity |
| `threshold` | `number` | Low-stock threshold (always `10`) |

### `recentReservations`

Last 5 reservations sorted by `createdAt` descending. Each item includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Reservation UUID |
| `productName` | `string` | Resolved product name |
| `warehouseName` | `string` | Resolved warehouse name |
| `quantity` | `number` | Reserved quantity |
| `status` | `string` | `Pending` / `Confirmed` / `Cancelled` |
| `createdAt` | `string` (ISO 8601) | Creation timestamp |

### `warehouseMetrics`

Per-warehouse aggregation. Each item includes:

| Field | Type | Description |
|-------|------|-------------|
| `warehouseName` | `string` | Warehouse name |
| `location` | `string` | Warehouse location |
| `totalProducts` | `number` | Distinct products with inventory records in this warehouse |
| `totalQuantity` | `number` | Sum of inventory quantities in this warehouse |
| `activeReservations` | `number` | Count of non-cancelled reservations in this warehouse |

---

## Implementation notes

- **In-memory joins**: The use case fetches all products, warehouses, inventory, and reservations in one `Promise.all` call, indexes them by ID with `Map`, and joins in the application layer.
- **No pagination**: Dashboard is a summary view. Lists (`lowStockItems`, `recentReservations`, `warehouseMetrics`) are intentionally limited (5 items max for reservations, low stock by threshold).
- **Low stock threshold**: Hardcoded at `10` units, matching the design spec "vermelho se < 10" (red if below 10).
