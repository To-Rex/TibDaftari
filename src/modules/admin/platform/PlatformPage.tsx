/**
 * Platforma (superadmin) / Hududlar (an administrator with reports access): the organisation tree walked from the
 * top — Kompaniya → Davlat → Viloyat → Tuman / shahar → Muassasa — with the activity of every place on the way.
 * Everything lives in `PlatformExplorer`; the place is kept in the address (`?company=&country=&region=&district=`).
 */
import { PlatformExplorer } from '@/features/platform/PlatformExplorer'
import { Page } from '@/shared/ui'

export default function PlatformPage() {
  return (
    <Page>
      <PlatformExplorer />
    </Page>
  )
}
