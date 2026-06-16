# Configurações & i18n

**Goal:** Settings modal accessible from the "Configurações" link in the Sidebar footer. Initial feature: language toggle between Portuguese (default) and English. Requires setting up `react-i18next` as the i18n library and wrapping the full app with the i18n provider.

**Access:** Both roles — Sidebar footer link is visible to Admin and Operator.

---

## Architecture

`react-i18next` + `i18next` for translation management. Language preference persisted in `localStorage` (`wrms_language` key) so it survives page refresh. Settings state is local to the modal — no global context needed beyond what `i18next` itself provides.

**Folder layout:**
```
app/
├── i18n/
│   ├── index.ts                    # i18next init: language detection, fallback to 'pt'
│   ├── locales/
│   │   ├── pt/
│   │   │   └── translation.json    # Portuguese strings (default)
│   │   └── en/
│   │       └── translation.json    # English strings
└── shared/
    └── components/
        └── ConfiguracoesModal.tsx  # Settings modal
```

`i18n/index.ts` is imported once at the top of `app/root.tsx` (side-effect import) to initialize before any component renders.

## UI

- "Configurações" in the Sidebar footer → opens `ConfiguracoesModal` (Dialog from shadcn/ui).
- Modal content: language selector — two options, Português / English, rendered as a toggle or radio group.
- Switching language: calls `i18n.changeLanguage('en' | 'pt')` and persists the choice to `localStorage`. UI re-renders immediately via `useTranslation` hook.
- Modal has a close button; no save/confirm needed — change is instant.

## i18n scope

All user-facing strings in the app should use `t('key')` from `useTranslation`. Translation keys should be added incrementally as each feature page is built — this task sets up the infrastructure and translates strings introduced in task 02 (Dashboard) onward. Auth/Login strings (task 01) can be translated as a cleanup step.

Translation file structure — flat keys by feature:
```json
{
  "nav.dashboard": "Dashboard",
  "nav.products": "Produtos",
  "nav.warehouses": "Armazéns",
  "nav.inventory": "Inventário",
  "nav.reservations": "Reservas",
  "nav.settings": "Configurações",
  "dashboard.title": "Dashboard",
  ...
}
```

## Dependencies to add

```bash
bun add i18next react-i18next i18next-browser-languagedetector
```

## Decisions

- `react-i18next` chosen over lighter alternatives (e.g., `next-intl`) because this is not a Next.js project — `react-i18next` is the standard for React SPAs.
- Language detection order: `localStorage` → browser `navigator.language` → fallback `'pt'`.
- No lazy-loading of translation files — the app is small enough that bundling both locale files inline is fine. No `i18next-http-backend` needed.
- This task is last in the sequence so that all strings across all feature pages already exist before wiring up translations, avoiding partial coverage.
