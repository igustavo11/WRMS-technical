# Produtos

**Goal:** Products page — Admin-only. Paginated list with SKU/name search, create modal, and inline status badge (active/inactive). No edit form in this version (update via `PUT` is in the API but not designed in the Figma).

**Figma references:** `node-id=1-1435` (list), `node-id=1-1563` (Nova Produto modal)

**Access:** Admin only — route wrapped in `AdminLayout` (introduced in task 02).

---

## Architecture

`ProdutosPage` → TanStack Query `useProducts` hook → `GET /api/products`. Create action: `useCreateProduct` mutation → `POST /api/products` → invalidates `products` query on success.

**Folder layout:**
```
features/products/
├── pages/ProdutosPage.tsx
├── components/ProductsTable.tsx
├── components/NovoProdutoModal.tsx
├── hooks/useProducts.ts
├── hooks/useCreateProduct.ts
├── schemas/productSchema.ts          # Zod: { sku, name, description?, isActive? }
└── services/productsApi.ts
```

## UI

- Page header: title "Produtos" + "Novo Produto" button (top right) → opens `NovoProdutoModal`.
- Search input: client-side filter on SKU or name (no API query param — filter the fetched list).
- Table columns: SKU · Nome · Descrição · Status (badge Ativo/Inativo) · Data de Criação.
- `NovoProdutoModal`: fields Nome (required) · SKU (required) · Descrição (optional) · Status toggle (default: Ativo). Submit → `POST /api/products`. On `409` from API, show "SKU já existe" field error. On success, close modal + toast "Produto criado".

## Decisions

- No edit modal for now — `PUT /api/products/:id` exists in the API but has no corresponding Figma screen. Omitted to avoid building unspecified UI.
- Client-side search — no pagination endpoint in the API; filter the full list in memory.
- `isActive` field sent on create defaults to `true`; controlled by a toggle in the modal matching the Figma.
