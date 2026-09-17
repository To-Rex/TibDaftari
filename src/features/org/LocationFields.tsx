import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Country } from '@/domain'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import { currentLocale } from '@/shared/i18n'
import { cn } from '@/shared/lib/cn'
import { Field, Select } from '@/shared/ui'

export interface LocationValue { countryId: string; regionId: string; districtId: string }

/** Country name in the UI language (falls back to the Uzbek name). */
export const countryLabel = (c: Country, locale = currentLocale()): string => (locale === 'ru' ? c.nameRu : locale === 'en' ? c.nameEn : c.name) || c.name

/**
 * Country → region (viloyat / city) → district cascading selects. Changing a parent clears its children;
 * empty string = not set. `preselectCountryCode` picks that country once for a blank value (new records)
 * unless the user cleared the country themselves.
 */
export function LocationFields({ value, onChange, disabled, preselectCountryCode, className }: {
  value: LocationValue; onChange: (v: LocationValue) => void; disabled?: boolean; preselectCountryCode?: string; className?: string
}) {
  const { t } = useTranslation()
  const countries = useCountries()
  const regions = useRegions(value.countryId || undefined, { enabled: !!value.countryId })
  const districts = useDistricts(value.regionId || undefined, { enabled: !!value.regionId })
  const cleared = useRef(false)
  useEffect(() => {
    if (cleared.current || value.countryId || !preselectCountryCode || !countries.data) return
    const c = countries.data.find((x) => x.code === preselectCountryCode)
    if (c) onChange({ countryId: c.id, regionId: '', districtId: '' })
  }, [countries.data, preselectCountryCode, value.countryId, onChange])
  const noDistricts = !!value.regionId && districts.isSuccess && districts.data.length === 0
  return (
    <div className={cn('grid gap-4 sm:grid-cols-3', className)}>
      <Field label={t('admin.company.country')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.countryId} disabled={disabled} onChange={(e) => { cleared.current = !e.target.value; onChange({ countryId: e.target.value, regionId: '', districtId: '' }) }}>
            <option value="">{t('common.select')}</option>
            {countries.data?.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('admin.company.region')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.regionId} disabled={disabled || !value.countryId} onChange={(e) => onChange({ ...value, regionId: e.target.value, districtId: '' })}>
            <option value="">{t('common.select')}</option>
            {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('admin.company.district')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.districtId} disabled={disabled || !value.regionId || noDistricts} onChange={(e) => onChange({ ...value, districtId: e.target.value })}>
            <option value="">{noDistricts ? t('admin.company.noDistricts') : t('common.select')}</option>
            {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        )}
      </Field>
    </div>
  )
}

/** "Country, region, district" for lists; empty when nothing is set. */
export const locationText = (c: { countryName?: string | null; regionName?: string | null; districtName?: string | null }): string =>
  [c.countryName, c.regionName, c.districtName].filter(Boolean).join(', ')
