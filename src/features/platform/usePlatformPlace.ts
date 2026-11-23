/**
 * Where the platform page stands in the organisation tree and how it moves: the level whose list is shown, what is
 * picked above it (fixed by an administrator's own unit, or chosen on the way down), the names of those picks, the
 * ways down and back up, and «Boshqarish» — the admin panel opened for one unit.
 */
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Id } from '@/domain'
import { useAdminScope, useAuth, usePermissions } from '@/features/auth/store'
import { countryLabel } from '@/features/org/LocationFields'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { routes } from '@/shared/config/routes'
import { toast } from '@/shared/ui'
import { LADDER, type PlatformLevel } from './PathStepper'
import { ALL, usePlatformPath, type PlatformPath } from './territory'

export function usePlatformPlace() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { isSuperAdmin } = usePermissions()
  const { scopeId } = useAdminScope()
  const setScopeUnit = useAuth((s) => s.setScopeUnit)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const countries = useCountries()
  const { path, go } = usePlatformPath()

  // an administrator looks at the subtree of their own unit; the levels above it are fixed
  const root = isSuperAdmin ? undefined : shape.byId.get(scopeId)
  const rootIdx = root ? LADDER.indexOf(root.level as PlatformLevel) : -1
  const inRoot = useMemo(() => (root ? new Set(shape.under(root.id).map((u) => u.id)) : null), [root, shape])
  const companies = useMemo(() => shape.roots.filter((u) => u.level === 'company'), [shape])
  const countryNodes = useMemo(() => shape.flat.filter((u) => u.level === 'country'), [shape])
  const allCompanies = isSuperAdmin && path.company === ALL
  const companyId: Id | undefined = isSuperAdmin ? (path.company && path.company !== ALL ? path.company : undefined) : (root?.companyId ?? (root?.level === 'company' ? root.id : undefined))
  const company = companyId ? shape.byId.get(companyId) : undefined
  // the superadmin's company param is written back as it is; an administrator's company follows from their unit
  const co = isSuperAdmin ? path.company : undefined

  // a company that is not in the tree (deleted, an old link): back to the start
  useEffect(() => {
    if (isSuperAdmin && tree.isSuccess && companyId && !company) go({}, { replace: true })
  }, [isSuperAdmin, tree.isSuccess, companyId, company, go])

  // what is picked at each level — fixed by an administrator's own unit, or chosen on the way down
  const sel = {
    country: root && rootIdx >= 1 ? (root.countryId ?? undefined) : path.country,
    region: root && rootIdx >= 2 ? (root.regionId ?? undefined) : path.region,
    district: root && rootIdx >= 3 ? (root.districtId ?? undefined) : path.district,
  }
  const started = isSuperAdmin ? !!path.company : !!root
  const level: PlatformLevel = !started ? 'company' : root?.level === 'facility' ? 'facility' : !sel.country ? 'country' : !sel.region ? 'region' : !sel.district ? 'district' : 'facility'
  const idx = LADDER.indexOf(level)

  /** one level down, into the picked item of the current list */
  const down = (id: Id) => {
    if (level === 'company') go({ company: id })
    else if (level === 'country') go({ company: co, country: id })
    else if (level === 'region') go({ company: co, country: path.country, region: id })
    else if (level === 'district') go({ company: co, country: path.country, region: path.region, district: id })
  }
  /** back to a level: its list, nothing picked there or below */
  const upTo = (lvl: PlatformLevel) => {
    const to: PlatformPath = lvl === 'company' ? {} : lvl === 'country' ? { company: co } : lvl === 'region' ? { company: co, country: path.country } : { company: co, country: path.country, region: path.region }
    go(to)
  }
  /** the level the back button returns to — none at the start of the user's own view */
  const upLevel = idx > (isSuperAdmin ? 0 : rootIdx + 1) ? LADDER[idx - 1] : undefined

  const geoOf = (id?: Id | null) => (id ? countries.data?.find((c) => c.id === id) : undefined)
  const regionsRef = useRegions(sel.country, { enabled: !!sel.country })
  const districtsRef = useDistricts(sel.region, { enabled: !!sel.region })
  /** the name of what is picked at a level (an administrator's own unit at its own level) */
  const nameAt = (lvl: PlatformLevel): string | undefined => {
    if (root && LADDER.indexOf(lvl) === rootIdx) return root.name
    if (lvl === 'company') return allCompanies ? t('admin.platform.allCompanies') : (company?.name ?? '…')
    if (lvl === 'country') { const c = geoOf(sel.country); return c ? countryLabel(c) : (root?.countryName ?? '…') }
    if (lvl === 'region') return regionsRef.data?.find((r) => r.id === sel.region)?.name ?? root?.regionName ?? '…'
    if (lvl === 'district') return districtsRef.data?.find((d) => d.id === sel.district)?.name ?? root?.districtName ?? '…'
    return undefined
  }

  /** may this unit be opened in the admin panel by this user (it is in their tree, inside their own subtree) */
  const canManage = (unitId?: Id | null): unitId is Id => !!unitId && shape.byId.has(unitId) && (!inRoot || inRoot.has(unitId))
  const manage = (unitId: Id) => {
    setScopeUnit(unitId)
    toast.success(t('admin.platform.switched', { name: shape.byId.get(unitId)?.name ?? '' }))
    nav(routes.admin.root)
  }

  return {
    isSuperAdmin, tree, shape, countries, path, go, root, rootIdx, inRoot, companies, countryNodes, allCompanies, companyId, company, co, sel, level, idx,
    down, upTo, upLevel, geoOf, nameAt, canManage, manage,
  }
}
