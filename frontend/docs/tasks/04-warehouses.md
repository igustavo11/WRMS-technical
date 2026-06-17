# Warehouses

**Goal:** Warehouses page — Admin-only. 3-column card grid showing each warehouse with its metrics, plus a "New Warehouse" modal to create new ones. No edit capability (no `PUT` endpoint exists).

**Figma references:** `node-id=1-2150` (card grid), `node-id=1-2318` (New Warehouse modal)

**Access:** Admin only — route wrapped in `AdminLayout` (already exists).

---

## Architecture

```
features/warehouses/
├── pages/WarehousesPage.tsx
├── components/WarehouseCard.tsx
├── components/NewWarehouseModal.tsx
├── hooks/useWarehouses.ts
├── hooks/useCreateWarehouse.ts
├── schemas/warehouseSchema.ts
└── services/warehousesApi.ts
```

---

## Routing

Add to `app/routes.ts` inside the existing `AdminLayout` layout block (replace the placeholder):

```ts
route('warehouses', 'features/warehouses/pages/WarehousesPage.tsx'),
```

---

## API — exact contract

### `GET /api/warehouses` — Admin | Operator

**Response 200:**

```json
[
  {
    "id": "uuid",
    "name": "Armazém Central",
    "location": "São Paulo, SP",
    "isActive": true,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

| Status | Meaning               |
|--------|-----------------------|
| 200    | Warehouse list        |
| 401    | Missing/invalid token |
| 403    | Role lacks permission |

### `POST /api/warehouses` — Admin only

**Body:**

```json
{
  "name": "Armazém Sul",
  "location": "Curitiba, PR",
  "isActive": true
}
```

**Success 201:** Warehouse created → close modal + toast `'Armazém criado com sucesso.'`
**Error 400 (`VALIDATION_ERROR`):** Show generic toast error.

| Field      | Type      | Required | Notes           |
|------------|-----------|----------|-----------------|
| `name`     | `string`  | yes      |                 |
| `location` | `string`  | yes      |                 |
| `isActive` | `boolean` | no       | Default: `true` |

| Status | Meaning               |
|--------|-----------------------|
| 201    | Warehouse created     |
| 400    | Invalid data          |
| 401    | Missing/invalid token |
| 403    | Role lacks permission |

### `GET /api/dashboard` — warehouseMetrics field

Per-card metrics come from the existing dashboard endpoint (already fetched by `useDashboard`). The relevant field:

```json
{
  "warehouseMetrics": [
    {
      "warehouseName": "Armazém Central",
      "location": "São Paulo, SP",
      "totalProducts": 5,
      "totalQuantity": 150,
      "activeReservations": 2
    }
  ]
}
```

---

## Data merging

`WarehousesPage` calls both `useWarehouses()` and `useDashboard()`. Metrics are merged client-side by warehouse name:

```ts
type WarehouseWithMetrics = Warehouse & {
  totalProducts: number;
  totalQuantity: number;
  activeReservations: number;
};

const warehousesWithMetrics: WarehouseWithMetrics[] = (warehouses ?? []).map((w) => {
  const m = dashboardData?.warehouseMetrics.find((wm) => wm.warehouseName === w.name);
  return {
    ...w,
    totalProducts: m?.totalProducts ?? 0,
    totalQuantity: m?.totalQuantity ?? 0,
    activeReservations: m?.activeReservations ?? 0,
  };
});
```

If a warehouse has no match in `warehouseMetrics` (e.g. newly created), metrics render as `0`.

---

## `warehousesApi.ts`

```ts
import { apiClient } from '~/shared/api/client';

export type Warehouse = {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateWarehouseDto = {
  name: string;
  location: string;
  isActive?: boolean;
};

export const getWarehouses = (): Promise<Warehouse[]> =>
  apiClient.get('/warehouses').then((r) => r.data);

export const createWarehouse = (dto: CreateWarehouseDto): Promise<Warehouse> =>
  apiClient.post('/warehouses', dto).then((r) => r.data);
```

---

## `warehouseSchema.ts`

```ts
import { z } from 'zod';

export const createWarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required'),
  location: z.string().min(1, 'Location is required'),
  isActive: z.boolean().default(true),
});

export type CreateWarehouseFormValues = z.infer<typeof createWarehouseSchema>;
```

---

## `useWarehouses.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { getWarehouses } from '../services/warehousesApi';

export const useWarehouses = () =>
  useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });
```

> Uses the same `['warehouses']` query key as `features/inventory/hooks/useInventory.ts`. Invalidating this key from `useCreateWarehouse` updates both consumers.

---

## `useCreateWarehouse.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createWarehouse } from '../services/warehousesApi';

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWarehouse,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['warehouses'] }),
  });
};
```

---

## `WarehousesPage.tsx`

State:
- `modalOpen: boolean` — controls `NewWarehouseModal`

Data:
- `useWarehouses()` — warehouse list
- `useDashboard()` — for `warehouseMetrics`
- Merged into `WarehouseWithMetrics[]` client-side (see Data merging section)

### Responsive pattern

Follows the same convention as `InventoryAdmin` / `InventoryOperator`:

| Token | Mobile | Desktop (`md:`) |
|-------|--------|-----------------|
| Padding | `p-4` | `md:p-[32px]` |
| Gap | `gap-4` | `md:gap-[32px]` |
| Header direction | `flex-col` | `md:flex-row md:items-end md:justify-between` |
| Header gap | `gap-3` | `md:gap-0` |
| "Novo Armazém" button | `w-full` | `md:w-auto` |
| Card grid | `grid-cols-1` | `md:grid-cols-2 lg:grid-cols-3` |

Since this page uses cards on both breakpoints (not a table), there is **no separate mobile/desktop layout**. A single `WarehouseCard` component is rendered at all sizes — the grid column count is what changes.

### Layout skeleton (pseudo-JSX)

```
<div className="p-4 md:p-[32px] flex flex-col gap-4 md:gap-[32px]">

  {/* Page header */}
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-0">
    <div className="flex flex-col gap-1">
      <h1 className="text-[#f0f0f0] text-[30px] font-bold leading-[36px]">
        Armazéns
      </h1>
      <p className="text-[#a0a0a0] text-[14px]">
        Gerencie as localidades de estocagem e hubs logísticos.
      </p>
    </div>
    <Button
      onClick={() => setModalOpen(true)}
      className="w-full md:w-auto bg-[#1cc8a8] text-[#004e40] hover:bg-[#4ce4c3]
                 h-[40px] px-6 rounded-[10px] text-[14px] font-semibold"
    >
      + Novo Armazém
    </Button>
  </div>

  {/* Loading */}
  {isLoading && <SkeletonGrid />}

  {/* Error */}
  {isError && (
    <div className="flex flex-col items-center justify-center gap-4 mt-16 text-center">
      <p className="text-[#a0a0a0] text-sm">Não foi possível carregar os armazéns.</p>
      <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
    </div>
  )}

  {/* Empty */}
  {!isLoading && !isError && warehousesWithMetrics.length === 0 && (
    <p className="text-[#a0a0a0] text-sm text-center py-16">
      Nenhum armazém cadastrado.
    </p>
  )}

  {/* Card grid — same card component on all breakpoints */}
  {!isLoading && !isError && warehousesWithMetrics.length > 0 && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {warehousesWithMetrics.map((w) => (
        <WarehouseCard key={w.id} warehouse={w} />
      ))}
    </div>
  )}

  <NewWarehouseModal open={modalOpen} onClose={() => setModalOpen(false)} />
</div>
```

---

## `WarehouseCard.tsx`

**Props:**

```ts
type WarehouseCardProps = {
  warehouse: WarehouseWithMetrics;
};
```

**Container (from Figma node 1:2179 active / 1:2241 inactive):**

```
bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[21px]
flex flex-col justify-between overflow-hidden relative
```

Inactive card: add `opacity-70` to the container.

**Section 1 — Card header (bottom border divides from metrics):**

```
<div className="flex items-start justify-between pb-4 border-b border-[#2a2a2a]">
  <div className="flex flex-col gap-1 min-w-0 mr-3">
    <span className="text-[#f0f0f0] text-[18px] leading-[27px] truncate">
      {warehouse.name}
    </span>
    <div className="flex items-center gap-[6px]">
      <MaskIcon src="/icons/location.svg" w={9} h={12} />
      <span className="text-[#a0a0a0] text-[12px] truncate">{warehouse.location}</span>
    </div>
  </div>
  <StatusBadge isActive={warehouse.isActive} />
</div>
```

**Status badge — active (`isActive: true`):**
```
bg-[rgba(28,200,168,0.12)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8]
rounded-[6px] px-[9px] py-[5px] text-[11px] tracking-[0.88px] uppercase whitespace-nowrap shrink-0
```
Text: `ATIVO`

**Status badge — inactive (`isActive: false`):**
```
bg-[#1e1e1e] border border-[#3a3a3a] text-[#a0a0a0]
rounded-[6px] px-[9px] py-[5px] text-[11px] tracking-[0.88px] uppercase whitespace-nowrap shrink-0
```
Text: `INATIVO`

**Section 2 — Metrics grid (from Figma: 2 columns, top padding, bottom padding before button):**

```
<div className="grid grid-cols-2 gap-4 pt-[17px] pb-[24px]">
  <div className="flex flex-col gap-1">
    <span className="text-[#a0a0a0] text-[12px]">Produtos Únicos</span>
    <span className="text-[#f0f0f0] text-[20px] leading-[30px]">
      {warehouse.totalProducts.toLocaleString('pt-BR')}
    </span>
  </div>
  <div className="flex flex-col gap-1">
    <span className="text-[#a0a0a0] text-[12px]">Total Unidades</span>
    <span className="text-[#f0f0f0] text-[20px] leading-[30px]">
      {warehouse.totalQuantity.toLocaleString('pt-BR')}
    </span>
  </div>
</div>
```

**Section 3 — "Ver inventário" button (full width, navigates to `/inventory`):**

Active card:
```
border border-[#1cc8a8] rounded-[10px] h-[40px] w-full
flex items-center justify-center gap-2
text-[#1cc8a8] text-[14px] font-medium
hover:bg-[rgba(28,200,168,0.08)] transition-colors
```

Inactive card:
```
border border-[#2a2a2a] rounded-[10px] h-[40px] w-full
flex items-center justify-center gap-2
text-[#a0a0a0] text-[14px] font-medium
```

Both use `useNavigate` from `react-router` and call `navigate('/inventory')` on click. Include an inventory icon (`MaskIcon` with `/icons/inventory.svg`, size 15px).

---

## `NewWarehouseModal.tsx`

Uses React Hook Form + Zod (`createWarehouseSchema`). Uses shadcn `Dialog`.

**Dialog content container:**
```
bg-[#1e1e1e] border border-[#3a3a3a] rounded-[12px] w-[500px] max-w-[500px]
shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)] p-0 overflow-hidden
```

**Header section:**
```
bg-[#161616] border-b border-[#2a2a2a] px-[20px] pt-[20px] pb-[21px]
flex items-center justify-between
```
- Title: `"Novo Armazém"` — `text-[#f0f0f0] text-[20px] font-normal`
- Close button: shadcn `DialogClose` or a plain `<button>` with an X icon (`X` from lucide-react, size 14px)

### Form fields (exact order from Figma)

**1. Nome do Armazém** (required)

- Label: `Nome do Armazém` + `*` in `text-[#e24b4a]` — `text-[12px] text-[#a0a0a0]`
- Input: `bg-[#161616] border border-[#2a2a2a] rounded-[10px] p-[13px] text-[14px] text-[#f0f0f0] w-full`
- Placeholder: `Ex: Hub Leste - RJ`
- Error state: `border-[#e24b4a]` + error message below in `text-[#e24b4a] text-[12px]`

**2. Localização Física** (required)

- Label: `Localização Física` + `*` in `text-[#e24b4a]` — `text-[12px] text-[#a0a0a0]`
- Input wrapper: `relative`
  - Location pin icon (`MaskIcon` with `/icons/location.svg`, w=12, h=15): `absolute left-[12px] top-1/2 -translate-y-1/2 text-[#606060]`
  - Input: same base styles but `pl-[41px] pr-[13px] py-[13px]`
- Placeholder: `Cidade, Estado`
- Error state: `border-[#e24b4a]` + error message below in `text-[#e24b4a] text-[12px]`

**3. Divider**

`<div className="border-t border-[#2a2a2a] my-[8px]" />`

**4. Status Inicial toggle**

```
<div className="flex items-center justify-between">
  <div className="flex flex-col gap-0.5">
    <span className="text-[#f0f0f0] text-[14px]">Status Inicial</span>
    <span className="text-[#a0a0a0] text-[12px]">
      Definir armazém como operacional imediatamente.
    </span>
  </div>
  <div className="flex items-center gap-3">
    <Switch
      checked={watch('isActive')}
      onCheckedChange={(v) => setValue('isActive', v)}
    />
    <span className="text-[#1cc8a8] text-[14px] font-medium">
      {watch('isActive') ? 'Ativo' : 'Inativo'}
    </span>
  </div>
</div>
```

### Footer

```
bg-[#161616] border-t border-[#2a2a2a] px-[20px] pt-[17px] pb-[16px]
flex gap-3 items-center justify-end
```

- **"Cancelar"**: `border border-[#2a2a2a] rounded-[10px] h-[40px] px-[21px] text-[#f0f0f0] text-[14px] font-medium bg-transparent` — calls `onClose()` + `reset()`
- **"Salvar Armazém"**: `bg-[#1cc8a8] rounded-[10px] h-[40px] px-6 text-[#004e40] text-[14px] font-semibold flex items-center gap-2` — disabled when form is invalid or `isPending`
  - Includes `Save` icon from lucide-react, size 14px

### Submit logic

```ts
const onSubmit = async (values: CreateWarehouseFormValues) => {
  try {
    await mutateAsync({
      name: values.name,
      location: values.location,
      isActive: values.isActive,
    });
    toast.success('Armazém criado com sucesso.');
    onClose();
    reset();
  } catch {
    toast.error('Erro ao criar armazém. Tente novamente.');
  }
};
```

`onClose` also calls `reset()` to clear form state when modal is dismissed without submitting.

---

## Skeleton

When `isLoading` is true, render a responsive grid of skeleton cards matching real card height. The grid uses the same breakpoints as the card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Render 3 skeleton cards (enough to fill the first row on desktop).

Each skeleton card:
```
bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[21px] flex flex-col gap-4
```

Internal structure:
- Header row: `flex justify-between` → `Skeleton h-[27px] w-40` + `Skeleton h-[22px] w-16 rounded-[6px]`
- Location: `Skeleton h-[16px] w-32`
- Divider area
- Metrics: `grid grid-cols-2 gap-4` → 2× `flex flex-col gap-1` with `Skeleton h-[16px] w-20` + `Skeleton h-[30px] w-16`
- Button: `Skeleton h-[40px] w-full rounded-[10px]`

Use `Skeleton` from `~/components/ui/skeleton`.

---

## Toast

Use the existing toast system (same as products/inventory features).

- Success: `'Armazém criado com sucesso.'`
- Error: `'Erro ao criar armazém. Tente novamente.'`

---

## Theming tokens (do not change these)

```
background:      #131313
card/surface:    #161616
input bg:        #161616
border:          #2a2a2a
border-modal:    #3a3a3a
primary:         #1cc8a8
primary-dark:    #004e40
primary-light:   #4ce4c3
text-primary:    #f0f0f0
text-secondary:  #a0a0a0
text-muted:      #606060
error:           #e24b4a
```

---

## Tests — `tests/warehouses.test.tsx`

Follow the same pattern as `tests/products.test.tsx` (mock hooks with `vi.mock`, wrap with `QueryClientProvider + AuthProvider + MemoryRouter`).

### Mocks

```ts
vi.mock('~/features/warehouses/hooks/useWarehouses', () => ({
  useWarehouses: vi.fn(),
}));
vi.mock('~/features/warehouses/hooks/useCreateWarehouse', () => ({
  useCreateWarehouse: vi.fn(),
}));
vi.mock('~/features/dashboard/hooks/useDashboard', () => ({
  useDashboard: vi.fn(),
}));
```

### Test cases

1. **renders loading skeletons** — `useWarehouses` returns `{ data: undefined, isLoading: true }` → skeleton elements visible, no card names in DOM.
2. **renders warehouse cards** — `useWarehouses` returns 2 warehouses (1 active, 1 inactive) → both names visible.
3. **inactive card has opacity-70** — card element for inactive warehouse has `opacity-70` class.
4. **active card shows ATIVO badge** — active card contains the text `"ATIVO"`.
5. **inactive card shows INATIVO badge** — inactive card contains the text `"INATIVO"`.
6. **metrics from dashboard are displayed** — `useDashboard` returns `warehouseMetrics` matching warehouse name → `totalProducts` and `totalQuantity` values visible inside the correct card.
7. **warehouse not in metrics shows zeros** — warehouse with no match in `warehouseMetrics` → card shows `"0"` for both metric values.
8. **empty state renders** — `useWarehouses` returns empty array → empty state message visible.
9. **"Novo Armazém" opens modal** — click button → dialog with heading `"Novo Armazém"` appears.
10. **form validation — required fields** — submit empty form → error messages for both name and location appear.
11. **successful creation** — fill name + location → submit → mutation called with correct payload → modal closes → success toast shown → `invalidateQueries` called with `['warehouses']`.
12. **Cancelar resets and closes** — fill form fields → click Cancelar → modal closes → reopen → fields are empty.
13. **"Ver inventário" navigates to /inventory** — click the button on a card → `mockNavigate` called with `'/inventory'`.

---

## Decisions

- No edit modal — `PUT /api/warehouses/:id` does not exist in the API contract.
- Metrics (`totalProducts`, `totalQuantity`, `activeReservations`) come from `GET /api/dashboard → warehouseMetrics`, merged by `warehouseName === warehouse.name`. Newly created warehouses not yet reflected in dashboard metrics render with `0`.
- Figma shows `"MANUTENÇÃO"` as the inactive badge label — mapped to `"INATIVO"` since the API only exposes `isActive: boolean`.
- `"Ver inventário"` navigates to `/inventory` without pre-filtering; the inventory page filter is state-driven, not URL-driven.
- Card grid is responsive: `grid-cols-1` mobile → `grid-cols-2` tablet (`md`) → `grid-cols-3` desktop (`lg`).
- `useWarehouses` in `features/warehouses/` uses the same `['warehouses']` query key as `features/inventory/hooks/useInventory.ts`, so `useCreateWarehouse` invalidation propagates to both consumers automatically.
- `activeReservations` from `warehouseMetrics` is available in the merged type but not displayed in the card (Figma only shows 2 stats). Kept in the type for potential future use.
