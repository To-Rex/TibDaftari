/**
 * The sentences of the guided tours: the general tours (`tour/shell.ts`) and the tour of every page, written by area
 * (`tour/staffDesk.ts`, `tour/staffLab.ts`, `tour/adminOrg.ts`, `tour/adminCatalog.ts`, `tour/portal.ts`) and read as
 * `tour.pages.<tour id>.<step key>.title` / `.body`. Several hundred sentences a reader needs only on a first visit,
 * so this module is a chunk of its own, fetched when a tour is about to start (`loadTourTexts` in `../index.ts`);
 * the tours' buttons and the «?» menu (`tour/ui.ts`) are in the main bundle.
 */
import { tourShellLocale } from './tour/shell'
import { tourStaffDeskLocale } from './tour/staffDesk'
import { tourStaffLabLocale } from './tour/staffLab'
import { tourAdminOrgLocale } from './tour/adminOrg'
import { tourAdminCatalogLocale } from './tour/adminCatalog'
import { tourPortalLocale } from './tour/portal'
import type { tourUiLocale } from './tour/ui'

const build = (l: 'uz' | 'ru' | 'en') => ({
  ...tourShellLocale[l],
  pages: { ...tourStaffDeskLocale[l], ...tourStaffLabLocale[l], ...tourAdminOrgLocale[l], ...tourAdminCatalogLocale[l], ...tourPortalLocale[l] } as Record<string, unknown>,
})

export const tourLocale = { uz: build('uz'), ru: build('ru'), en: build('en') }
/** everything under `tour.` in a dictionary: the buttons and the sentences */
export type TourTexts = (typeof tourUiLocale)['uz'] & (typeof tourLocale)['uz']
