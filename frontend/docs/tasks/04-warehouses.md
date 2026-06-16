# Armazéns

**Goal:** Warehouses page — Admin-only. Card grid showing each warehouse with its metrics, plus a "Novo Armazém" modal to create new ones. No edit in this version.

**Figma references:** `node-id=1-2150` (list/grid), `node-id=1-2318` (Novo Armazém modal)

**Access:** Admin only — route wrapped in `AdminLayout` (introduced in task 02).

---

## Architecture

`ArmazensPage` → `useWarehouses` hook → `GET /api/warehouses`. Metric data (totalProducts, totalQuantity, activeReservations per warehouse) comes from `warehouseMetrics` on `GET /api/dashboard` — fetched via the existing `useDashboard` hook and merged by warehouse name. Create action: `useCreateWarehouse` mutation → `POST /api/warehouses` → invalidates `warehouses` query.

**Folder layout:**
```
features/warehouses/
├── pages/ArmazensPage.tsx
├── components/WarehouseCard.tsx
├── components/NovoArmazemModal.tsx
├── hooks/useWarehouses.ts
├── hooks/useCreateWarehouse.ts
├── schemas/warehouseSchema.ts         # Zod: { name, location, isActive? }
└── services/warehousesApi.ts
```

## UI

- Page header: title "Armazéns" + "Novo Armazém" button → opens `NovoArmazemModal`.
- Layout: card grid (not a table). Each `WarehouseCard` shows: name · location · totalProducts · totalQuantity · activeReservations · isActive status badge.
- `NovoArmazemModal`: fields Nome do Armazém (required) · Localização (required) · Status toggle (default: Ativo). On success: close + toast "Armazém criado".

## Decisions

- No edit modal — `PUT /api/warehouses/:id` does not exist in the API. API contract explicitly notes this.
- Warehouse metrics (per-card numbers) come from `warehouseMetrics` on the dashboard endpoint — no separate per-warehouse metrics endpoint exists.
- If `warehouseMetrics` and `warehouses` lists are mismatched (e.g., a new warehouse not yet in metrics), the card renders metrics as `0`.
