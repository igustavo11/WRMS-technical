# Task 08 — Mobile Layout Fixes

Cross-feature task: align the mobile views of Products, Reservations, and Inventory with the Figma mobile designs.

**Figma nodes analyzed:**
- `1:2707` — Produtos (Mobile · Admin)
- `1:2363` — Criar Reserva (Mobile)
- `1:2968` — Inventário (Mobile · Operator)
- `1:2856` — Reservas (Mobile · Admin)

---

## 1. BottomNavBar — Operator items

### Current state
`operatorNavItems` has 3 items: Dashboard, Inventário, Reservas.

### Figma (`1:2968`)
Operator bottom nav has 5 items: Dashboard, Produtos, Inventário, Armazéns, Reservas.

### Fix
Add Produtos and Armazéns to `operatorNavItems` in `app/shared/components/BottomNavBar.tsx`.

```tsx
const operatorNavItems: NavItem[] = [
  { to: '/',            label: 'Dashboard', icon: '/icons/dashboard.svg',   iconSize: { w: 18, h: 18 } },
  { to: '/products',    label: 'Produtos',  icon: '/icons/products.svg',    iconSize: { w: 20, h: 20 } },
  { to: '/inventory',   label: 'Inventário',icon: '/icons/inventory.svg',   iconSize: { w: 18, h: 18 } },
  { to: '/warehouses',  label: 'Armazéns',  icon: '/icons/warehouses.svg',  iconSize: { w: 20, h: 18 } },
  { to: '/reservations',label: 'Reservas',  icon: '/icons/reservations.svg',iconSize: { w: 18, h: 20 } },
];
```

---

## 2. Products — Mobile layout

**File:** `app/features/products/pages/ProductsPage.tsx`

### 2a. Responsive padding

**Current:** `p-6 gap-6`  
**Figma:** `px-[16px] pt-[8px]` on mobile, standard `p-4 md:p-[32px]` pattern on desktop.

**Fix:** Replace outer `<div className="flex flex-col h-full p-6 gap-6">` with:
```tsx
<div className="flex flex-col h-full p-4 md:p-[32px] gap-4 md:gap-[32px]">
```

### 2b. Header — responsive stacking

**Current:** `flex items-center justify-between` (side-by-side at all sizes).  
**Figma:** On mobile the `h1` and the button stay side-by-side but the title color changes to `text-[#4ce4c3]` in the mobile TopBar context. For the page header, keep side-by-side layout.  
No change needed here beyond the padding fix above.

### 2c. Mobile product card list (MISSING)

**Current:** `ProductsTable` renders at all viewport sizes.  
**Figma:** On mobile, products appear as tappable cards:

```
bg-[#161616] border border-[#2a2a2a] rounded-[10px] p-[17px]
flex items-center justify-between
  Left column:
    SKU: text-[#606060] text-[11px] tracking-[0.88px] uppercase
    Name: text-[#f0f0f0] text-[14px] font-semibold
    Description: text-[#a0a0a0] text-[12px] truncated (w-[200px] overflow-clip)
  Right column (items-end gap-[8px]):
    Status badge
    Chevron icon (>)
```

**Status badges:**
- `ATIVO` → `bg-[rgba(28,200,168,0.15)] border-[rgba(28,200,168,0.3)] text-[#1cc8a8]`
- `EM FALTA` → `bg-[rgba(239,159,39,0.15)] border-[rgba(239,159,39,0.3)] text-[#ef9f27]`
- `INATIVO` → `bg-[rgba(226,75,74,0.15)] border-[rgba(226,75,74,0.3)] text-[#e24b4a]`

**Decision — "EM FALTA" status:** The API returns `isActive: boolean` — there is no dedicated "em falta" status on the product. "EM FALTA" would require cross-referencing inventory data (total stock = 0 for an active product). For now, map `isActive: false` → INATIVO, `isActive: true` → ATIVO. If inventory is also fetched, a future enhancement can add the EM FALTA state.

**Fix:** Wrap `ProductsTable` in `hidden md:block`, add `md:hidden` mobile card list before it:

```tsx
{/* Mobile card list */}
<div className="md:hidden flex flex-col gap-[8px]">
  {filtered.length === 0 ? (
    <p className="text-[#a0a0a0] text-sm text-center py-8">Nenhum produto encontrado.</p>
  ) : (
    filtered.map((product) => (
      <button
        key={product.id}
        type="button"
        onClick={() => handleEdit(product)}
        className="bg-[#161616] border border-[#2a2a2a] rounded-[10px] p-[17px] flex items-center justify-between w-full text-left"
      >
        <div className="flex flex-col min-w-0 pr-[16px] flex-1">
          <span className="text-[#606060] text-[11px] tracking-[0.88px] uppercase leading-[11px] pb-[4px]">
            {product.sku}
          </span>
          <span className="text-[#f0f0f0] text-[14px] font-semibold leading-[21px] pb-[2px]">
            {product.name}
          </span>
          <span className="text-[#a0a0a0] text-[12px] truncate w-[200px]">
            {product.description}
          </span>
        </div>
        <div className="flex flex-col items-end gap-[8px] shrink-0">
          <ProductStatusBadge isActive={product.isActive} />
          <ChevronRight size={12} className="text-[#606060]" />
        </div>
      </button>
    ))
  )}
</div>

{/* Desktop table */}
<div className="hidden md:block">
  <ProductsTable products={filtered} isLoading={isLoading} onEdit={handleEdit} />
</div>
```

**New helper component** `ProductStatusBadge` (colocate in `ProductsPage.tsx` or extract):
```tsx
function ProductStatusBadge({ isActive }: { isActive: boolean }) {
  const styles = isActive
    ? { bg: 'bg-[rgba(28,200,168,0.15)]', border: 'border-[rgba(28,200,168,0.3)]', text: 'text-[#1cc8a8]', label: 'ATIVO' }
    : { bg: 'bg-[rgba(226,75,74,0.15)]',  border: 'border-[rgba(226,75,74,0.3)]',  text: 'text-[#e24b4a]', label: 'INATIVO' };
  return (
    <span className={`${styles.bg} border ${styles.border} ${styles.text} text-[11px] tracking-[0.88px] px-[9px] py-[5px] rounded-[6px]`}>
      {styles.label}
    </span>
  );
}
```

### 2d. Edit form — bottom sheet on mobile (MISSING)

**Current:** `NewProductModal` is a Radix `Dialog` (centered overlay at all screen sizes).  
**Figma (`1:2707`):** On mobile, the edit form slides up from the bottom as a **bottom sheet**:
- Handle bar at top: `w-[48px] h-[4px] bg-[#2a2a2a] rounded-full mx-auto my-[12px]`
- Background: `bg-[#1e1e1e]` with `rounded-t-[20px]`
- Overlay scrim: `bg-[rgba(19,19,19,0.8)] backdrop-blur-[2px]`
- Form fields: NOME DO PRODUTO, SKU (disabled), STATUS (select), DESCRIÇÃO (textarea)
- Footer: "Cancelar" + "Salvar Alterações" side-by-side full-width buttons

**Fix options (choose one):**
1. **Preferred — conditional render:** On mobile render a bottom sheet, on desktop keep the Dialog. Use a `useIsMobile()` hook keyed to the `md` (768px) breakpoint to swap between the two.
2. **Simpler — Dialog sheet variant:** Use shadcn `Sheet` from bottom on all sizes (no conditional). Less pixel-perfect but simpler.

**Recommended: option 1** — keep `Dialog` for desktop, add `Sheet` (side=bottom) for mobile.

New file: `app/features/products/components/ProductEditBottomSheet.tsx`

```tsx
// Wraps the same form fields as NewProductModal but renders as Sheet on mobile.
// Open on mobile when editingProduct is set.
// Props: open, onClose, editProduct (Product | undefined)
```

The `ProductsPage` decides which to render:
```tsx
// In ProductsPage return:
{isMobile ? (
  <ProductEditBottomSheet open={modalOpen} onClose={handleClose} editProduct={editingProduct} />
) : (
  <NewProductModal open={modalOpen} onClose={handleClose} editProduct={editingProduct} />
)}
```

`useIsMobile` hook (if not already present in `app/shared/hooks/useIsMobile.ts`):
```ts
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}
```

---

## 3. Reservations — Mobile layout

**File:** `app/features/reservations/pages/ReservationsPage.tsx`

### 3a. Responsive padding

**Current:** `p-6 gap-6`  
**Fix:** `p-4 md:p-[32px] gap-4 md:gap-[32px]`

### 3b. Filter chips — mobile (MISSING)

**Current:** Select dropdowns and date inputs in a `flex-wrap` row.  
**Figma (`1:2856`):** On mobile, status filter uses horizontal-scroll pill buttons:

```
px-[16px] py-[16px] bg-[#131313] border-b border-[#2a2a2a]
  <div className="flex gap-[8px] overflow-x-auto pb-[2px]">
    {['all','Pending','Confirmed','Cancelled'].map(status => (
      <button
        key={status}
        onClick={() => setStatusFilter(status)}
        className={cn(
          'px-[17px] py-[7px] rounded-[9999px] text-[14px] whitespace-nowrap',
          statusFilter === status
            ? 'bg-[rgba(28,200,168,0.12)] border border-[#4ce4c3] text-[#4ce4c3]'
            : 'bg-[#1e1e1e] border border-[#2a2a2a] text-[#a0a0a0]'
        )}
      >
        {labels[status]}
      </button>
    ))}
  </div>
```

The desktop filters (Select dropdowns, date range, clear button) stay hidden on mobile:
```tsx
<div className="md:hidden ...">  {/* filter chips */} </div>
<div className="hidden md:flex items-center gap-4 flex-wrap"> {/* current filters */} </div>
```

### 3c. Mobile reservation card list (MISSING)

**Current:** `ReservationsTable` renders at all sizes.  
**Figma (`1:2856`):** On mobile, reservations are cards:

```
bg-[#1e1e1e] border border-[#2a2a2a] rounded-[8px] p-[17px] flex flex-col gap-[8px]

Row 1 (justify-between):
  Product name: text-[#f0f0f0] text-[16px] font-semibold
  Status badge (CONFIRMED/PENDING/CANCELLED)

Row 2 (flex-col gap-[4px]):
  Building icon + warehouse name (text-[#a0a0a0] text-[12px])
  Box icon + "Qtd: X unidades" (text-[#a0a0a0] text-[12px])
  Calendar icon + date (text-[#a0a0a0] text-[12px])
```

**Status badge colors:**
- CONFIRMED → `bg-[rgba(28,200,168,0.15)] border-[rgba(28,200,168,0.3)] text-[#1cc8a8]`
- PENDING → `bg-[rgba(239,159,39,0.15)] border-[rgba(239,159,39,0.3)] text-[#ef9f27]`
- CANCELLED → `bg-[rgba(226,75,74,0.15)] border-[rgba(226,75,74,0.3)] text-[#e24b4a]`

**Fix:** Wrap `ReservationsTable` in `hidden md:block`, add `md:hidden` card list before it.

New component: `app/features/reservations/components/ReservationCard.tsx`

### 3d. FAB button for "Nova Reserva" on mobile (MISSING)

**Figma (`1:2856`):** Floating action button, fixed position:
```
fixed bottom-[80px] right-[15px] z-10
bg-[#1cc8a8] rounded-[9999px] size-[56px]
shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]
```

On mobile, the "Nova Reserva" header button should be hidden, replaced by the FAB:
```tsx
{/* Mobile FAB */}
<button
  type="button"
  onClick={() => setModalOpen(true)}
  className="md:hidden fixed bottom-[80px] right-[15px] z-10 bg-[#1cc8a8] rounded-full size-[56px] flex items-center justify-center shadow-lg"
>
  <Plus size={20} className="text-[#004e40]" />
</button>
```

The header button becomes `hidden md:block` (or `hidden md:flex`).

### 3e. Swipe-to-cancel (DEFERRED)

**Figma (`1:2856`):** Shows a swipe-left gesture revealing a red "CANCELAR" action for PENDING items.

**Decision:** Out of scope for this task. Complex touch interaction (`@use-gesture/react` or similar), adds dependency, and cancellation is already available in the desktop table. Can be added later as a UX enhancement.

---

## 4. "Nova Reserva" — Mobile creation flow

**File:** `app/features/reservations/components/NewReservationModal.tsx`

### Current state
`NewReservationModal` is a Radix `Dialog` (center overlay) at all screen sizes. The quantity field is a plain `<Input type="number">`.

### Figma (`1:2363`)
On mobile the creation flow is a **full-screen page** (or bottom sheet that fills the screen):
- Header: back arrow (←) + centered "Nova Reserva" title
- Scrollable form body: PRODUTO select, ARMAZÉM select, availability info card, QUANTIDADE stepper
- Sticky footer: "Criar Reserva" primary button + "Cancelar" text button

**Key differences vs current modal:**
1. Layout fills the screen on mobile (not a floating dialog)
2. Quantity input is a stepper (`-` button | value | `+` button), not a plain text input
3. Availability info card: shows "Disponível / X unidades" in a card with a teal circular icon
4. Error state: label turns red (`text-[#e24b4a]`), stepper border turns red (`border-[#e24b4a]`)
5. "Criar Reserva" button is disabled (opacity-50) when quantity > available stock

**Fix:** Use the same `useIsMobile()` approach as Products:
- On desktop: keep current `Dialog` implementation
- On mobile: render a new `NewReservationSheet` as a `Sheet` with `side="bottom"` styled to fill the screen, or use conditional full-screen overlay

New file: `app/features/reservations/components/NewReservationSheet.tsx`

**Quantity stepper component** (shared between modal and sheet):
```tsx
// app/features/reservations/components/QuantityStepper.tsx
type Props = {
  value: number;
  onChange: (v: number) => void;
  hasError: boolean;
};
// Renders: [-] [value] [+] in a single row with border-[#2a2a2a] dividers
// Error state: border-[#e24b4a], value in text-[#e24b4a]
```

**Availability info card:**
```tsx
// Rendered when both productId and warehouseId are selected
<div className="bg-[#161616] border border-[#2a2a2a] rounded-[8px] p-[17px] flex gap-[12px] items-center">
  <div className="bg-[rgba(28,200,168,0.12)] border border-[rgba(28,200,168,0.3)] rounded-full size-[32px] flex items-center justify-center shrink-0">
    <Package size={12} className="text-[#1cc8a8]" />
  </div>
  <div className="flex flex-col">
    <span className="text-[#a0a0a0] text-[12px]">Disponível</span>
    <span className="text-[#f0f0f0] text-[14px] font-bold">{availableStock} unidades</span>
  </div>
</div>
```

---

## 5. InventoryOperator — Mobile card tweaks

**File:** `app/features/inventory/components/InventoryOperator.tsx`

Mobile card list is already implemented. These are visual gaps vs Figma (`1:2968`):

### 5a. Card padding
**Current:** `p-[17px]`  
**Figma:** `p-[13px]`

### 5b. Quantity display
**Current:** `text-[14px] font-bold` with inline color based on quantity  
**Figma:** Quantity is large (`text-[20px] font-bold`) right-aligned with a label below it:
```tsx
<div className="flex flex-col items-end">
  <span className={`text-[20px] font-bold leading-[30px] ${status === 'Crítico' ? 'text-[#e24b4a]' : 'text-[#4ce4c3]'}`}>
    {row.quantity.toLocaleString('pt-BR')}
  </span>
  <span className="text-[#a0a0a0] text-[12px]">Unidades</span>
</div>
```

Note: the unit label ("Unidades", "Rolos", etc.) comes from the API inventory response. Check if `GET /inventory` returns a `unit` field; if not, default to "Unidades".

### 5c. Status badge — text-only (no dot)
**Current:** Dot + text (`<div className={`size-[6px] rounded-full …`} /> {status}`)  
**Figma:** Text-only badge, no dot — just `NORMAL` / `CRÍTICO` uppercase labels

**Fix:** Remove the dot span from the mobile card badge. Desktop table badge can keep the dot.

### 5d. FAB for "Criar Reserva" on mobile (MISSING)
**Figma (`1:2968`):** Fixed FAB at `bottom-[80px] right-[16px]`:
```tsx
<Link
  to="/reservations/new"
  className="md:hidden fixed bottom-[80px] right-[16px] z-10 bg-[#1cc8a8] rounded-full size-[56px] flex items-center justify-center shadow-lg"
>
  <Plus size={16} className="text-[#004e40]" />
</Link>
```

The existing `Link to="/reservations"` button in the header should become `hidden md:flex`.

---

## Files to create or modify

| File | Action |
|------|--------|
| `app/shared/components/BottomNavBar.tsx` | Modify — add Produtos + Armazéns to `operatorNavItems` |
| `app/shared/hooks/useIsMobile.ts` | Create — 768px breakpoint hook |
| `app/features/products/pages/ProductsPage.tsx` | Modify — responsive padding, mobile card list, conditional modal/sheet |
| `app/features/products/components/ProductEditBottomSheet.tsx` | Create — mobile bottom sheet for edit/create |
| `app/features/reservations/pages/ReservationsPage.tsx` | Modify — responsive padding, filter chips, mobile card list, FAB |
| `app/features/reservations/components/ReservationCard.tsx` | Create — mobile card component |
| `app/features/reservations/components/NewReservationSheet.tsx` | Create — mobile full-screen creation form |
| `app/features/reservations/components/QuantityStepper.tsx` | Create — stepper input with error state |
| `app/features/inventory/components/InventoryOperator.tsx` | Modify — card padding, quantity display, badge, FAB |

---

## Decisions

1. **"EM FALTA" product status** — Not mapped for now. API only returns `isActive: boolean`. Card shows ATIVO/INATIVO only. Adding inventory-based "EM FALTA" requires joining product + inventory data and is a separate enhancement.

2. **Swipe-to-cancel on Reservations** — Deferred. Requires touch gesture library; cancellation already exists on desktop. Can be added later.

3. **Nova Reserva as page vs sheet** — Figma shows a full-page navigation flow. Implementation uses a full-height `Sheet` (side=bottom, h-full) instead of creating a new route, to keep state management simple and avoid adding a new route to `routes.ts`.

4. **useIsMobile hook** — Added to `app/shared/hooks/`. SSR is not a concern (this is a pure SPA with no SSR). Initial value reads `window.innerWidth` directly.

5. **Unit label in InventoryOperator** — If the API does not return a `unit` field, default to "Unidades" for all items. Do not block this fix waiting for API change.
