# Reservations

**Goal:** Reservations page — shared between Admin and Operator. Full list with status/warehouse/date filters, "New Reservation" modal to create a reservation, and inline Cancel action per row.

**Figma reference:** `node-id=1-1194` (list + New Reservation modal open)

**Access:** Both roles — no role split needed.

---

## Architecture

`ReservationsPage` → `useReservations` hook → `GET /api/reservations`. Names resolved client-side by cross-referencing with `useProducts` (from `features/products/hooks/useProducts`) and `useWarehouses` (from `features/inventory/hooks/useInventory`) — both already exist and share TanStack Query cache keys `['products']` and `['warehouses']`.

Create: `useCreateReservation` mutation → `POST /api/reservations`.
Cancel: `useCancelReservation` mutation → `PUT /api/reservations/:id/cancel`.

**Folder layout:**
```
features/reservations/
├── pages/ReservationsPage.tsx
├── components/ReservationsTable.tsx
├── components/NewReservationModal.tsx
├── hooks/useReservations.ts
├── hooks/useCreateReservation.ts
├── hooks/useCancelReservation.ts
├── schemas/reservationSchema.ts        # Zod: { productId, warehouseId, quantity (min 1) }
└── services/reservationsApi.ts
```

Route: update `routes.ts` — replace `placeholder.tsx` for `reservations` with `features/reservations/pages/ReservationsPage.tsx`.

---

## UI

### Page

- Header: title "Reservations" + "New Reservation" button — solid teal: `bg-[#1cc8a8] text-[#00382d]`
- Filters bar (client-side only): Status select · Warehouse select · Date range (two inputs: From / To) · "Clear Filters" button
- Table + New Reservation modal

### Table columns

| Column | Notes |
|--------|-------|
| ID | First 8 chars of UUID, prefixed with `#` (e.g. `#0195b0d7`) |
| Product | Resolved from `useProducts` by `productId` |
| Warehouse | Resolved from `useWarehouses` by `warehouseId` |
| Qty | Right-aligned |
| Status | Badge (see colors below) |
| Created at | Formatted date (`DD MMM YYYY, HH:mm`) |
| Action | See action rules below |

> **"Created by" column omitted.** The Figma design shows a "Criado por" column, but the API never returns user info — reservations are not tied to any user (`GET /api/reservations` has no `userId` field). Omitting it avoids showing a permanently empty column.

### Status badges

| Status | Background | Border | Text |
|--------|-----------|--------|------|
| `Pending` | `rgba(239,159,39,0.15)` | `rgba(239,159,39,0.3)` | `#ef9f27` |
| `Confirmed` | `rgba(28,200,168,0.15)` | `rgba(28,200,168,0.3)` | `#1cc8a8` |
| `Cancelled` | `rgba(226,75,74,0.15)` | `rgba(226,75,74,0.3)` | `#e24b4a` |

### Action column rules

- **Pending** → "Cancel" button: `border border-[#e24b4a] text-[#e24b4a] rounded-[10px]`
- **Confirmed** → "Cancel" button (same style as Pending) — the API supports cancelling Confirmed reservations; showing "Cancel" is more useful than a non-functional "View Details"
- **Cancelled** → `—` (no action). Button hidden to avoid the `422 RESERVATION_ALREADY_CANCELLED` error path

> **Figma discrepancy:** Figma shows "View Details" for Confirmed and Cancelled rows, but there is no detail view in the current scope. The pragmatic choice is Cancel for Pending/Confirmed and nothing for Cancelled, aligned with the API's business rules.

### New Reservation Modal

Fields:
- **Product** `*` — shadcn `Select`, options from `GET /api/products` (only active products shown)
- **Warehouse** `*` — shadcn `Select`, options from `GET /api/warehouses` (only active warehouses shown)
- **Quantity** `*` — number input, min 1

Inline stock info (shown once both Product and Warehouse are selected):
```
ⓘ Available: X units   ← teal #1cc8a8
```
Computed from `GET /api/inventory` for the selected `productId × warehouseId` pair.

Error states:
- Quantity > available stock → red border on input + `"Insufficient stock. The requested quantity exceeds the available stock for this warehouse."` field error
- `422 INSUFFICIENT_STOCK` from API → same field error (guard for race conditions)
- `422 INACTIVE_PRODUCT` / `422 INACTIVE_WAREHOUSE` → toast error
- Submit button disabled while `isPending` or when a field-level error exists

On success: close modal + `toast.success("Reservation created.")` + invalidate `['reservations']` and `['inventory']` queries.

Footer buttons:
- "Cancel" — `bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0f0f0]`
- "Create Reservation" — enabled: `bg-[#1cc8a8] text-[#00382d]` / disabled: `bg-[#353534] text-[#a0a0a0]`

---

## Decisions

- **Name resolution is client-side.** The `GET /api/reservations` response contains only `productId` and `warehouseId`. Names are resolved by looking up the cached `['products']` and `['warehouses']` queries — no extra fetches needed at render time.
- **Available stock is computed frontend-side.** `GET /api/inventory` returns total quantity (available + reserved). The modal uses this value directly as "available" — it's a close-enough approximation since the same session's reservations have already deducted stock at the API level.
- **Date range filter is client-side only.** No API query params for date filtering. Two `date` inputs (From / To) filter `createdAt` against the selected range.
- **Warehouse filter shows only warehouse names in scope.** Filter options are built from `useWarehouses`, so the dropdown reflects actual warehouses rather than only those present in the current reservation list.
- **Reuse existing hooks.** `useProducts` from `features/products/hooks/useProducts` and `useWarehouses`/`useInventory` from `features/inventory/hooks/useInventory` are imported directly — no duplication of API functions.

---

## Tests (`tests/reservations.test.tsx`)

### `ReservationsPage`

1. Renders loading skeleton while data is fetching
2. Renders reservation rows with resolved product and warehouse names
3. Status badge renders correct color for each status (Pending / Confirmed / Cancelled)
4. "Cancel" button shown for Pending rows
5. "Cancel" button shown for Confirmed rows
6. No Cancel button for Cancelled rows
7. Status filter — selecting "Pending" hides Confirmed and Cancelled rows
8. Warehouse filter — selecting a warehouse hides rows from other warehouses
9. Date range filter — rows outside the selected range are hidden
10. "Clear Filters" resets status, warehouse, and date range to defaults
11. "New Reservation" button opens modal

### `NewReservationModal`

1. Form validation — submit without filling fields shows required errors
2. Shows available stock once product and warehouse are both selected
3. Successful creation — closes modal, shows success toast, does not call `onClose` on cancel
4. `422 INSUFFICIENT_STOCK` from API — shows field error on quantity input
5. `422 INACTIVE_PRODUCT` — shows toast error
6. `422 INACTIVE_WAREHOUSE` — shows toast error
7. Generic error — shows generic toast error
8. "Cancel" button closes modal and resets form
9. Submit button is disabled while mutation is pending
