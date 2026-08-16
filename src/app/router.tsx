import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { PortalShell } from './layouts/PortalShell'
import { RequirePatient, RequirePerm, RequireStaff } from './guards'
import { RouteError } from './RouteError'
import { routes } from '@/shared/config/routes'
import { PageSpinner } from './PageSpinner'

/* Landing & auth */
const LandingPage = lazy(() => import('@/modules/landing/LandingPage'))
const PatientLoginPage = lazy(() => import('@/modules/landing/PatientLoginPage'))
const StaffLoginPage = lazy(() => import('@/modules/landing/StaffLoginPage'))
/* Patient portal */
const PortalHome = lazy(() => import('@/modules/portal/PortalHomePage'))
const PortalResults = lazy(() => import('@/modules/portal/PortalResultsPage'))
const PortalResult = lazy(() => import('@/modules/portal/PortalResultPage'))
const PortalVisits = lazy(() => import('@/modules/portal/PortalVisitsPage'))
const PortalVisit = lazy(() => import('@/modules/portal/PortalVisitPage'))
const PortalProfile = lazy(() => import('@/modules/portal/PortalProfilePage'))
/* Staff */
const StaffDashboard = lazy(() => import('@/modules/staff/DashboardPage'))
const ReceptionPage = lazy(() => import('@/modules/staff/reception/ReceptionPage'))
const OrderPage = lazy(() => import('@/modules/staff/reception/OrderPage'))
const PatientsPage = lazy(() => import('@/modules/staff/patients/PatientsPage'))
const PatientPage = lazy(() => import('@/modules/staff/patients/PatientPage'))
const OrdersPage = lazy(() => import('@/modules/staff/orders/OrdersPage'))
const LabPage = lazy(() => import('@/modules/staff/lab/LabPage'))
const LabItemPage = lazy(() => import('@/modules/staff/lab/LabItemPage'))
const ConfirmPage = lazy(() => import('@/modules/staff/confirm/ConfirmPage'))
const ReportsPage = lazy(() => import('@/modules/staff/reports/ReportsPage'))
const MessagesPage = lazy(() => import('@/modules/staff/messages/MessagesPage'))
/* Admin */
const AdminDashboard = lazy(() => import('@/modules/admin/AdminDashboardPage'))
const CompanyPage = lazy(() => import('@/modules/admin/company/CompanyPage'))
const BranchesPage = lazy(() => import('@/modules/admin/company/BranchesPage'))
const EmployeesPage = lazy(() => import('@/modules/admin/employees/EmployeesPage'))
const EmployeePage = lazy(() => import('@/modules/admin/employees/EmployeePage'))
const RolesPage = lazy(() => import('@/modules/admin/roles/RolesPage'))
const CatalogPage = lazy(() => import('@/modules/admin/catalog/CatalogPage'))
const SchemasPage = lazy(() => import('@/modules/admin/schemas/SchemasPage'))
const SchemaEditorPage = lazy(() => import('@/modules/admin/schemas/SchemaEditorPage'))
const TemplatesPage = lazy(() => import('@/modules/admin/templates/TemplatesPage'))
const TemplateEditorPage = lazy(() => import('@/modules/admin/templates/TemplateEditorPage'))
const SmsSettingsPage = lazy(() => import('@/modules/admin/settings/SmsSettingsPage'))
const PlatformPage = lazy(() => import('@/modules/admin/platform/PlatformPage'))

const S = ({ children }: { children: ReactNode }) => <Suspense fallback={<PageSpinner />}>{children}</Suspense>
const page = (el: ReactNode) => <S>{el}</S>

export const router = createBrowserRouter([
  { path: routes.home, element: page(<LandingPage />), errorElement: <RouteError /> },
  { path: routes.patientLogin, element: page(<PatientLoginPage />), errorElement: <RouteError /> },
  { path: routes.staffLogin, element: page(<StaffLoginPage />), errorElement: <RouteError /> },
  {
    element: <RequirePatient />,
    errorElement: <RouteError />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: routes.portal.root, element: page(<PortalHome />) },
          { path: routes.portal.results, element: page(<PortalResults />) },
          { path: routes.portal.result(), element: page(<PortalResult />) },
          { path: routes.portal.visits, element: page(<PortalVisits />) },
          { path: routes.portal.visit(), element: page(<PortalVisit />) },
          { path: routes.portal.profile, element: page(<PortalProfile />) },
        ],
      },
    ],
  },
  {
    element: <RequireStaff />,
    errorElement: <RouteError />,
    children: [
      {
        path: routes.app.root,
        element: <AppShell module="staff" />,
        children: [
          { index: true, element: page(<StaffDashboard />) },
          { element: <RequirePerm perm="reception.order.create" />, children: [
            { path: routes.app.reception, element: page(<ReceptionPage />) },
            { path: routes.app.order(), element: page(<OrderPage />) },
          ] },
          { element: <RequirePerm perm="reception.patient.read" />, children: [
            { path: routes.app.patients, element: page(<PatientsPage />) },
            { path: routes.app.patient(), element: page(<PatientPage />) },
          ] },
          { element: <RequirePerm perm={['reception.order.create', 'reports.operations.read']} />, children: [{ path: routes.app.orders, element: page(<OrdersPage />) }] },
          { element: <RequirePerm perm="lab.worklist.read" />, children: [
            { path: routes.app.lab, element: page(<LabPage />) },
            { path: routes.app.labItem(), element: page(<LabItemPage />) },
          ] },
          { element: <RequirePerm perm="confirm.result.read" />, children: [{ path: routes.app.confirm, element: page(<ConfirmPage />) }] },
          { element: <RequirePerm perm={['reports.finance.read', 'reports.operations.read']} />, children: [{ path: routes.app.reports, element: page(<ReportsPage />) }] },
          { element: <RequirePerm perm={['messaging.send', 'messaging.broadcast']} />, children: [{ path: routes.app.messages, element: page(<MessagesPage />) }] },
        ],
      },
      {
        path: routes.admin.root,
        element: <AppShell module="admin" />,
        children: [
          { index: true, element: page(<AdminDashboard />) },
          { element: <RequirePerm perm="admin.company.read" />, children: [{ path: routes.admin.company, element: page(<CompanyPage />) }] },
          { element: <RequirePerm perm="admin.branch.write" />, children: [{ path: routes.admin.branches, element: page(<BranchesPage />) }] },
          { element: <RequirePerm perm="admin.employee.read" />, children: [
            { path: routes.admin.employees, element: page(<EmployeesPage />) },
            { path: routes.admin.employee(), element: page(<EmployeePage />) },
          ] },
          { element: <RequirePerm perm="admin.role.write" />, children: [{ path: routes.admin.roles, element: page(<RolesPage />) }] },
          { element: <RequirePerm perm="admin.catalog.read" />, children: [{ path: routes.admin.catalog, element: page(<CatalogPage />) }] },
          { element: <RequirePerm perm="admin.schema.write" />, children: [
            { path: routes.admin.schemas, element: page(<SchemasPage />) },
            { path: routes.admin.schema(), element: page(<SchemaEditorPage />) },
          ] },
          { element: <RequirePerm perm="admin.template.read" />, children: [
            { path: routes.admin.templates, element: page(<TemplatesPage />) },
            { path: routes.admin.template(), element: page(<TemplateEditorPage />) },
          ] },
          { element: <RequirePerm perm="admin.settings.write" />, children: [{ path: routes.admin.sms, element: page(<SmsSettingsPage />) }] },
          { element: <RequirePerm perm="platform.company.manage" />, children: [{ path: routes.admin.platform, element: page(<PlatformPage />) }] },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to={routes.home} replace /> },
])

export const Root = () => <Outlet />
