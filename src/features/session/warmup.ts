/**
 * Workspace warm-up: right after a staff session is available we prefetch the data every
 * page needs (branches, catalog, schemas, templates, roles) and preload the lazily-split
 * route chunks during idle time — so the first navigation to any page is instant.
 * All calls are background & best-effort; failures are ignored.
 */
import type { QueryClient } from '@tanstack/react-query'
import { repos } from '@/data'
import type { Id } from '@/domain'
import { catalogKeys } from '@/features/catalog/queries'

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
  () => import('@/modules/admin/company/CompanyPage'),
  () => import('@/modules/admin/company/BranchesPage'),
  () => import('@/modules/admin/employees/EmployeesPage'),
  () => import('@/modules/admin/employees/EmployeePage'),
  () => import('@/modules/admin/roles/RolesPage'),
  () => import('@/modules/admin/catalog/CatalogPage'),
  () => import('@/modules/admin/schemas/SchemasPage'),
  () => import('@/modules/admin/schemas/SchemaEditorPage'),
  () => import('@/modules/admin/templates/TemplatesPage'),
  () => import('@/modules/admin/templates/TemplateEditorPage'),
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

/** Prefetch shared data for a company (deduped per session; React Query keeps it fresh from there). */
export function warmWorkspaceData(qc: QueryClient, companyId: Id, module: 'staff' | 'admin') {
  const tag = `${module}:${companyId}`
  if (warmed.has(tag)) return
  warmed.add(tag)
  const stale = 60_000
  void qc.prefetchQuery({ queryKey: catalogKeys.branches(companyId), queryFn: () => repos.tenant.listBranches(companyId), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.categories(companyId), queryFn: () => repos.catalog.listCategories(companyId), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.serviceTypes(companyId, {}), queryFn: () => repos.catalog.listServiceTypes(companyId, {}), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.schemas(companyId), queryFn: () => repos.catalog.listSchemas(companyId), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.templates(companyId, {}), queryFn: () => repos.templates.list(companyId, {}), staleTime: stale })
  void qc.prefetchQuery({ queryKey: catalogKeys.assets(companyId), queryFn: () => repos.templates.listAssets(companyId), staleTime: stale })
  if (module === 'admin') {
    void qc.prefetchQuery({ queryKey: ['roles', companyId], queryFn: () => repos.staff.listRoles(companyId), staleTime: stale })
    void qc.prefetchQuery({ queryKey: ['company', companyId], queryFn: () => repos.tenant.getCompany(companyId), staleTime: stale })
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
