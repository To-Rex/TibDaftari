/**
 * Hududlar: activity of the organisation tree by territory (`?tab=regions` — every administrator with reports access,
 * folded under their own unit) and, for the superadmin, the roots of the tree — the companies (`?tab=companies`) —
 * and the country nodes under them (`?tab=countries`).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { BriefcaseBusiness, Globe2, Map, Plus } from 'lucide-react'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { CompaniesView } from '@/features/platform/CompaniesView'
import { CountriesView } from '@/features/platform/CountriesView'
import { RegionsView } from '@/features/platform/RegionsView'
import { Button, Page, PageHeader, Tabs } from '@/shared/ui'

type Tab = 'regions' | 'companies' | 'countries'

export default function PlatformPage() {
  const { t } = useTranslation()
  const { isSuperAdmin } = usePermissions()
  const { scopeId } = useAdminScope()
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const unit = shape.byId.get(scopeId)
  const [params, setParams] = useSearchParams()
  const asked = params.get('tab')
  const tab: Tab = isSuperAdmin && (asked === 'countries' || asked === 'companies') ? asked : 'regions'
  const setTab = (next: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (next === 'regions') n.delete('tab'); else n.set('tab', next); return n })
  const [createOpen, setCreateOpen] = useState(false)
  const companyCount = shape.roots.filter((u) => u.level === 'company').length
  const countryCount = shape.units.filter((u) => u.level === 'country').length

  return (
    <Page>
      <PageHeader
        eyebrow={isSuperAdmin ? 'Superadmin' : unit?.name}
        title={isSuperAdmin ? t('admin.platform.title') : t('admin.platform.tabRegions')}
        description={tab === 'countries' ? t('admin.platform.countries.subtitle') : tab === 'companies' ? t('admin.platform.companies.subtitle') : isSuperAdmin ? t('admin.platform.regions.subtitle') : t('admin.platform.regions.scopedSubtitle', { name: unit?.name ?? '' })}
        actions={isSuperAdmin && tab !== 'regions' && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)} data-platform-add={tab}>{t(tab === 'companies' ? 'admin.platform.companies.add' : 'admin.platform.countries.add')}</Button>} />
      {isSuperAdmin && (
        <Tabs<Tab> className="mb-4" value={tab} onChange={setTab}
          items={[
            { value: 'regions', label: t('admin.platform.tabRegions'), icon: <Map className="size-4" /> },
            { value: 'companies', label: t('admin.platform.tabCompanies'), icon: <BriefcaseBusiness className="size-4" />, count: companyCount || undefined },
            { value: 'countries', label: t('admin.platform.tabCountries'), icon: <Globe2 className="size-4" />, count: countryCount || undefined },
          ]} />
      )}
      {tab === 'countries' ? <CountriesView createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
        : tab === 'companies' ? <CompaniesView createOpen={createOpen} onCreateClose={() => setCreateOpen(false)} />
          : <RegionsView />}
    </Page>
  )
}
