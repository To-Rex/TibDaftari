/** HTTP repository set — the only data source of the app (TibDaftari FastAPI backend). */
import type { Repositories } from '../repositories'
import { authHttp } from './auth.http'
import { orgHttp } from './org.http'
import { staffHttp } from './staff.http'
import { patientsHttp } from './patients.http'
import { catalogHttp } from './catalog.http'
import { templatesHttp } from './templates.http'
import { ordersHttp } from './orders.http'
import { messagingHttp } from './messaging.http'
import { reportsHttp } from './reports.http'
import { platformHttp } from './platform.http'
import { portalHttp } from './portal.http'
import { assistantHttp } from './assistant.http'

export const httpRepositories: Repositories = {
  auth: authHttp,
  org: orgHttp,
  staff: staffHttp,
  patients: patientsHttp,
  catalog: catalogHttp,
  templates: templatesHttp,
  orders: ordersHttp,
  messaging: messagingHttp,
  reports: reportsHttp,
  platform: platformHttp,
  portal: portalHttp,
  assistant: assistantHttp,
}

export { ApiError, absoluteUrl, API_BASE } from './client'
