# Inventário

**Goal:** Inventory page — accessed by both roles but with fundamentally different UIs. Admin can adjust stock quantities via a modal; Operator sees a read-only view with stock status badges and a "Criar Reserva" CTA.

**Figma references:** `node-id=1-1606` (Admin), `node-id=1-2002` (Operator)

**Access:** Both roles — no `AdminLayout` wrapper. Role dispatch happens inside `InventarioPage`.

---

## Architecture

`InventarioPage` (route component, dispatches by role) → `InventarioAdmin` | `InventarioOperator`. Both consume `GET /api/inventory` via `useInventory` hook. Admin also needs `GET /api/products` and `GET /api/warehouses` to resolve names for the adjust modal dropdowns.

**Folder layout:**
```
features/inventory/
├── pages/InventarioPage.tsx              # role dispatch only
├── components/InventarioAdmin.tsx        # Admin UI
├── components/InventarioOperator.tsx     # Operator UI
├── components/AjustarInventarioModal.tsx # Admin only
├── hooks/useInventory.ts                 # useQuery → GET /api/inventory
├── hooks/useAdjustInventory.ts           # useMutation → PUT /api/inventory
└── services/inventoryApi.ts
```

## Admin view (`InventarioAdmin`)

- Title: "Inventário"
- Filters: search input · warehouse dropdown · product dropdown (client-side).
- Table columns: Produto · SKU · Armazém · Quantidade · Última Atualização · Ação ("Ajustar" button per row).
- "Ajustar" → opens `AjustarInventarioModal` pre-filled with produto + armazém (read-only display fields) + current quantity. Input: "Nova quantidade" (absolute value, not delta). Submit → `PUT /api/inventory`. On `422 NEGATIVE_QUANTITY`, show inline field error. On success: close + toast "Inventário atualizado" + invalidate `inventory` query.

## Operator view (`InventarioOperator`)

- Title: "Inventário disponível"
- Info banner: "Visualização apenas. Para ajustes contacte o administrador."
- CTA button top-right: "+ Criar Reserva" → navigates to `/reservas` (or opens Nova Reserva modal if extracted to shared in task 06).
- Table columns: Produto · SKU · Armazém · Disponível (quantity) · Estoque (status badge: Normal ≥ 50 · Atenção 10–49 · Crítico < 10).
- No action column.

## Decisions

- Two separate components (`InventarioAdmin`, `InventarioOperator`) — the columns, title, CTA, and presence of actions are structurally different enough that a single component with conditionals would obscure intent.
- Stock status thresholds (Normal/Atenção/Crítico) are frontend-computed from `quantity` — no threshold field from API. Thresholds: Crítico < 10, Atenção 10–49, Normal ≥ 50.
- `PUT /api/inventory` takes absolute quantity, not an increment. The modal must make this clear in the UI (label "Nova quantidade", shows current quantity alongside for reference).
- Inventory record must already exist to be adjustable — no "create inventory" flow since the API has no POST endpoint for inventory.
