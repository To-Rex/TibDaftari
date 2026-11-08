/** Superadmin: every clinic on the platform (`?tab=clinics`) and the activity by territory (`?tab=regions`). */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Building2, Map, Plus } from 'lucide-react'
import type { Company, CompanyListQuery } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { ClinicsView } from '@/features/platform/ClinicsView'
import { RegionsView } from '@/features/platform/RegionsView'
import { Button, Page, PageHeader, Tabs } from '@/shared/ui'

const TABS = ['clinics', 'regions'] as const
type Tab = (typeof TABS)[number]

export default function PlatformPage() {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const canManage = can('platform.company.manage')
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'regions' ? 'regions' : 'clinics'
  const setTab = (next: Tab) => setParams((p) => { const n = new URLSearchParams(p); if (next === 'clinics') n.delete('tab'); else n.set('tab', next); return n })
  const [drawer, setDrawer] = useState<{ open: boolean; company: Company | null }>({ open: false, company: null })

  // the regions tab hands a territory / "hududsiz" over to the clinic list
  const showClinics = (f: Partial<CompanyListQuery>) => setParams((p) => {
    const n = new URLSearchParams(p)
    n.delete('tab')
    const put = (k: string, v: string | undefined) => (v ? n.set(k, v) : n.delete(k))
    put('country', f.countryId); put('region', f.regionId); put('district', f.districtId); put('unlocated', f.unlocated ? '1' : undefined)
    return n
  })

  return (
    <Page>
      <PageHeader eyebrow="Superadmin" title={t('admin.platform.title')} description={tab === 'regions' ? t('admin.platform.regions.subtitle') : t('admin.platform.subtitle')}
        actions={canManage && tab === 'clinics' && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => setDrawer({ open: true, company: null })}>{t('admin.platform.add')}</Button>} />
      <Tabs<Tab> className="mb-4" value={tab} onChange={setTab}
        items={[{ value: 'clinics', label: t('admin.platform.tabClinics'), icon: <Building2 className="size-4" /> }, { value: 'regions', label: t('admin.platform.tabRegions'), icon: <Map className="size-4" /> }]} />
      {tab === 'regions' ? <RegionsView onShowClinics={showClinics} /> : <ClinicsView drawer={drawer} setDrawer={setDrawer} />}
    </Page>
  )
}
