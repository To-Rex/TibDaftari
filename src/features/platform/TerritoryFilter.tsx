/** Country → region → district as three compact selects (a toolbar filter; `LocationFields` is the form version). */
import { useTranslation } from 'react-i18next'
import type { TerritoryScope } from '@/domain'
import { countryLabel } from '@/features/org/LocationFields'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { cn } from '@/shared/lib/cn'
import { Select } from '@/shared/ui'

export function TerritoryFilter({ value, onChange, allCountriesLabel, className }: {
  value: TerritoryScope
  onChange: (v: TerritoryScope) => void
  /** the empty country option (default: the generic "all") */
  allCountriesLabel?: string
  className?: string
}) {
  const { t } = useTranslation()
  const countries = useCountries()
  const regions = useRegions(value.countryId, { enabled: !!value.countryId })
  const districts = useDistricts(value.regionId, { enabled: !!value.regionId })
  const noDistricts = !!value.regionId && districts.isSuccess && districts.data.length === 0
  const select = 'w-full sm:w-auto sm:min-w-[160px]'
  return (
    <div className={cn('grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center', className)} data-territory-filter>
      <Select aria-label={t('admin.company.country')} value={value.countryId ?? ''} className={select} data-territory="country"
        onChange={(e) => onChange({ countryId: e.target.value || undefined })}>
        <option value="">{allCountriesLabel ?? t('admin.platform.filters.allCountries')}</option>
        {countries.data?.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)}</option>)}
      </Select>
      <Select aria-label={t('admin.company.region')} value={value.regionId ?? ''} disabled={!value.countryId} className={select} data-territory="region"
        onChange={(e) => onChange({ countryId: value.countryId, regionId: e.target.value || undefined })}>
        <option value="">{t('admin.platform.filters.allRegions')}</option>
        {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </Select>
      <Select aria-label={t('admin.company.district')} value={value.districtId ?? ''} disabled={!value.regionId || noDistricts} className={select} data-territory="district"
        onChange={(e) => onChange({ ...value, districtId: e.target.value || undefined })}>
        <option value="">{noDistricts ? t('admin.company.noDistricts') : t('admin.platform.filters.allDistricts')}</option>
        {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
    </div>
  )
}
