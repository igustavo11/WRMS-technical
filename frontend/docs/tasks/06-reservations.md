# Reservas

**Goal:** Reservations page — shared between Admin and Operator. Full list with status/warehouse/date filters, "Nova Reserva" modal to create a reservation, and inline Cancelar action per row.

**Figma references:** `node-id=1-1194` (list + Nova Reserva modal open)

**Access:** Both roles — no role split needed.

---

## Architecture

`ReservasPage` → `useReservations` hook → `GET /api/reservations`. Names resolved by cross-referencing with `useProducts` and `useWarehouses` (the list response only returns IDs). Create: `useCreateReservation` mutation → `POST /api/reservations`. Cancel: `useCancelReservation` mutation → `PUT /api/reservations/:id/cancel`.

**Folder layout:**
```
features/reservations/
├── pages/ReservasPage.tsx
├── components/ReservationsTable.tsx
├── components/NovaReservaModal.tsx
├── hooks/useReservations.ts
├── hooks/useCreateReservation.ts
├── hooks/useCancelReservation.ts
├── schemas/reservationSchema.ts        # Zod: { productId, warehouseId, quantity (min 1) }
└── services/reservationsApi.ts
```

## UI

- Page header: title "Reservas" + "Nova Reserva" button → opens `NovaReservaModal`.
- Filters (client-side): Status dropdown (Todos / Pending / Confirmed / Cancelled) · Armazém dropdown · Date range picker.
- Table columns: ID · Produto · Armazém · QTD · Status (badge) · Criado em · Ação.
  - Ação column: "Cancelar" button for Pending/Confirmed rows; disabled/hidden for Cancelled.
- `NovaReservaModal`: Produto select (from `GET /api/products`) · Armazém select (from `GET /api/warehouses`) · Quantidade input. Shows available stock inline once both product + warehouse are selected (computed from inventory list). On `422 INSUFFICIENT_STOCK`, show "Estoque insuficiente. A quantidade solicitada excede o disponível no armazém." field error. On success: close + toast "Reserva criada" + invalidate `reservations` query.

## Decisions

- Names are resolved client-side by joining the reservations list with cached products/warehouses queries — the API only returns IDs on `GET /api/reservations`. The dashboard endpoint returns resolved names but only for the last 5.
- Available stock shown in the modal is computed frontend-side from `GET /api/inventory` quantity for the selected product × warehouse pair — there is no dedicated "available stock" endpoint.
- Date range filter is client-side only (no API query params for date filtering).
- "Cancelar" on an already-cancelled reservation is prevented client-side (button hidden/disabled) to avoid the `422 RESERVATION_ALREADY_CANCELLED` error path unnecessarily.
- The Nova Reserva modal is also linked from the Operator Dashboard CTA ("Criar Nova Reserva") and from the Operator Inventário page CTA. Extract the modal to `shared/components/NovaReservaModal.tsx` if those links need to trigger it inline; otherwise navigate to `/reservas` from those CTAs (simpler, deferred to integration).
