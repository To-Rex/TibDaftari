/**
 * Workspace warm-up: right after a staff session is available we prefetch the data every
 * page needs (catalog, schemas, templates, assets — and for the admin panel roles and the unit card)
 * and preload the lazily-split route chunks during idle time — so the first navigation to any page is instant.
 * All calls are background & best-effort; failures are ignored.
 */
import type { QueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { Id } from '@/domain'
import { catalogKeys } from '@/features/catalog/queries'
import { orgKeys } from '@/features/org/queries'

const STAFF_ROUTE_CHUNKS = [
  () => import('@/modules/staff/DashboardPage'),
  () => import('@/modules/staff/reception/ReceptionPage'),
  () => import('@/modules/staff/reception/OrderPage'),
  () => import('@/modules/staff/patients/PatientsPage'),
  () => import('@/modules/staff/patients/PatientPage'),
  () => import('@/modules/staff/orders/OrdersPage'),
  () => import('@/modules/staff/lab/LabPage'),
  () => import('@/modules/staff/lab/LabItemPage'),
  () => import('@/modules/staff/confirm/ConfirmPage'),
  () => import('@/modules/staff/reports/ReportsPage'),
  () => import('@/modules/staff/messages/MessagesPage'),
]
const ADMIN_ROUTE_CHUNKS = [
  () => import('@/modules/admin/AdminDashboardPage'),
  () => import('@/modules/admin/org/UnitPage'),
  () => import('@/modules/admin/org/UnitsPage'),
  () => import('@/modules/admin/employees/EmployeesPage'),
  () => import('@/modules/admin/employees/EmployeePage'),
  () => import('@/modules/admin/roles/RolesPage'),
  () => import('@/modules/admin/catalog/CatalogPage'),
  () => import('@/modules/admin/schemas/SchemasPage'),
  () => import('@/modules/admin/schemas/SchemaEditorPage'),
  () => import('@/modules/admin/templates/TemplatesPage'),
  () => import('@/modules/admin/templates/TemplateEditorPage'),
  () => import('@/modules/admin/templates/ReceiptTemplatesPage'),
  () => import('@/modules/admin/settings/SmsSettingsPage'),
  () => import('@/modules/admin/platform/PlatformPage'),
]

const idle = (fn: () => void) => {
  if (typeof window === 'undefined') return
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
  if (ric) ric(fn, { timeout: 4000 })
  else setTimeout(fn, 1200)
}

const warmed = new Set<string>()

/**
 * Prefetch the shared data of a unit (deduped per session; React Query keeps it fresh from there).
 * `unitId` is the unit the module works in: the facility for the staff app, the administered unit for the admin panel.
 */
export function warmWorkspaceData(qc: QueryClient, unitId: Id, module: 'staff' | 'admin') {
  const tag = `${module}:${unitId}`
  if (warmed.has(tag)) return
  warmed.add(tag)
  const stale = 60_000
  void qc.prefetchQuery({ queryKey: catalogKeys.categories(unitId), queryFn: () => repos.catalog.listCategories(unitId), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.serviceTypes(unitId, {}), queryFn: () => repos.catalog.listServiceTypes(unitId, {}), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.schemas(unitId), queryFn: () => repos.catalog.listSchemas(unitId), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.templates(unitId, {}), queryFn: () => repos.templates.list(unitId, {}), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.assets(unitId), queryFn: () => repos.templates.listAssets(unitId), staleTime: stale })
  if (module === 'admin') {
    void qc.prefetchQuery({ queryKey: ['roles', unitId], queryFn: () => repos.staff.listRoles(unitId), staleTime: stale })
    void qc.prefetchQuery({ queryKey: orgKeys.unit(unitId), queryFn: () => repos.org.get(unitId), staleTime: stale })
  }
}

let chunksPreloaded = false
/** Load every staff/admin route chunk while the browser is idle (one-time per page load). */
export function preloadRouteChunks() {
  if (chunksPreloaded) return
  chunksPreloaded = true
  idle(() => {
    for (const load of [...STAFF_ROUTE_CHUNKS, ...ADMIN_ROUTE_CHUNKS]) void load().catch(() => undefined)
  })
}
