/**
 * The units under the administered one — viloyatlar, tumanlar, muassasalar — as a tree. Search, show / hide
 * inactive, add a unit under any node, switch a unit off, open its card. A superadmin with no tree yet creates the
 * first country node here.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Earth, Landmark, Pencil, Plus } from 'lucide-react'
import type { OrgUnit } from '@/domain'
import { CHILD_LEVEL, unitsUnder } from '@/domain'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnitTree, useUpdateUnit } from '@/features/org/queries'
import { UnitDrawer } from '@/features/org/UnitDrawer'
import { UnitTreeView } from '@/features/org/UnitTreeView'
import { useUnitLabels } from '@/features/org/unitUi'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { fmtNumber } from '@/shared/lib/format'
import { Button, Card, EmptyState, IconButton, Page, PageHeader, SearchInput, Skeleton, Switch, Toolbar, toast } from '@/shared/ui'

type DrawerState = { open: boolean; parent: OrgUnit | null; unit: OrgUnit | null }

export default function UnitsPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { scopeId } = useAdminScope()
  const { can, isSuperAdmin } = usePermissions()
  const canManage = can('admin.unit.manage')
  const labels = useUnitLabels()
  const tree = useUnitTree()
  const update = useUpdateUnit()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, parent: null, unit: null })

  const all = useMemo(() => tree.data ?? [], [tree.data])
  const under = useMemo(() => unitsUnder(all, scopeId), [all, scopeId])
  const scope = under[0]
  const parents = useMemo(() => under.filter((u) => u.level !== 'facility' && u.isActive), [under])
  const emptyTree = tree.isSuccess && all.length === 0

  const openAdd = (parent: OrgUnit | null) => setDrawer({ open: true, parent, unit: null })
  const openEdit = (unit: OrgUnit) => setDrawer({ open: true, parent: null, unit })
  const close = () => setDrawer((d) => ({ ...d, open: false }))
  const toggleActive = async (u: OrgUnit, next: boolean) => {
    try {
      await update.mutateAsync({ id: u.id, isActive: next })
      toast.success(next ? t('admin.units.activated') : t('admin.units.deactivated'), u.name)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const summary = scope && [
    scope.level === 'country' && t('admin.units.nRegions', { count: scope.counts.regions }),
    (scope.level === 'country' || scope.level === 'region') && t('admin.units.nDistricts', { count: scope.counts.districts }),
    scope.level !== 'facility' && t('admin.units.nFacilities', { count: scope.counts.facilities }),
  ].filter(Boolean).join(' · ')

  return (
    <Page>
      <PageHeader title={t('admin.units.title')} description={t('admin.units.subtitle')}
        actions={canManage && scope && scope.level !== 'facility' && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => openAdd(scope)}>{t('admin.units.add')}</Button>} />

      {tree.isLoading ? (
        <Card padded={false} className="overflow-hidden"><div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-11" />)}</div></Card>
      ) : emptyTree ? (
        <Card>
          <EmptyState icon={<Earth />} title={t('admin.units.emptyTree')} description={isSuperAdmin ? t('admin.units.emptyTreeHint') : t('common.emptyHint')}
            action={isSuperAdmin && <Button leftIcon={<Plus className="size-4" />} onClick={() => openAdd(null)} data-add-country>{t('admin.units.addCountry')}</Button>} />
        </Card>
      ) : !scope ? (
        <Card><EmptyState icon={<Landmark />} title={t('admin.unit.notFound')} /></Card>
      ) : (
        <>
          <Toolbar actions={summary ? <span className="text-[13px] text-ink-3 tabular" data-units-summary>{summary}</span> : undefined}>
            <SearchInput value={search} onChange={setSearch} placeholder={t('admin.units.searchPlaceholder')} className="w-full sm:w-72" />
            <Switch size="sm" checked={showInactive} onChange={setShowInactive} label={<span className="text-[13px] font-normal text-ink-2">{t('admin.units.showInactive')}</span>} className="items-center" />
          </Toolbar>
          <Card padded={false} className="overflow-hidden">
            <UnitTreeView
              units={all}
              rootId={scopeId}
              search={search}
              showInactive={showInactive}
              onSelect={(u) => nav(u.id === scopeId ? routes.admin.unit : routes.admin.unitDetail(u.id))}
              renderActions={canManage ? (u) => (
                <>
                  {u.id !== scopeId && <Switch size="sm" checked={u.isActive} onChange={(v) => void toggleActive(u, v)} ariaLabel={t('admin.units.toggleActive')} disabled={update.isPending} className="mr-1 max-sm:hidden" />}
                  {CHILD_LEVEL[u.level] && u.isActive && <IconButton size="sm" label={t('admin.units.addLevel', { level: labels.level(CHILD_LEVEL[u.level]!) })} onClick={() => openAdd(u)} data-add-child={u.id}><Plus /></IconButton>}
                  <IconButton size="sm" label={t('common.edit')} onClick={() => openEdit(u)} data-edit-unit={u.id}><Pencil /></IconButton>
                </>
              ) : undefined}
            />
          </Card>
          <p className="mt-3 text-[12.5px] text-ink-3">{t('admin.units.count', { count: fmtNumber(Math.max(0, under.length - 1)) })}</p>
        </>
      )}

      <UnitDrawer open={drawer.open} onClose={close} parent={drawer.parent} parents={drawer.unit ? undefined : parents} unit={drawer.unit} units={all}
        onSaved={(u) => { if (!drawer.unit) nav(routes.admin.unitDetail(u.id)) }} />
    </Page>
  )
}
