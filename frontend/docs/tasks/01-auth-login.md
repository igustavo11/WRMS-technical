# Auth & Login

**Goal:** Real `AuthContext` (Context API, per PRD requirement) backed by `POST /api/auth/login`, plus the `/login` page implemented pixel-close to the Figma design (`node-id=1-3097`), and a route guard protecting the (still blank) home route.

**Architecture:** `shared/api/authToken.ts` (localStorage session: `{ token, user }`, single source of truth) → `shared/api/client.ts` (Axios instance, request interceptor attaches `Authorization: Bearer`, response interceptor clears session + redirects to `/login` on 401) → `features/auth/services/authApi.ts` (`loginRequest`) → `features/auth/hooks/useLogin.ts` (TanStack Query `useMutation`, calls `AuthContext.login()` on success) → `features/auth/pages/LoginPage.tsx` (React Hook Form + Zod, calls `useLogin()`, navigates to `/` on success). `shared/components/ProtectedLayout.tsx` reads `useAuth().token`; redirects to `/login` if absent, otherwise renders `<Outlet />`. Wired into `app/routes.ts` via React Router v7's `layout()` helper wrapping the home `index()` route.

**Folder layout (`features/auth/`)**, organized by semantic responsibility rather than flat:

```
features/auth/
├── pages/LoginPage.tsx        # route-level UI/JSX
├── services/authApi.ts        # HTTP calls
├── hooks/useAuth.ts           # context-consumption hook
├── hooks/useLogin.ts          # data-mutation hook
├── context/AuthContext.tsx    # Context API provider
└── schemas/loginSchema.ts     # Zod validation schema
```

## Decisions made during brainstorming

- **Role toggle (Operador/Administrador) from the Figma is not implemented.** The API only takes `{email, password}` — role comes from the user record server-side, not from a login-time selector. Decided not to fake it with an email-prefill shortcut; just email + password fields.
- **"Esqueceu a senha?" and the footer links (Política de Privacidade / Suporte Técnico) are omitted entirely.** No password-reset endpoint exists in the API; rendering dead links wasn't worth it.
- **Global theme tokens (`app/app.css`) were updated to the exact Figma hex values** (`#131313` background, `#161616` card, `#1cc8a8` primary, `#4ce4c3` accent, `#e24b4a` destructive, etc.) instead of shadcn's generated placeholder theme. This applies to every future page, not just Login.
- **Session is stored as one JSON blob (`wrms_session` → `{ token, user }`) in localStorage**, not just the raw token. The API has no `/me` endpoint, so the user's `{id, email, role}` has to be persisted client-side to survive a page refresh — storing it alongside the token (rather than decoding the JWT payload client-side) avoids adding a JWT-decoding dependency for no real benefit.
- **`/` (home) is protected starting now**, even though `Home` itself is still just a placeholder (`<h1>WRMS</h1>`). This was deliberate so the full auth loop (login → token → guarded access → 401 → logout) is exercised end-to-end before any real page exists behind it.
- **WTEC logo** was pulled directly from the Figma file (`download_assets` on node `1:3359`) as SVG, then hand-cleaned to drop an exported background rect that doesn't belong in a reusable logo asset — saved to `public/wtec-logo.svg`.

## Bug found and fixed during this task

`app/app.css` imported `shadcn/tailwind.css` (shadcn's custom variants/utilities) but never imported Tailwind itself (`@import "tailwindcss";` was missing). Result: zero utility classes were generated — only the literal `@layer base` rules in `app.css` rendered, every component looked like unstyled HTML. Fixed by adding `@import "tailwindcss";` as the first line of `app.css`. Caught by visually checking the page in a browser, not by typecheck/lint/tests (none of those would have caught a missing CSS import).

## Files

- `app/shared/api/authToken.ts` — session persistence (localStorage)
- `app/shared/api/client.ts` — Axios instance + interceptors
- `app/shared/components/ProtectedLayout.tsx` — route guard
- `app/features/auth/services/authApi.ts` — `loginRequest`
- `app/features/auth/schemas/loginSchema.ts` — Zod schema (mirrors backend's `loginBodySchema`)
- `app/features/auth/context/AuthContext.tsx`
- `app/features/auth/hooks/useAuth.ts`, `hooks/useLogin.ts`
- `app/features/auth/pages/LoginPage.tsx`
- `app/routes.ts`, `app/root.tsx` — wiring
- `app/app.css` — theme tokens + missing Tailwind import fix
- `public/wtec-logo.svg`
- `tests/login.test.tsx` — validation errors on empty submit, API called with entered credentials
- `tests/setup/setup.ts` — added RTL `cleanup()` in `afterEach` (was missing; without it, mounted DOM leaked between tests in the same file since `vitest.config.ts` doesn't set `test.globals: true`)
- `vitest.config.ts` — added `resolve.alias` for `~` → `app/` (only the app's own Vite config got this via `@react-router/dev/vite`'s plugin; Vitest's separate config needed it too)

## Manual verification

`bun run typecheck`, `bun run lint`, `bun run test` (3/3 passing), `bun run build` all clean. Visually checked in a real browser (Playwright) at the `/login` route: layout, colors, and spacing match the Figma reference; empty-submit validation shows the same red-border/red-label/error-text treatment as the Figma's error-state frame; password show/hide toggle works.

Not yet verified against a running backend (login success → redirect → guarded home). Should be checked manually once the backend is running locally, before this is considered fully done.
