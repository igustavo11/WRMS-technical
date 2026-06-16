# Dashboard

**Goal:** Dashboard page split by role — Admin sees system-wide metrics and recent reservations; Operator sees stock summary, a "Create Reservation" CTA, and their recent reservations. Also introduces the shared `Sidebar` and the `AdminLayout` route guard, which are infrastructure used by all subsequent features.

**Figma references:** `node-id=1-1804` (Admin), `node-id=1-3184` (Operator)

---

## Infrastructure introduced in this task

### `AdminLayout` (route guard)

`app/shared/components/AdminLayout.tsx` — a layout component placed in `routes.ts` wrapping Admin-only routes. Reads `user.role` from `AuthContext`; redirects to `/` if `role !== 'Admin'`. Renders `<Outlet />` otherwise. Wired in `routes.ts` via `layout()` around `/produtos` and `/armazens`.

### `Sidebar`

`app/shared/components/Sidebar.tsx` — single component, role-aware. Reads `user` from `AuthContext`.

- Admin nav items: Dashboard, Produtos, Armazéns, Inventário, Reservas
- Operator nav items: Dashboard, Inventário, Reservas
- Footer: Configurações link + user avatar/name + role badge (teal "Admin" / amber "OPERATOR") + Logout button
- Active item highlighted in teal with left border accent (matches Figma)

The current `ProtectedLayout` only renders `<Outlet />` after the token check. It should be extended (or a wrapping layout added) to render the `Sidebar` + main content area as the authenticated shell.

---

## Dashboard page

**Architecture:** `DashboardPage` (route component, dispatches by role) → `DashboardAdmin` | `DashboardOperator`. Both consume `GET /api/dashboard` via TanStack Query. The hook lives at `features/dashboard/hooks/useDashboard.ts`.

**Folder layout:**
```
features/dashboard/
├── pages/DashboardPage.tsx          # role dispatch only
├── components/DashboardAdmin.tsx    # Admin UI
├── components/DashboardOperator.tsx # Operator UI
├── hooks/useDashboard.ts            # useQuery → GET /api/dashboard
└── services/dashboardApi.ts         # axios call
```

### Admin view (`DashboardAdmin`)

4 metric cards: Total Produtos · Total Armazéns · Total em Estoque · Reservas Ativas.
"Reservas Recentes" table: ID · Produto · Armazém · QTD · Status · Data · Ação (Cancelar button → `PUT /api/reservations/:id/cancel`).
"Ver Todas" link → `/reservas`.

### Operator view (`DashboardOperator`)

Title: "Visão Geral" + personalized greeting using `user.name` from `AuthContext`.
3 metric cards: Estoque Disponível (`totalInventory`) · Minhas Reservas Ativas (`activeReservations`) · Reservas Criadas Hoje (`reservationsCreatedToday`).
"Criar Nova Reserva" CTA card → opens Nova Reserva modal (same modal as Reservas page; can be extracted to `shared` or deferred to the Reservas task and linked from here).
"Minhas Reservas Recentes" table: ID Reserva · Projeto (`productName`) · Data Criação · Itens (`quantity`) · Status. Data from `recentReservations` on the dashboard response. "Ver Todas" → `/reservas`.

**Data note:** The API has no user-scoped reservations filter and no "Projeto" field. `productName` maps to the Projeto column. The table shows the same `recentReservations` as Admin (last 5 system-wide), not filtered per user — this is an accepted trade-off given the API contract.

---

## Decisions

- `DashboardPage` does role dispatch; no separate routes for Admin/Operator dashboard.
- `AdminLayout` is the single mechanism for blocking Operator from Admin-only routes — not inline guards inside pages.
- Sidebar is one component with conditional nav items, not two separate components.
- `ProtectedLayout` is extended to render the authenticated shell (Sidebar + content area); it remains the single layout wrapper for all protected routes in `routes.ts`.
