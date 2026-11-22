/**
 * The territory the platform pages look at, kept in the URL (`?company=&country=&region=&district=`) so a
 * drill-down is a link and the browser's back button walks up again. An administrator below the country level never
 * stores the country: it follows from their own unit. `company` (superadmin) narrows everything to one company.
 */
import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Id, TerritoryScope } from '@/domain'

/** `country=all` = every country (the regions tab otherwise defaults to the platform's own country). */
export const ALL_COUNTRIES = 'all'

export function useTerritoryParams() {
  const [params, setParams] = useSearchParams()
  const scope = useMemo<TerritoryScope & { allCountries: boolean; companyId?: Id }>(() => {
    const country = params.get('country') ?? ''
    return {
      companyId: params.get('company') || undefined,
      countryId: country && country !== ALL_COUNTRIES ? country : undefined,
      regionId: params.get('region') || undefined,
      districtId: params.get('district') || undefined,
      allCountries: country === ALL_COUNTRIES,
    }
  }, [params])
  const setScope = useCallback((next: TerritoryScope, opts?: { allCountries?: boolean; extra?: Record<string, string | null> }) => {
    setParams((p) => {
      const n = new URLSearchParams(p)
      const put = (k: string, v: string | null | undefined) => (v ? n.set(k, v) : n.delete(k))
      put('country', opts?.allCountries ? ALL_COUNTRIES : next.countryId)
      put('region', next.regionId)
      put('district', next.districtId)
      for (const [k, v] of Object.entries(opts?.extra ?? {})) put(k, v)
      return n
    })
  }, [setParams])
  /** another company (or all of them): the territory below starts over */
  const setCompany = useCallback((companyId: Id | undefined) => {
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (companyId) n.set('company', companyId)
      else n.delete('company')
      for (const k of ['country', 'region', 'district']) n.delete(k)
      return n
    })
  }, [setParams])
  return { scope, setScope, setCompany, params, setParams }
}
