/** Every tour of the app and which one belongs to the page on screen. */
import { matchPath } from 'react-router-dom'
import type { TourAudience, TourDef } from './types'
import { ADMIN_SHELL, PORTAL_SHELL, STAFF_SHELL } from './tours/shell'
import { STAFF_DESK_TOURS } from './tours/staffDesk'
import { STAFF_LAB_TOURS } from './tours/staffLab'
import { ADMIN_ORG_TOURS } from './tours/adminOrg'
import { ADMIN_CATALOG_TOURS } from './tours/adminCatalog'
import { PORTAL_TOURS } from './tours/portal'

const SHELL: Record<TourAudience, TourDef> = { staff: STAFF_SHELL, admin: ADMIN_SHELL, portal: PORTAL_SHELL }
/** the tours of single pages (each has a `route`) */
export const PAGE_TOURS: TourDef[] = [...STAFF_DESK_TOURS, ...STAFF_LAB_TOURS, ...ADMIN_ORG_TOURS, ...ADMIN_CATALOG_TOURS, ...PORTAL_TOURS]

/** the general tour of a module: its menu and the top bar */
export const shellTour = (audience: TourAudience): TourDef => SHELL[audience]
/** the tour of the page at `pathname` in this module, when it has one */
export const pageTour = (pathname: string, audience: TourAudience): TourDef | undefined =>
  PAGE_TOURS.find((t) => t.audience === audience && t.route && matchPath({ path: t.route, end: true }, pathname))
