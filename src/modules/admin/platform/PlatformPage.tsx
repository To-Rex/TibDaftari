/**
 * Hududlar: activity of the organisation tree by territory (`?tab=regions` — every administrator with reports access,
 * folded under their own unit) and, for the superadmin, the country roots of the tree (`?tab=countries`).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Globe2, Map, Plus } from 'lucide-react'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { CountriesView } from '@/features/platform/CountriesView'
import { RegionsView } from '@/features/platform/RegionsView'
import { Button, Page, PageHeader, Tabs } from '@/shared/ui'

type Tab = 'regions' | 'countries'

export default function PlatformPage() {
  const { t } = useTranslation()
  const { isSuperAdmin } = usePermissions()
  const { scopeId } = useAdminScope()
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const unit = shape.byId.get(scopeId)
  const [params, setParams] = useSearchParams()
  const tab: Tab = isSuperAdmin && params.get('tab') === 'countries' ? 'countries' : 'regions'
  const setTab = (next: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (next === 'regions') n.delete('tab'); else n.set('tab', next); return n })
  const [createOpen, setCreateOpen] = useState(false)
  const countryRoots = shape.roots.filter((u) => u.level === 'country').length

  return (
    <Page>
      <PageHeader
        eyebrow={isSuperAdmin ? 'Superadmin' : unit?.name}
        title={isSuperAdmin ? t('admin.platform.title') : t('admin.platform.tabRegions')}
        description={tab === 'countries' ? t('admin.platform.countries.subtitle') : isSuperAdmin ? t('admin.platform.regions.subtitle') : t('admin.platform.regions.scopedSubtitle', { name: unit?.name ?? '' })}
        actions={isSuperAdmin && tab === 'countries' && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>{t('admin.platform.countries.add')}</Button>} />
      {isSuperAdmin && (
        <Tabs<Tab> className="mb-4" value={tab} onChange={setTab}
          items={[
            { value: 'regions', label: t('admin.platform.tabRegions'), icon: <Map className="size-4" /> },
            { value: 'countries', label: t('admin.platform.tabCountries'), icon: <Globe2 className="size-4" />, count: countryRoots || undefined },
          ]} />
      )}
      {tab === 'countries' ? <CountriesView createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} /> : <RegionsView />}
    </Page>
  )
}
