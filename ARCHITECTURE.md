# TibDaftari (Clinic-Web) — Architecture & Conventions

React 19 + Vite 8 + TypeScript (strict) + Tailwind v4 + TanStack Query + Zustand + react-router 7 + i18next + motion.

## Layers (dependency direction: top → bottom only)

```
modules/    pages per zone: landing | portal (patients) | staff (/app) | admin (/admin)
features/   feature hooks & feature-level components (react-query hooks, forms, editors)
data/       repository CONTRACTS (repositories.ts) + mock impl (mock/) + future http/
domain/     pure TS types & pure functions (no React, no I/O)
shared/     ui kit (shared/ui), i18n, theme, lib helpers, hooks, config/routes
app/        router, layouts, guards, providers
```

Rules
- Pages never call `repos` directly for mutations without react-query; use `useQuery`/`useMutation` from a `features/<name>/queries.ts` (or inline in the page if tiny). Query keys: `['<entity>', companyId, params]`.
- Pages never import from `data/mock/*` (except the demo hint on login). Only `import { repos } from '@/data'`.
- All user-facing text goes through `t('ns.key')`. Add keys to `shared/i18n/locales/uz.ts` (base) and mirror in `ru.ts`/`en.ts` (DeepPartial — untranslated keys fall back to uz).
- Colors only via tokens (`bg-surface`, `text-ink-2`, `border-line`, `bg-brand-soft`, `text-danger` …). Never raw hex in components (template documents are the exception — they are printed).
- Use `shared/ui` primitives: `Button, IconButton, Input, SearchInput, Textarea, Select, Checkbox, Switch, Field, Card, CardHeader, Badge, Avatar, Skeleton, SkeletonRows, EmptyState, Stat, Modal, Drawer, ConfirmDialog, toast, Tabs, Segmented, Menu, Pagination, Tooltip, DataTable, Page, PageHeader, Toolbar, Logo, BrandMark, LanguageSwitcher, ThemeToggle`.
- Permissions: `usePermissions().can('lab.result.write')` or `<Can perm="…">`. Route-level guards already exist in `app/router.tsx`.
- Session: `useAuth((s) => s.staff)` / `useAuth((s) => s.patient)`; branch scope: `useAuth((s) => s.branchId)` (null = all branches).
- Money: `fmtMoney`, dates: `fmtDate/fmtDateTime/fmtRelative`, phone: `fmtPhone` (shared/lib/format).
- Motion: subtle. `Page` already animates entrance. Use `motion` for list stagger (`stagger`/`fadeUp` from shared/ui/Page), hover lift on cards, AnimatePresence for conditional panels. Respect reduced motion (global CSS handles it).
- Large data: tables are server-paginated (`Page<T>` + `Pagination`). Debounce search (`useDebounce`). Keep `pageSize` ≤ 50 by default.
- Files: one component per file, PascalCase for components, camelCase for hooks/utils. Default export only for route pages (lazy-loaded); everything else named exports.
- No `any`. Prefer discriminated unions. Keep components < ~250 lines; split otherwise.

## Domain cheat-sheet
- Tenant: `Company` → `Branch`; `Employee` (roleId + overrides{allow,deny}, branchIds, categoryIds).
- Catalog: `Category` (tree, `workflow`) → `ServiceType` (price, schemaId, defaultTemplateId, documentScope) → `AttributeSchema` (fields: text/longtext/number/select/multiselect/boolean/date/table).
- Orders: `Order` (number, patient, status, payment, totals, progress) → `OrderItem` (serviceType, status pending→entered→submitted→approved|rejected, `values: ValueMap`) → `ResultDocument` (templateId, deliveries).
- Templates: `ResultTemplate` (status draft/active/archived, serviceTypeIds/categoryIds, `doc: TemplateDoc` with absolute-px elements text/field/rect/ellipse/line/image/table). Rendering helpers in `domain/template-render.ts` (`interpolate`, `formatValue`, `fieldFlag`, `fieldReference`, `tableRows`).
- Messaging: `OutboxMessage` (sms outbox with scheduled/queued/sent/delivered/failed).

## Mock data
`data/mock/db.ts` seeds 2 companies, 3 branches, 9 employees, 640 patients, ~1150 orders, 22 service types, 9 schemas, 5 templates. Demo logins: super/admin/umida/sevara/muhammad/dilnoza/ahmed/nodir — password `123456`. Patient OTP code is `1234`.
