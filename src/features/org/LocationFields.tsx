import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Country } from '@/domain'
import { useCountries, useDistricts, useRegions } from '@/features/patients/queries'
import i18n, { langInfo, regionNames } from '@/shared/i18n'
import { toCyrillic, toNewLatin } from '@/shared/i18n/translit'
import { cn } from '@/shared/lib/cn'
import { Field, Select } from '@/shared/ui'

export interface LocationValue { countryId: string; regionId: string; districtId: string }

/**
 * A country's name in a language — the interface's by default. Uzbek, Russian and English use the names stored with
 * the country (falling back to the Uzbek one); Uzbek Cyrillic and the new Latin write the Uzbek name in their letters;
 * the other languages take the browser's own name for the country when it speaks them, else the stored name of their
 * content language. For a name that is SAVED (a new unit's name), pass the content language (`contentLocale()`).
 */
export function countryLabel(c: Country, lang: string = i18n.language): string {
  const info = langInfo(lang)
  const stored = (info.content === 'ru' ? c.nameRu : info.content === 'en' ? c.nameEn : c.name) || c.name
  if (info.code === 'uz' || info.code === 'ru' || info.code === 'en') return stored
  if (info.code === 'uz-Cyrl') return toCyrillic(c.name)
  if (info.code === 'uz-x-yangi') return toNewLatin(c.name)
  const names = c.code ? regionNames(info.code) : null
  const own = names && names.locale.split('-')[0]!.toLowerCase() === info.code ? names.of(c.code.toUpperCase()) : undefined
  return own || stored
}

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
      <Field label={t('org.country')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.countryId} disabled={disabled} onChange={(e) => { cleared.current = !e.target.value; onChange({ countryId: e.target.value, regionId: '', districtId: '' }) }}>
            <option value="">{t('common.select')}</option>
            {countries.data?.map((c) => <option key={c.id} value={c.id}>{countryLabel(c)}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('org.region')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.regionId} disabled={disabled || !value.countryId} onChange={(e) => onChange({ ...value, regionId: e.target.value, districtId: '' })}>
            <option value="">{t('common.select')}</option>
            {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        )}
      </Field>
      <Field label={t('org.district')} optionalText={t('common.optional')}>
        {(id) => (
          <Select id={id} value={value.districtId} disabled={disabled || !value.regionId || noDistricts} onChange={(e) => onChange({ ...value, districtId: e.target.value })}>
            <option value="">{noDistricts ? t('org.noDistricts') : t('common.select')}</option>
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
