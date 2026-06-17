# Task: Implement Inventory (Admin + Operator)

## Project Context

- **Stack:** React SPA + React Router v7 (SPA mode, no SSR) + TanStack Query + Axios + React Hook Form + Zod + shadcn/ui + Tailwind CSS v4
- **Working directory:** `/home/gustavo/www/wrms/frontend`
- **API base:** `http://localhost:3333/api`
- **Path alias:** `~/*` → `./app/*`
- **Linting:** Biome (tabs, single quotes). Run `bun run lint` before committing.
- **Typecheck:** `bun run typecheck`

### Mandatory conventions

- Always TypeScript. Use `type` (not `interface`). Named exports (no default, except page components required by React Router).
- No obvious comments. No `console.log`. No `any`.
- Do not refactor existing code outside this task's scope.

---

## What already exists (don't touch)

```
app/
├── features/
│   ├── auth/
│   │   ├── context/AuthContext.tsx   — exposes { token, user: AuthUser | null, login, logout }
│   │   ├── hooks/useAuth.ts          — useContext(AuthContext)
│   │   └── ...
│   └── dashboard/                    — implemented, serves as pattern reference
├── shared/
│   ├── api/client.ts                 — Axios instance with interceptors
│   └── components/ProtectedLayout.tsx — Sidebar + TopBar + <Outlet />
├── components/ui/                    — shadcn/ui (button, skeleton, dialog, etc.)
└── routes.ts
```

### `AuthUser` type (from `app/shared/api/authToken.ts`):
```ts
type AuthUser = { sub: string; email: string; role: 'Admin' | 'Operator' }
```

### `ProtectedLayout` structure:
```tsx
<div className="flex h-screen bg-[#131313] overflow-hidden">
  <Sidebar />
  <div className="flex flex-col flex-1 min-w-0 md:ml-[220px]">
    <TopBar />
    <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
      <Outlet />  {/* child route content goes here */}
    </main>
  </div>
  <BottomNavBar />
</div>
```

Inventory components **don't** need to render Sidebar/TopBar — only the `<main>` content.

### Current `routes.ts` (relevant excerpt):
```ts
layout('shared/components/ProtectedLayout.tsx', [
  index('features/dashboard/pages/DashboardPage.tsx'),
  layout('shared/components/AdminLayout.tsx', [
    route('products', 'routes/placeholder.tsx', { id: 'products' }),
    route('warehouses', 'routes/placeholder.tsx', { id: 'warehouses' }),
  ]),
  route('inventory', 'routes/placeholder.tsx', { id: 'inventory' }),   // ← replace
  route('reservations', 'routes/placeholder.tsx', { id: 'reservations' }),
  route('settings', 'routes/placeholder.tsx', { id: 'settings' }),
]),
```

`inventory` does **not** use `AdminLayout` — it sits directly under `ProtectedLayout`.

### Reference pattern (DashboardPage):
```ts
export default function DashboardPage() {
  const { user } = useAuth();
  if (user?.role === 'Admin') return <DashboardAdmin />;
  return <DashboardOperator />;
}
```

---

## API endpoints used

### `GET /api/inventory` — both roles
```ts
// Response: array of
{
  id: string;          // uuid
  productId: string;   // uuid
  warehouseId: string; // uuid
  quantity: number;
  updatedAt: string;   // ISO 8601
}
```

### `GET /api/products` — both roles (to resolve names and SKU)
```ts
// Response: array of
{
  id: string;
  sku: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### `GET /api/warehouses` — both roles (to resolve names)
```ts
// Response: array of
{
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### `PUT /api/inventory` — Admin only
```ts
// Body:
{ productId: string; warehouseId: string; quantity: number }
// Response 200: Updated InventoryRecord
// Error 404: productId×warehouseId pair doesn't exist
// Error 422: { error: 'NEGATIVE_QUANTITY', ... }
```

> `quantity` is **absolute** (not delta). Sending 50 sets stock to 50.

---

## Figma Design

### Admin View (node `1:1606`) — Figma capture

**Main screen:**
- Main background: `bg-[#0c0c0c]` (content area), padding `p-[32px]`
- Page header: flex justify-between items-end
  - Title "Inventário": `text-[#f0f0f0] text-[30px] font-bold leading-[36px]`
  - Filters area (right): flex gap-[12px] items-center
    - SKU search input: `bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[41px] pr-[17px] py-[11px] w-[256px] text-[#f0f0f0] text-[16px] placeholder:text-[#606060]` + search icon positioned `left-[12px]`
    - Select "Todos Armazéns": `bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[17px] pr-[33px] py-[9px] text-[#f0f0f0] text-[16px]`
    - Select "Todos Produtos": same styles

**Table:**
- Container: `bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full`
- Header row: `bg-[#1c1b1b] border-b border-[#2a2a2a]`
- Header columns: `text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px]`
  - PRODUTO (text-left) | SKU (text-left) | ARMAZÉM (text-left) | QUANTIDADE (text-right) | ÚLTIMA ATUALIZAÇÃO (text-right) | AÇÃO (text-center)
- Data rows: `border-t border-[#2a2a2a]`
  - PRODUTO: `text-[#f0f0f0] text-[14px] px-[24px] py-[21px]`
  - SKU: `text-[#a0a0a0] text-[12px] px-[24px]`
  - ARMAZÉM: `text-[#f0f0f0] text-[14px] px-[24px]`
  - QUANTIDADE: `px-[24px] text-right text-[14px]`
    - Normal (≥ 10): `text-[#f0f0f0] font-medium`
    - Critical (< 10): `text-[#e24b4a] font-bold`
  - ÚLTIMA ATUALIZAÇÃO: `text-[#a0a0a0] text-[12px] px-[24px] text-right` — format "24 Out, 10:30"
  - AÇÃO: `px-[24px] text-center`
    - "Ajustar" button: `border border-[#2a2a2a] text-[#4ce4c3] rounded-[4px] px-[13px] py-[7px] text-[12px] font-medium bg-transparent hover:bg-[rgba(76,228,195,0.08)]`

**"Ajustar Inventário" Modal:**
- Overlay: `fixed inset-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-[1px] flex items-center justify-center z-50`
- Container: `bg-[#1e1e1e] border border-[#3a3a3a] rounded-[8px] w-[440px] p-[20px] flex flex-col`
- Modal header: `flex justify-between items-center pb-[17px] border-b border-[#2a2a2a] mb-[20px]`
  - Title: `text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]`
  - X button: closes modal — lucide-react `X` icon, `text-[#a0a0a0] hover:text-[#f0f0f0]`
- Read-only fields (flex-col gap-[11px]):
  - Label: `text-[#a0a0a0] text-[12px] leading-[16.8px] mb-[4px]`
  - Value: `bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#f0f0f0] text-[14px]`
  - "Produto" field: shows `{productName} ({productSku})`
  - "Armazém" field: shows `{warehouseName}`
- Quantity adjustment area: `flex gap-[24px] items-start pt-[24px]`
  - Left box "Qtd. Atual": `bg-[#161616] border border-[#2a2a2a] rounded-[8px] w-[132px] p-[17px] flex flex-col items-center gap-[4px]`
    - Label: `text-[#a0a0a0] text-[12px]`
    - Value: `text-[30px] font-bold leading-[36px]`
      - If quantity < 10: `text-[#e24b4a]`
      - Otherwise: `text-[#f0f0f0]`
  - Input side (flex-1): `flex flex-col gap-[4px]`
    - Label "Nova quantidade": `text-[#f0f0f0] text-[12px] leading-[16.8px]`
    - Input: `bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] px-[17px] py-[11px] text-[#f0f0f0] text-[14px] w-full` — `border-[#e24b4a]` when error
    - Inline error: `text-[#e24b4a] text-[12px] flex items-center gap-[4px]` with `<AlertTriangle size={11} />` from lucide-react + "Quantidade não pode ser negativa"
- Footer: `flex justify-end gap-[12px] pt-[17px] border-t border-[#2a2a2a] mt-[16px]`
  - "Cancelar" button: `bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] px-[17px] py-[9px] text-[#f0f0f0] text-[14px] font-medium`
  - "Salvar Ajuste" button: `bg-[#1cc8a8] text-[#004e40] rounded-[10px] px-[16px] py-[9px] text-[14px] font-medium` — disabled + opacity-70 when mutation is pending

---

### Operator View (node `1:2002`) — Figma capture

**Main screen:** padding `p-[32px]`, flex flex-col gap-[24px]

**Page header:**
- `flex items-end justify-between pb-[8px]`
- Title "Inventário disponível": `text-[#f0f0f0] text-[30px] font-bold leading-[36px]`
- "+ Criar Reserva" button (Link to `/reservations`):
  - `bg-[#1cc8a8] text-[#0a3d34] rounded-[10px] px-[24px] py-[12px] flex items-center gap-[8px] text-[14px] font-semibold`
  - `+` icon (use `<Plus size={14} />` from lucide-react)

**Info banner:**
- `bg-[rgba(55,138,221,0.1)] border border-[rgba(55,138,221,0.3)] rounded-[8px] p-[17px] flex gap-[12px] items-start`
- Icon: `<Info size={20} className="text-[#378add] shrink-0 mt-[1px]" />`
- Text: `text-[#f0f0f0] text-[14px] leading-[21px]` — "Visualização apenas. Para ajustes contacte o administrador."

**Table:**
- Container: `bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full`
- Header row: `bg-[#1e1e1e] border-b border-[#2a2a2a]`
- Header columns: `text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px]`
  - PRODUTO (text-left) | SKU (text-left) | ARMAZÉM (text-left) | DISPONÍVEL (text-right) | STATUS ESTOQUE (text-left)
- Data rows: `border-t border-[#2a2a2a]`
  - PRODUTO: `text-[#f0f0f0] text-[14px] px-[16px] py-[13px]`
  - SKU: `text-[#a0a0a0] text-[14px] px-[16px]`
  - ARMAZÉM: `text-[#f0f0f0] text-[14px] px-[16px]`
  - DISPONÍVEL: `text-[#f0f0f0] text-[14px] font-medium px-[16px] text-right` — `{quantity.toLocaleString('pt-BR')}`
  - STATUS ESTOQUE: `px-[16px] py-[12.5px]`
    - Badge: `inline-flex items-center gap-[8px] h-[22.8px] rounded-[6px] px-[8px] border text-[12px]`

**Status badges (client-side thresholds based on `quantity`):**

| Status | Threshold | Container bg | Border | Dot color | Text color |
|--------|-----------|--------------|--------|-----------|------------|
| Normal | ≥ 50 | `bg-[rgba(28,200,168,0.15)]` | `border-[rgba(28,200,168,0.3)]` | `bg-[#4ce4c3]` | `text-[#4ce4c3]` |
| Atenção | 10–49 | `bg-[rgba(239,159,39,0.15)]` | `border-[rgba(239,159,39,0.3)]` | `bg-[#ef9f27]` | `text-[#ef9f27]` |
| Crítico | < 10 | `bg-[rgba(226,75,74,0.15)]` | `border-[rgba(226,75,74,0.3)]` | `bg-[#e24b4a]` | `text-[#e24b4a]` |

- Dot: `size-[6px] rounded-full shrink-0`
- Label text: `text-[12px] leading-[16.8px]`

---

## Files to create

### Folder structure

```
app/features/inventory/
├── pages/InventarioPage.tsx
├── components/
│   ├── InventarioAdmin.tsx
│   ├── InventarioOperator.tsx
│   └── AjustarInventarioModal.tsx
├── hooks/useInventory.ts
└── services/inventoryApi.ts
```

---

### `app/features/inventory/services/inventoryApi.ts`

```ts
import { apiClient } from '~/shared/api/client';

export type InventoryRecord = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  updatedAt: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Warehouse = {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdjustInventoryPayload = {
  productId: string;
  warehouseId: string;
  quantity: number;
};

export async function getInventory(): Promise<InventoryRecord[]> {
  const { data } = await apiClient.get<InventoryRecord[]>('/inventory');
  return data;
}

export async function getProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>('/products');
  return data;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const { data } = await apiClient.get<Warehouse[]>('/warehouses');
  return data;
}

export async function adjustInventory(
  payload: AdjustInventoryPayload,
): Promise<InventoryRecord> {
  const { data } = await apiClient.put<InventoryRecord>('/inventory', payload);
  return data;
}
```

---

### `app/features/inventory/hooks/useInventory.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  adjustInventory,
  getInventory,
  getProducts,
  getWarehouses,
  type AdjustInventoryPayload,
} from '../services/inventoryApi';

export function useInventory() {
  return useQuery({ queryKey: ['inventory'], queryFn: getInventory });
}

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: getProducts });
}

export function useWarehouses() {
  return useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
}

export function useAdjustInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustInventoryPayload) => adjustInventory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventário atualizado.');
    },
    onError: () => {
      toast.error('Não foi possível ajustar o inventário.');
    },
  });
}
```

---

### `app/features/inventory/components/AjustarInventarioModal.tsx`

This component is used only by Admin.

**Props:**
```ts
type ModalItem = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  productName: string;
  productSku: string;
  warehouseName: string;
};

type Props = {
  item: ModalItem;
  onClose: () => void;
};
```

**Zod Schema:**
```ts
const schema = z.object({
  quantity: z
    .number({ invalid_type_error: 'Quantidade inválida' })
    .int('Deve ser número inteiro')
    .min(0, 'Quantidade não pode ser negativa'),
});
type FormValues = z.infer<typeof schema>;
```

**Submit logic:**
- Call `mutation.mutate(payload)` with local `onError` override to catch `NEGATIVE_QUANTITY`:
```ts
mutation.mutate(
  { productId: item.productId, warehouseId: item.warehouseId, quantity: values.quantity },
  {
    onSuccess: () => onClose(),
    onError: (err) => {
      const code = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (code === 'NEGATIVE_QUANTITY') {
        form.setError('quantity', { message: 'Quantidade não pode ser negativa' });
      }
      // generic error toast already triggered in the hook
    },
  },
);
```

**Complete JSX structure:**

```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-[rgba(0,0,0,0.8)] backdrop-blur-[1px] flex items-center justify-center z-50" role="dialog" aria-modal="true">
  {/* Modal container */}
  <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-[8px] w-[440px] p-[20px] flex flex-col" role="document">

    {/* Header */}
    <div className="flex justify-between items-center pb-[17px] border-b border-[#2a2a2a] mb-[20px]">
      <h2 className="text-[#f0f0f0] text-[24px] font-semibold leading-[31.2px]">
        Ajustar Inventário
      </h2>
      <button type="button" onClick={onClose} className="text-[#a0a0a0] hover:text-[#f0f0f0]">
        <X size={14} />
      </button>
    </div>

    {/* Form */}
    <form onSubmit={...} className="flex flex-col gap-[11px]">

      {/* Read-only: Product */}
      <div className="flex flex-col gap-[4px]">
        <label className="text-[#a0a0a0] text-[12px] leading-[16.8px]">Produto</label>
        <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#f0f0f0] text-[14px]">
          {item.productName} ({item.productSku})
        </div>
      </div>

      {/* Read-only: Warehouse */}
      <div className="flex flex-col gap-[4px]">
        <label className="text-[#a0a0a0] text-[12px] leading-[16.8px]">Armazém</label>
        <div className="bg-[#1c1b1b] border border-[#2a2a2a] rounded-[10px] opacity-70 px-[13px] py-[9px] text-[#f0f0f0] text-[14px]">
          {item.warehouseName}
        </div>
      </div>

      {/* Quantity area */}
      <div className="flex gap-[24px] items-start pt-[24px]">

        {/* Current Qty */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] w-[132px] p-[17px] flex flex-col items-center gap-[4px] shrink-0">
          <span className="text-[#a0a0a0] text-[12px]">Qtd. Atual</span>
          <span className={`text-[30px] font-bold leading-[36px] ${item.quantity < 10 ? 'text-[#e24b4a]' : 'text-[#f0f0f0]'}`}>
            {item.quantity}
          </span>
        </div>

        {/* New quantity */}
        <div className="flex flex-col gap-[4px] flex-1">
          <label className="text-[#f0f0f0] text-[12px] leading-[16.8px]">Nova quantidade</label>
          <input
            type="number"
            min={0}
            {...register('quantity', { valueAsNumber: true })}
            className={`bg-[#1e1e1e] border rounded-[10px] px-[17px] py-[11px] text-[#f0f0f0] text-[14px] w-full outline-none focus:border-[#4ce4c3] ${errors.quantity ? 'border-[#e24b4a]' : 'border-[#2a2a2a]'}`}
          />
          {errors.quantity && (
            <span className="text-[#e24b4a] text-[12px] flex items-center gap-[4px]">
              <AlertTriangle size={11} />
              {errors.quantity.message}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-[12px] pt-[17px] border-t border-[#2a2a2a] mt-[16px]">
        <button
          type="button"
          onClick={onClose}
          className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] px-[17px] py-[9px] text-[#f0f0f0] text-[14px] font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-[#1cc8a8] text-[#004e40] rounded-[10px] px-[16px] py-[9px] text-[14px] font-medium disabled:opacity-70"
        >
          Salvar Ajuste
        </button>
      </div>

    </form>
  </div>
</div>
```

Import `X` and `AlertTriangle` from `lucide-react`.

---

### `app/features/inventory/components/InventarioAdmin.tsx`

**Enriched type:**
```ts
type EnrichedItem = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  updatedAt: string;
  productName: string;
  productSku: string;
  warehouseName: string;
};
```

**Date formatting:**
```ts
function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(new Date(iso))
    .replace('.', '');
}
```

**Data join (useMemo):**
```ts
const enrichedRows = useMemo((): EnrichedItem[] => {
  if (!inventory || !products || !warehouses) return [];
  const productMap = new Map(products.map((p) => [p.id, p]));
  const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));
  return inventory.map((item) => ({
    ...item,
    productName: productMap.get(item.productId)?.name ?? '—',
    productSku: productMap.get(item.productId)?.sku ?? '—',
    warehouseName: warehouseMap.get(item.warehouseId)?.name ?? '—',
  }));
}, [inventory, products, warehouses]);
```

**Client-side filters (useState):**
```ts
const [skuSearch, setSkuSearch] = useState('');
const [warehouseFilter, setWarehouseFilter] = useState('all');
const [productFilter, setProductFilter] = useState('all');

const filteredRows = useMemo(() => {
  return enrichedRows.filter((row) => {
    const matchesSku = row.productSku
      .toLowerCase()
      .includes(skuSearch.toLowerCase());
    const matchesWarehouse =
      warehouseFilter === 'all' || row.warehouseId === warehouseFilter;
    const matchesProduct =
      productFilter === 'all' || row.productId === productFilter;
    return matchesSku && matchesWarehouse && matchesProduct;
  });
}, [enrichedRows, skuSearch, warehouseFilter, productFilter]);
```

**Loading state:** if `isLoading` (any of the 3 queries), show Skeleton — 1 44px block for the header + table with 4 skeleton rows. Use `<Skeleton className="..." />` from `~/components/ui/skeleton` like the `DashboardAdmin` pattern.

**Error state:** if any query has `isError`, show "Não foi possível carregar o inventário." message + "Tentar novamente" button that calls `refetchAll()` (calls `refetch()` on all 3 queries).

**Table empty state:** when `filteredRows.length === 0` and not loading, show `<td colSpan={6}>` with "Nenhum item encontrado."

**Modal state:**
```ts
const [selectedItem, setSelectedItem] = useState<EnrichedItem | null>(null);
```

**JSX structure:**
```tsx
<div className="p-[32px] flex flex-col gap-[32px]">

  {/* Page header + filters */}
  <div className="flex items-end justify-between">
    <h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">Inventário</h1>
    <div className="flex gap-[12px] items-center">

      {/* Search input with icon */}
      <div className="relative">
        <Search size={13} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#606060]" />
        <input
          placeholder="Buscar SKU..."
          value={skuSearch}
          onChange={(e) => setSkuSearch(e.target.value)}
          className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[41px] pr-[17px] py-[11px] w-[256px] text-[#f0f0f0] text-[16px] placeholder:text-[#606060] outline-none focus:border-[#4ce4c3]"
        />
      </div>

      {/* Warehouse select */}
      <select
        value={warehouseFilter}
        onChange={(e) => setWarehouseFilter(e.target.value)}
        className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-[10px] pl-[17px] pr-[33px] py-[9px] text-[#f0f0f0] text-[16px] outline-none appearance-none cursor-pointer"
      >
        <option value="all">Todos Armazéns</option>
        {warehouses?.map((w) => (
          <option key={w.id} value={w.id}>{w.name}</option>
        ))}
      </select>

      {/* Product select (same styles) */}
      <select ...>
        <option value="all">Todos Produtos</option>
        {products?.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  </div>

  {/* Table */}
  <div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#1c1b1b] border-b border-[#2a2a2a]">
          <th className="text-[#a0a0a0] text-[11px] font-medium tracking-[0.55px] uppercase px-[24px] py-[16px] text-left">PRODUTO</th>
          <th ...>SKU</th>
          <th ...>ARMAZÉM</th>
          <th className="... text-right">QUANTIDADE</th>
          <th className="... text-right">ÚLTIMA ATUALIZAÇÃO</th>
          <th className="... text-center">AÇÃO</th>
        </tr>
      </thead>
      <tbody>
        {filteredRows.map((row) => (
          <tr key={row.id} className="border-t border-[#2a2a2a]">
            <td className="px-[24px] py-[21px] text-[#f0f0f0] text-[14px]">{row.productName}</td>
            <td className="px-[24px] py-[21px] text-[#a0a0a0] text-[12px]">{row.productSku}</td>
            <td className="px-[24px] py-[21px] text-[#f0f0f0] text-[14px]">{row.warehouseName}</td>
            <td className={`px-[24px] py-[21px] text-right text-[14px] ${row.quantity < 10 ? 'text-[#e24b4a] font-bold' : 'text-[#f0f0f0] font-medium'}`}>
              {row.quantity.toLocaleString('pt-BR')}
            </td>
            <td className="px-[24px] py-[21px] text-[#a0a0a0] text-[12px] text-right whitespace-nowrap">
              {formatUpdatedAt(row.updatedAt)}
            </td>
            <td className="px-[24px] py-[16px] text-center">
              <button
                onClick={() => setSelectedItem(row)}
                className="border border-[#2a2a2a] text-[#4ce4c3] rounded-[4px] px-[13px] py-[7px] text-[12px] font-medium bg-transparent hover:bg-[rgba(76,228,195,0.08)] transition-colors"
              >
                Ajustar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* Modal */}
  {selectedItem && (
    <AjustarInventarioModal
      item={selectedItem}
      onClose={() => setSelectedItem(null)}
    />
  )}
</div>
```

Import `Search` from `lucide-react`.

---

### `app/features/inventory/components/InventarioOperator.tsx`

**Enriched type:**
```ts
type EnrichedItem = {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  productName: string;
  productSku: string;
  warehouseName: string;
};
```

**Status function:**
```ts
type StockStatus = 'Normal' | 'Atenção' | 'Crítico';

function getStockStatus(qty: number): StockStatus {
  if (qty < 10) return 'Crítico';
  if (qty < 50) return 'Atenção';
  return 'Normal';
}

const STOCK_BADGE: Record<
  StockStatus,
  { bg: string; border: string; dot: string; text: string }
> = {
  Normal: {
    bg: 'bg-[rgba(28,200,168,0.15)]',
    border: 'border-[rgba(28,200,168,0.3)]',
    dot: 'bg-[#4ce4c3]',
    text: 'text-[#4ce4c3]',
  },
  Atenção: {
    bg: 'bg-[rgba(239,159,39,0.15)]',
    border: 'border-[rgba(239,159,39,0.3)]',
    dot: 'bg-[#ef9f27]',
    text: 'text-[#ef9f27]',
  },
  Crítico: {
    bg: 'bg-[rgba(226,75,74,0.15)]',
    border: 'border-[rgba(226,75,74,0.3)]',
    dot: 'bg-[#e24b4a]',
    text: 'text-[#e24b4a]',
  },
};
```

**Data join (useMemo):** same pattern as Admin, no filters.

**Loading/Error states:** same pattern as Admin.

**JSX structure:**
```tsx
<div className="p-[32px] flex flex-col gap-[24px]">

  {/* Page header */}
  <div className="flex items-end justify-between pb-[8px]">
    <h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
      Inventário disponível
    </h1>
    <Link
      to="/reservations"
      className="bg-[#1cc8a8] text-[#0a3d34] rounded-[10px] px-[24px] py-[12px] flex items-center gap-[8px] text-[14px] font-semibold"
    >
      <Plus size={14} />
      Criar Reserva
    </Link>
  </div>

  {/* Info banner */}
  <div className="bg-[rgba(55,138,221,0.1)] border border-[rgba(55,138,221,0.3)] rounded-[8px] p-[17px] flex gap-[12px] items-start">
    <Info size={20} className="text-[#378add] shrink-0 mt-[1px]" />
    <span className="text-[#f0f0f0] text-[14px] leading-[21px]">
      Visualização apenas. Para ajustes contacte o administrador.
    </span>
  </div>

  {/* Table */}
  <div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] overflow-hidden w-full">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-[#1e1e1e] border-b border-[#2a2a2a]">
          <th className="text-[#a0a0a0] text-[11px] font-medium tracking-[1.1px] uppercase px-[16px] py-[12px] text-left">PRODUTO</th>
          <th ...>SKU</th>
          <th ...>ARMAZÉM</th>
          <th className="... text-right">DISPONÍVEL</th>
          <th ...>STATUS ESTOQUE</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const status = getStockStatus(row.quantity);
          const badge = STOCK_BADGE[status];
          return (
            <tr key={row.id} className="border-t border-[#2a2a2a]">
              <td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px]">{row.productName}</td>
              <td className="px-[16px] py-[13px] text-[#a0a0a0] text-[14px]">{row.productSku}</td>
              <td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px]">{row.warehouseName}</td>
              <td className="px-[16px] py-[13px] text-[#f0f0f0] text-[14px] font-medium text-right">
                {row.quantity.toLocaleString('pt-BR')}
              </td>
              <td className="px-[16px] py-[12.5px]">
                <div className={`inline-flex items-center gap-[8px] h-[22.8px] rounded-[6px] px-[8px] border ${badge.bg} ${badge.border}`}>
                  <div className={`size-[6px] rounded-full shrink-0 ${badge.dot}`} />
                  <span className={`text-[12px] leading-[16.8px] ${badge.text}`}>{status}</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>
```

Import `Plus` and `Info` from `lucide-react`. Import `Link` from `react-router`.

---

### `app/features/inventory/pages/InventarioPage.tsx`

```ts
import { useAuth } from '~/features/auth/hooks/useAuth';
import { InventarioAdmin } from '../components/InventarioAdmin';
import { InventarioOperator } from '../components/InventarioOperator';

export default function InventarioPage() {
  const { user } = useAuth();

  if (user?.role === 'Admin') return <InventarioAdmin />;
  return <InventarioOperator />;
}
```

---

## File to modify

### `app/routes.ts`

Replace only the inventory line:

```diff
- route('inventory', 'routes/placeholder.tsx', { id: 'inventory' }),
+ route('inventory', 'features/inventory/pages/InventarioPage.tsx'),
```

The rest of the file should not be changed.

---

## Final verification

After implementing, run:

```bash
bun run typecheck   # no type errors
bun run lint        # no lint errors (--write for auto-fix)
```

Manual testing:
1. Login as `admin@wtec.com` / `123456` → navigate to `/inventory` → see table with filters → click "Ajustar" → modal opens with correct data → save → success toast + modal closes
2. Login as `operator@wtec.com` / `123456` → navigate to `/inventory` → see read-only table with status badges + info banner → "Criar Reserva" button goes to `/reservations`
