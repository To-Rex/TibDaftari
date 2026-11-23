/**
 * Where the platform page stands in the organisation tree, kept in the address so every step is a link and the
 * browser's Back walks up again: `?company=<id>|all&country=&region=&district=`. Nothing = the companies (the root);
 * `company=all` = every company together, folded by territory. An administrator below the top never stores what
 * their own unit fixes (it follows from the unit).
 *
 * Links of the earlier page keep working: `?tab=countries` and a country without a company open the all-companies
 * view, `country=all` means "every country", `?tab=companies` / `?tab=regions` are the start.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Id } from '@/domain'

/** `company=all` — every company together */
export const ALL = 'all'

/** the steps taken down the tree — the ids of what was picked at each level */
export interface PlatformPath {
  /** a company node id, or `ALL` */
  company?: string
  /** a country of the reference (geo id) */
  country?: Id
  region?: Id
  district?: Id
}

const KEYS = ['company', 'country', 'region', 'district'] as const

export function usePlatformPath() {
  const [params, setParams] = useSearchParams()
  const path = useMemo<PlatformPath>(() => {
    const raw = params.get('country') || undefined
    const country = raw === ALL ? undefined : raw
    let company = params.get('company') || undefined
    if (!company && (params.get('tab') === 'countries' || raw)) company = ALL
    return { company, country, region: params.get('region') || undefined, district: params.get('district') || undefined }
  }, [params])
  /** go to another place of the tree; `replace` = correct the address without a new history step */
  const go = useCallback((next: PlatformPath, opts?: { replace?: boolean }) => {
    setParams((p) => {
      const n = new URLSearchParams(p)
      n.delete('tab')
      for (const k of KEYS) {
        const v = next[k]
        if (v) n.set(k, v)
        else n.delete(k)
      }
      return n
    }, { replace: opts?.replace })
  }, [setParams])
  return { path, go }
}
