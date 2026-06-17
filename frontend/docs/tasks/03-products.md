# Produtos

**Goal:** Products page — Admin-only. Paginated list with SKU/name search + "apenas ativos" toggle, create modal with SKU generator, and inline status badge. No edit form (no Figma screen for it).

**Figma references:** `node-id=1-1435` (list + modal overlay visible in same frame — the modal overlays the list)

**Access:** Admin only — route wrapped in `AdminLayout` (already exists from task 02).

---

## Architecture

```
features/products/
├── pages/ProdutosPage.tsx
├── components/ProductsTable.tsx
├── components/NovoProdutoModal.tsx
├── hooks/useProducts.ts
├── hooks/useCreateProduct.ts
├── schemas/productSchema.ts
└── services/productsApi.ts
```

No utils file needed — SKU generator is a one-liner (`crypto.randomUUID()`) called inline.

---

## Routing

Add to `app/routes.ts` inside the existing `AdminLayout` layout block:

```ts
route('products', 'features/products/pages/ProdutosPage.tsx'),
```

Add sidebar link in the `AdminLayout` sidebar (already rendered, just needs the link active for "Produtos").

---

## API — exact contract

### `GET /api/products`

**Auth:** Admin | Operator  
**Response 200:**

```json
[
  {
    "id": "uuid",
    "sku": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Parafuso Sextavado M8",
    "description": "Parafuso de aço inox M8 x 30mm",
    "isActive": true,
    "createdAt": "2026-06-16T10:00:00.000Z",
    "updatedAt": "2026-06-16T10:00:00.000Z"
  }
]
```

Error responses: 401 → interceptor redirects to `/login`. 403 → not applicable (Admin-only page).

### `POST /api/products`

**Auth:** Admin only  
**Body:**

```json
{
  "sku": "string (required, non-empty)",
  "name": "string (required, non-empty)",
  "description": "string (optional)",
  "isActive": true
}
```

**Success 201:** Product created — close modal + show toast "Produto criado com sucesso."  
**Error 409 (`DUPLICATE_SKU`):** Show inline field error on SKU field: "SKU já cadastrado no sistema."  
**Error 400 (`VALIDATION_ERROR`):** Show generic toast error.

---

## `productsApi.ts`

```ts
import { apiClient } from '~/shared/api/client';

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateProductDto = {
  sku: string;
  name: string;
  description?: string;
  isActive?: boolean;
};

export const getProducts = (): Promise<Product[]> =>
  apiClient.get('/products').then((r) => r.data);

export const createProduct = (dto: CreateProductDto): Promise<Product> =>
  apiClient.post('/products', dto).then((r) => r.data);
```

---

## `productSchema.ts`

```ts
import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1, 'SKU é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
```

---

## `useProducts.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../services/productsApi';

export const useProducts = () =>
  useQuery({ queryKey: ['products'], queryFn: getProducts });
```

---

## `useCreateProduct.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProduct } from '../services/productsApi';

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });
};
```

---

## `ProdutosPage.tsx`

State:
- `search: string` — controlled input for SKU/name filter
- `onlyActive: boolean` — toggle state, default `false`
- `modalOpen: boolean` — controls `NovoProdutoModal`

Filtering (client-side, derived from `data`):

```ts
const filtered = (data ?? []).filter((p) => {
  if (onlyActive && !p.isActive) return false;
  if (search) {
    const q = search.toLowerCase();
    return p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
  }
  return true;
});
```

Layout (matches Figma exactly):

```
<page>
  <header>
    <h1>Produtos</h1>
    <Button onClick={() => setModalOpen(true)}>+ Novo Produto</Button>
  </header>

  <filters-bar>
    <search-input placeholder="Buscar por SKU ou Nome..." />
    <toggle label="Apenas ativos" />
  </filters-bar>

  <ProductsTable products={filtered} isLoading={isLoading} />

  <NovoProdutoModal open={modalOpen} onClose={() => setModalOpen(false)} />
</page>
```

---

## `ProductsTable.tsx`

Table columns (exact order from Figma — NO "Data de Criação" column):

| Column    | Width       | Notes                              |
|-----------|-------------|-------------------------------------|
| SKU       | `w-[137px]` | `font-medium text-[#f0f0f0]`        |
| NOME      | `w-[297px]` | `font-normal text-[#f0f0f0]`        |
| DESCRIÇÃO | `flex-1`    | `text-[#a0a0a0] truncate`           |
| STATUS    | `w-[102px]` | Badge (see below)                   |
| AÇÕES     | `w-[86px] text-right` | Edit icon, no-op (no edit modal) |

**Loading state:** render a skeleton (3 rows with `animate-pulse` gray bars).

**Empty state:** render a centered "Nenhum produto encontrado." text in `text-[#a0a0a0]`.

### Status badge

Active (`isActive: true`):
```
bg-[rgba(28,200,168,0.15)] border border-[rgba(28,200,168,0.3)] text-[#1cc8a8]
rounded-[6px] px-[9px] py-[5px] text-[12px]
```
Text: "Ativo"

Inactive (`isActive: false`):
```
bg-[#1e1e1e] border border-[#2a2a2a] text-[#a0a0a0]
rounded-[6px] px-[9px] py-[5px] text-[12px]
```
Text: "Inativo"

**Inactive rows:** apply `opacity-60` to the entire row `<tr>` when `isActive === false`.

### AÇÕES column

Render a `<button>` with a `Pencil` icon from `lucide-react` (size 15px). Since there is no edit modal, the button renders but has no `onClick` handler (it's non-functional, matching the Figma design). Add `disabled` or `title="Em breve"` so it's visually clear.

---

## `NovoProdutoModal.tsx`

Uses React Hook Form + Zod (`createProductSchema`). Uses the shadcn `Dialog` component.

### Form fields (exact order from Figma)

**1. SKU** (required)

- Label: `SKU *` (asterisk in `text-[#e24b4a]`)
- Input with a right-side action button: a `RotateCw` icon from `lucide-react` (16px) that on click calls `setValue('sku', crypto.randomUUID())`.
- Normal state: `bg-[#1e1e1e] border border-[#2a2a2a]`
- Error state (409 or RHF validation): `border border-[#e24b4a]` + `AlertCircle` icon (16px, `text-[#e24b4a]`) positioned absolute right-[12px] inside the input wrapper. Error message below: `text-[#e24b4a] text-[12px]`.
- The RotateCw (generator) icon and AlertCircle (error) icon share the right-side slot — show only one at a time: generator when no error, error icon when there is an error.

**2. Nome do Produto** (required)

- Label: `Nome do Produto *`
- Placeholder: `Ex: Transformador 500kVA`
- Error state: red border + RHF error message.

**3. Descrição** (optional)

- Label: `Descrição`
- `<textarea>` — use `<Textarea>` from shadcn. Height ~90px.
- Placeholder: `Detalhes técnicos do produto...`

**4. Produto Ativo** toggle

- Separator line above (`border-t border-[#2a2a2a]`).
- Left side: label "Produto Ativo" (`text-[#f0f0f0] text-[14px]`) + subtitle "Disponível para reservas e inventário" (`text-[#a0a0a0] text-[12px]`).
- Right side: shadcn `Switch` component. Default `checked={true}` (controlled by RHF `isActive`).
- Active (on): `bg-[rgba(28,200,168,0.3)] border border-[#1cc8a8]` thumb `bg-[#1cc8a8]`.

### Footer buttons

- "Cancelar" — `bg-[#1e1e1e] border border-[#2a2a2a] text-[#f0f0f0]` — calls `onClose()` and resets form.
- "Criar Produto" — `bg-[#1cc8a8] text-[#0a3d34]` — `disabled` / `opacity-50` when form is invalid OR when mutation is `isPending`.

### Submit logic

```ts
const onSubmit = async (values: CreateProductFormValues) => {
  try {
    await mutateAsync({
      sku: values.sku,
      name: values.name,
      description: values.description || undefined,
      isActive: values.isActive,
    });
    toast.success('Produto criado com sucesso.');
    onClose();
    reset();
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 409) {
      setError('sku', { message: 'SKU já cadastrado no sistema.' });
    } else {
      toast.error('Erro ao criar produto. Tente novamente.');
    }
  }
};
```

`onClose` should also call `reset()` to clear form state when modal is dismissed.

---

## Toast

Use the existing toast system already in the project (check `app/shared/` or `app/app.css` for the `<Toaster>` setup — it should already be wired up from the inventory feature).

---

## Theming tokens (do not change these)

```
background:        #131313
card/surface:      #161616
input bg:          #1e1e1e
border:            #2a2a2a
primary:           #1cc8a8
primary-dark:      #0a3d34
primary-light:     #4ce4c3
text-primary:      #f0f0f0
text-secondary:    #a0a0a0
text-muted:        #606060
text-sidebar-link: #bbcac4
error:             #e24b4a
```

---

## Tests — `tests/products.test.tsx`

Follow the same pattern as `tests/inventory.test.tsx` (mock hooks with `vi.mock`, wrap with `QueryClientProvider + AuthProvider + MemoryRouter`).

### Mock

```ts
vi.mock('~/features/products/hooks/useProducts', () => ({
  useProducts: vi.fn(),
}));
vi.mock('~/features/products/hooks/useCreateProduct', () => ({
  useCreateProduct: vi.fn(),
}));
```

### Test cases

1. **renders loading skeleton** — `useProducts` returns `{ data: undefined, isLoading: true }` → expect skeleton elements.
2. **renders product rows** — `useProducts` returns 2 products (1 active, 1 inactive) → both SKUs visible in table.
3. **inactive row has opacity-60** — the row for the inactive product should have class `opacity-60`.
4. **"Apenas ativos" toggle filters inactive** — toggle the switch → inactive product disappears.
5. **search by SKU filters list** — type partial SKU → only matching row visible.
6. **search by name filters list** — type partial name → only matching row visible.
7. **"Novo Produto" button opens modal** — click → `dialog` with "Novo Produto" heading appears.
8. **SKU generator fills input** — open modal → click the RotateCw icon → SKU input has a UUID-format value.
9. **form validation — required fields** — submit empty form → error messages for SKU and Nome appear.
10. **successful creation** — fill SKU + Nome → submit → mutation called with correct payload → modal closes → toast shown.
11. **409 error shows SKU field error** — mutation rejects with 409 → "SKU já cadastrado no sistema." visible.
12. **Cancelar resets form and closes** — fill form → click Cancelar → modal closes → reopen → fields are empty.

---

## Decisions

- No edit modal — `PUT /api/products/:id` exists in API but has no Figma screen. AÇÕES pencil icon renders but is non-functional.
- No "Data de Criação" column — not in Figma design.
- Client-side search and active filter — no query params on `GET /api/products`.
- SKU generator uses `crypto.randomUUID()` — available in all modern browsers, no dependency needed.
- `isActive` defaults to `true` on the RHF schema default values.
