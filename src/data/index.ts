/**
 * Repository provider. Swap VITE_DATA_SOURCE=http once the FastAPI backend exists;
 * nothing above this layer changes.
 */
import type { Repositories } from './repositories'
import { authMock } from './mock/repos/auth.mock'
import { tenantMock, staffMock, patientMock } from './mock/repos/org.mock'
import { catalogMock, templateMock } from './mock/repos/catalog.mock'
import { orderMock, messagingMock, reportMock, portalMock } from './mock/repos/order.mock'

const mockRepositories: Repositories = {
  auth: authMock,
  tenant: tenantMock,
  staff: staffMock,
  patients: patientMock,
  catalog: catalogMock,
  templates: templateMock,
  orders: orderMock,
  messaging: messagingMock,
  reports: reportMock,
  portal: portalMock,
}

const source = import.meta.env.VITE_DATA_SOURCE ?? 'mock'

export const repos: Repositories = source === 'http' ? mockRepositories /* TODO: httpRepositories */ : mockRepositories

export * from './repositories'
export { MockError } from './mock/util'
