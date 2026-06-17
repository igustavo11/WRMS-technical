# WRMS — Frontend

> React SPA for the **Warehouse Reservation Management System** — an internal operations tool for managing products, warehouses, inventory, and reservations across a logistics network.

**Stack:** React 19 · React Router v7 · TypeScript · TanStack Query v5 · Tailwind CSS v4 · Vitest

---

## Table of Contents

1. [Overview](#overview)
2. [Stack & Why](#stack--why)
3. [Architecture](#architecture)
   - [Feature-Slice Layout](#feature-slice-layout)
   - [Route Structure](#route-structure)
   - [Auth Flow](#auth-flow)
   - [Role-Based UI Dispatch](#role-based-ui-dispatch)
   - [Responsive Design Strategy](#responsive-design-strategy)
   - [Server State with TanStack Query](#server-state-with-tanstack-query)
   - [Form Handling](#form-handling)
   - [Design System & Theme](#design-system--theme)
4. [Pages & Features](#pages--features)
5. [Testing](#testing)
6. [Setup & Running](#setup--running)
7. [Environment Variables](#environment-variables)
8. [Scripts](#scripts)
9. [AI Tooling Disclosure](#ai-tooling-disclosure)
10. [Assumptions & Trade-offs](#assumptions--trade-offs)
11. [Future Improvements](#future-improvements)

---

## Overview

WRMS Frontend is a **single-page application** (no SSR) that consumes the Fastify REST API in `../backend`. It supports two distinct user roles with completely different UI surfaces:

- **Admin** — manages products, warehouses, inventory levels, and has full visibility across all data
- **Operator** — views inventory, creates reservations, and cancels pending ones

The app uses React Router v7 in SPA mode for client-side routing with a route configuration that enforces role-based access at the layout level.

---

## Stack & Why

| Technology | Version | Why |
|---|---|---|
| **React** | 19 | Latest stable; concurrent features enable smooth UX during async transitions |
| **React Router** | v7 (SPA mode) | File-based route config with `layout()`/`route()` helpers; zero SSR overhead — this is an internal tool where SEO is irrelevant |
| **TypeScript** | 5.9 | End-to-end type safety; Zod schemas infer types, eliminating duplicate type declarations |
| **TanStack Query** | v5 | Server-state cache with background refetch and mutation invalidation; eliminates manual `isLoading`/`error`/`data` state per component |
| **React Hook Form** | v7 | Zero re-renders on keystrokes (uncontrolled inputs); schema-driven via `zodResolver` |
| **Zod** | v4 | Schema-first validation — define once, get both runtime validation and inferred TypeScript types |
| **Axios** | v1 | Interceptor pattern for auth header injection and global 401 handling; cleaner than `fetch` for this use case |
| **shadcn/ui** (custom) | v4 | Owned components (copy-paste into `app/components/ui/`) — no design-system lock-in, full Tailwind v4 token control, smaller bundle. Chosen over MUI/Ant Design specifically because the copy-paste model allows **pixel-perfect alignment with the custom Figma design** — every token is set to exact Figma hex values, which would fight against MUI's opinionated defaults |
| **Tailwind CSS** | v4 | CSS-first config; `@theme inline` maps design tokens directly to CSS custom properties |
| **Biome** | v2 | Single tool for lint + format — replaces ESLint + Prettier with faster Rust-based execution |
| **Vitest + RTL** | v4 + v16 | Vite-native test runner with jsdom; React Testing Library ensures tests reflect user behavior, not implementation details |
| **Bun** | 1.x | Fast installs and script execution; drop-in Node.js replacement |

---

## Architecture

### Feature-Slice Layout

Each feature is a self-contained slice under `app/features/`. All concerns for a feature — UI, data fetching, validation, API calls — live together. Deleting a feature means deleting one folder.

```
app/
├── features/
│   └── <feature>/
│       ├── components/   # Presentational — no data fetching, only props
│       ├── hooks/        # useQuery / useMutation wrappers
│       ├── pages/        # Route entry points — compose hooks + components
│       ├── schemas/      # Zod schemas (validation + inferred types)
│       └── services/     # Pure functions wrapping Axios calls
├── shared/
│   ├── api/
│   │   ├── authToken.ts  # localStorage session helpers
│   │   └── client.ts     # Axios instance with interceptors
│   ├── components/       # Layout shells: Sidebar, BottomNavBar, ProtectedLayout, AdminLayout
│   └── hooks/
│       └── useIsMobile.ts
└── components/
    └── ui/               # shadcn/ui owned components (badge, button, card, dialog, etc.)
```

**Features implemented:** `auth`, `dashboard`, `products`, `warehouses`, `inventory`, `reservations`

### Route Structure

`app/routes.ts` uses React Router v7's `layout()` and `route()` helpers. Route guards are implemented as layout components — the page file never needs to know about role checks.

```
/login                 → LoginPage              [public]

/ (ProtectedLayout)    ← redirects to /login if no session
├── /                  → DashboardPage          [Admin + Operator]
├── (AdminLayout)      ← redirects to / if not Admin
│   ├── /products      → ProductsPage           [Admin only]
│   └── /warehouses    → WarehousesPage         [Admin only]
├── /inventory         → InventoryPage          [Admin + Operator]
└── /reservations      → ReservationsPage       [Admin + Operator]
```

Two nested layouts create the access control tree:
- **`ProtectedLayout`** — checks for a session token; redirects unauthenticated users to `/login`
- **`AdminLayout`** — checks `user.role === 'Admin'`; redirects Operators to `/` (dashboard)

### Auth Flow

Authentication state is managed by the **Context API** (explicitly required by the assessment spec) and persisted in `localStorage`.

```
POST /auth/login
     ↓
useLogin (useMutation)
     ↓
AuthContext.login(token, user)   ← stores in React state
     ↓
authToken.setSession({ token, user })   ← persists to localStorage as wrms_session
```

**Why `{ token, user }` stored together:** The API has no `/me` endpoint. The user payload from the login response is the only source of role/identity information, so it is stored alongside the token and loaded back on page refresh via `useState(() => getSession())`.

**Axios interceptors** (`app/shared/api/client.ts`):
- **Request** — reads `getToken()` from localStorage and attaches `Authorization: Bearer <token>`
- **Response** — on 401, calls `clearSession()` and hard-redirects to `/login` via `window.location.href` (handles token expiry transparently)

**Files involved:**

| File | Responsibility |
|---|---|
| `shared/api/authToken.ts` | `getSession()`, `setSession()`, `clearSession()`, `getToken()` — localStorage helpers |
| `shared/api/client.ts` | Axios instance + request/response interceptors |
| `features/auth/context/AuthContext.tsx` | `AuthProvider` + `useAuth()` hook |
| `features/auth/hooks/useLogin.ts` | `useMutation` wrapping `loginRequest`; calls `login()` on success |
| `shared/components/ProtectedLayout.tsx` | Route guard — reads `token`, redirects if absent |

### Role-Based UI Dispatch

Routes accessible to both roles render different components depending on `user.role`. Two patterns are used:

**Pattern 1 — Page-level dispatch** (Dashboard, Inventory):

```tsx
// DashboardPage.tsx
const { user } = useAuth();
if (user?.role === 'Admin') return <DashboardAdmin />;
return <DashboardOperator />;
```

Each role gets a fully isolated component — no conditional rendering scattered inside a single monolithic component. `DashboardAdmin` shows aggregate metrics + low stock alerts + recent reservations. `DashboardOperator` shows a simplified summary card layout.

**Pattern 2 — Route-level gating** (Products, Warehouses):

`AdminLayout` intercepts the render and redirects before the page mounts:

```tsx
// AdminLayout.tsx
if (user?.role !== 'Admin') return <Navigate to="/" replace />;
return <Outlet />;
```

Products and Warehouses never render for Operators — there is no flash or conditional display.

### Responsive Design Strategy

The app is fully responsive. All breakpoint decisions are driven by a single hook:

```tsx
// shared/hooks/useIsMobile.ts
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  // subscribes to matchMedia '(max-width: 767px)' change events
}
```

| Surface | Desktop | Mobile |
|---|---|---|
| Navigation | `Sidebar` (fixed left column) | `BottomNavBar` (fixed bottom tab bar) |
| Product edit | `Dialog` (centered modal) | `Sheet` (bottom drawer) |
| New reservation | `Dialog` (centered modal) | `Sheet` (bottom drawer) with `QuantityStepper` |
| Reservations list | `Table` with full columns | `ReservationCard` list (card-per-row) |

The `useIsMobile` hook is also mocked in the Vitest setup (`window.matchMedia` stub) so responsive behavior is testable without a real browser.

### Server State with TanStack Query

All data fetching and mutations follow a consistent contract across every feature:

```
hooks/useXxx.ts         → useQuery(['xxx'])                        # read
hooks/useCreateXxx.ts   → useMutation + onSuccess: invalidate      # write
hooks/useUpdateXxx.ts   → useMutation + onSuccess: invalidate      # write
hooks/useCancelXxx.ts   → useMutation + onSuccess: invalidate      # write
```

Pages and components never call `axios` directly. They call hooks, which return `{ data, isLoading, error }`. This means:

- Cache is shared across the component tree — two components showing the same data use one network request
- After a mutation, `queryClient.invalidateQueries(['xxx'])` triggers a background refetch and the UI updates automatically
- **Reservations cross-reference:** The reservation list displays product and warehouse names. Since the API response only includes IDs, names are resolved client-side by reading from the already-cached `useProducts()` and `useWarehouses()` query data — no extra network requests

### Form Handling

Forms follow a schema-first pattern:

```
schemas/xxxSchema.ts          # Zod schema → infers TypeScript type
         ↓
useForm<z.infer<typeof xxxSchema>>({ resolver: zodResolver(xxxSchema) })
         ↓
components/XxxForm.tsx        # register(), formState.errors, handleSubmit()
```

Client-side validation (Zod) and server-side errors (API error codes) are both displayed inline below their respective fields. The 12 API error codes defined in `docs/api-contract.md` are mapped to human-readable messages at the component level.

### Design System & Theme

The entire design system was built to match the [Figma UI reference](https://www.figma.com/design/idNN29HocMNZAPIzPnUnBB/Wtec-technical-assessment-WRMS?node-id=0-1&t=KFTCkeIEqVoQfAQh-1) pixel by pixel. All color tokens are set to **exact Figma hex values** in `app/app.css` and are never overridden to shadcn defaults:

| Token | Value | Usage |
|---|---|---|
| `--background` | `#131313` | Page background |
| `--card` | `#161616` | Card/panel surfaces |
| `--primary` | `#1CC8A8` | Brand teal — buttons, active states, focus rings |
| `--foreground` | `#F0F0F0` | Primary text |
| `--muted-foreground` | `#A0A0A0` | Secondary/dim text |
| `--border` | `#2A2A2A` | Dividers, input borders |
| `--destructive` | `#E24B4A` | Error states, cancel actions |

`app.css` must begin with `@import "tailwindcss"` before any other imports — Tailwind v4 processes utility classes only when this directive is present, and its absence silently breaks all utility classes.

shadcn/ui components are owned code in `app/components/ui/` (not imported from a package). This allows token overrides and minor tweaks without fighting upstream defaults or version-locking to a component library release.

---

## Pages & Features

### Login

Public route. Email/password form with Zod validation. On submit, calls `POST /auth/login` via `useLogin` mutation. On success, stores session and navigates to `/`. Displays inline error for invalid credentials (`UNAUTHORIZED` error code).

### Dashboard

Role-dispatched on mount. **Admin** view shows total products, total inventory units, active reservations count, a low-stock items table, and a recent reservations list — all from a single `GET /api/dashboard` call. **Operator** view shows a simplified metrics summary card appropriate for floor operations. Both views use skeleton loaders during fetch.

### Products *(Admin only)*

Product listing table with SKU, name, status (Active/Inactive) and edit action. **Create** opens a modal with name, SKU (pre-filled via `crypto.randomUUID()` slug), description, and active toggle. **Edit** opens a bottom sheet on mobile / dialog on desktop with the same fields. All mutations invalidate the products cache. Duplicate SKU returns `DUPLICATE_SKU` (409) and is displayed inline.

### Warehouses *(Admin only)*

Warehouse grid (card layout) showing name and location. **Create** opens a modal with name and location fields. No edit endpoint exists in the API contract so no edit UI is provided.

### Inventory

Role-dispatched. **Admin** view shows a full inventory table with warehouse, product, quantity, and stock status badge (In Stock / Low Stock / Out of Stock); an "Adjust" action opens a modal with the current quantity pre-filled — the API accepts absolute values, so the UI shows the actual number rather than a delta. **Operator** view is read-only — shows the same data without the adjust action.

### Reservations

Reservations table (desktop) / card list (mobile). **Create** opens a dialog/sheet with warehouse selector, product selector, and quantity input (desktop) or `QuantityStepper` (mobile). Business rules enforced by the API: available stock is shown inline to prevent over-reservation. **Cancel** button on Pending reservations calls `PUT /reservations/:id/cancel`; the backend restores inventory atomically. Status badge distinguishes Pending / Confirmed / Cancelled.

---

## Testing

Tests live in `tests/`, one file per feature. The test stack is **Vitest + React Testing Library + jsdom**.

**Setup file** (`tests/setup/setup.ts`):
- Imports `@testing-library/jest-dom/vitest` matchers
- Calls RTL `cleanup()` in `afterEach` (required because `test.globals` is not enabled)
- Mocks `window.matchMedia` globally — needed for `useIsMobile` to work in jsdom

**Pattern per test:**
```
render(<Component />) with QueryClientProvider + AuthProvider wrappers
→ mock axios (vi.mock('axios') or msw-style per-request mocks)
→ userEvent interactions
→ RTL queries (getByRole, getByText, findByText)
→ assertions via jest-dom matchers
```

**Coverage:**

| Test file | What it covers |
|---|---|
| `login.test.tsx` | Form validation (empty fields, invalid email), credential error from API, successful login redirect |
| `products.test.tsx` | Product table render, create modal (validation + submit), edit bottom sheet (pre-fill + update) |
| `warehouses.test.tsx` | Warehouse card grid, create modal (validation + submit) |
| `inventory.test.tsx` | Inventory table render, adjust modal (pre-fill current qty + submit), role-based view difference |
| `reservations.test.tsx` | Reservation table render, create reservation (warehouse + product + qty), cancel action |

Run all tests:
```bash
bun run test
```

Run a single file:
```bash
bunx vitest run tests/login.test.tsx
```

---

## Setup & Running

**Prerequisites:** [Bun](https://bun.sh) and the backend running (see `../backend/README.md`).

```bash
# 1. Copy env file and set the backend URL
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3333/api

# 2. Install dependencies
bun install

# 3. Start dev server
bun run dev   # → http://localhost:5173
```

**Seed credentials** (created by the backend seed):

| Email | Password | Role |
|---|---|---|
| `admin@wtec.com` | `123456` | Admin |
| `operator@wtec.com` | `123456` | Operator |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL — e.g. `http://localhost:3333/api` |

`VITE_` prefix is required by Vite to expose variables to the browser bundle.

---

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Dev server at `http://localhost:5173` with HMR |
| `bun run build` | Production static build (output: `build/`) |
| `bun run typecheck` | React Router v7 typegen + `tsc --noEmit` |
| `bun run lint` | Biome check with auto-fix |
| `bun run format` | Biome format with auto-fix |
| `bun run test` | Vitest run (all test files, single pass) |
| `bun run test:watch` | Vitest watch mode |

Adding a shadcn/ui component:
```bash
bun x shadcn add <component-name>
```

The component is copied into `app/components/ui/` and becomes owned code.

---

## AI Tooling Disclosure

The assessment asks for disclosure of AI-assisted tools.

**Claude Code** (by Anthropic) was used as a development harness throughout this project — generating component scaffolding, test boilerplate, and repetitive service/hook patterns.

All **architecture decisions** were defined and directed by the developer:
- Feature-slice folder structure
- TanStack Query as the server-state layer
- shadcn/ui over MUI/Ant Design
- Role-based dispatch patterns (page-level vs route-level)
- Responsive modal → bottom sheet strategy
- TDD approach (tests written before or alongside implementation)
- Auth storage design (`{ token, user }` co-located in localStorage)

Claude Code served as an accelerator, not an architect. The engineering judgment behind every structural choice in this codebase is the developer's own.

---

## Assumptions & Trade-offs

| Decision | Rationale |
|---|---|
| **`{ token, user }` stored together in localStorage** | No `/me` endpoint exists in the API contract. The login response is the only source of role/identity data, so the user payload is persisted alongside the token. Acceptable for a single-session internal tool. |
| **Context API for auth state** | The assessment explicitly required Context API for authentication state management. In a production app with more complex auth needs, Zustand would reduce provider boilerplate and provide better devtools. |
| **Absolute quantity on `PUT /inventory`** | The API contract specifies absolute inventory values, not deltas. The UI uses a numeric input showing the current quantity — no +/- stepper at the inventory level, as the API doesn't support delta adjustments. |
| **No pagination** | The API returns all records in a single response. Acceptable at the scale of this assessment; a production system with thousands of SKUs would require cursor-based pagination both in the API and the UI. |
| **Client-side name resolution for reservations** | The `GET /reservations` response returns product and warehouse IDs, not names. Names are resolved by cross-referencing the already-cached `useProducts()` and `useWarehouses()` query data — no extra requests. A production API would ideally return denormalized names or support `?include=product,warehouse`. |
| **SPA mode (no SSR)** | WRMS is an internal operations tool. SEO is irrelevant, initial load time is acceptable on a local network, and SPA mode eliminates server infrastructure complexity for the frontend. |
| **`window.location.href` redirect on 401** | The Axios response interceptor does a hard redirect (not React Router navigate) on 401. This ensures the auth state is fully reset even if the interceptor fires outside a React render cycle (e.g., background refetch). |

---

## Future Improvements

- **Real-time inventory updates** — WebSocket or SSE subscription so multiple operators see live stock changes without manual refresh
- **Pagination & server-side filtering** — cursor-based pagination for products, inventory, and reservation history with filter controls
- **i18n / internationalization** — the settings route is already stubbed; would add `react-i18next` with locale JSON files
- **E2E tests with Playwright** — unit/integration tests cover component behavior; E2E tests would cover full user flows (login → create reservation → cancel) against a real backend
- **Optimistic updates for cancellation** — cancel mutation could update the reservation list immediately and roll back on error for a snappier feel
- **PWA support** — manifest + service worker for offline-capable tablet use on the warehouse floor
- **Error boundary per feature** — currently one top-level `ErrorBoundary` in `root.tsx`; per-feature boundaries would isolate failures and avoid full-page crashes
