import { format, formatDistanceToNowStrict, parseISO, differenceInYears, differenceInMonths } from 'date-fns'
import i18n, { intlLocale, uiLang } from '@/shared/i18n'
import { DATE_LOCALES } from '@/shared/i18n/dateLocales'

/** month / weekday names and relative times in the interface language */
const dfLocale = () => DATE_LOCALES[uiLang()]

export const fmtMoney = (v: number | undefined | null, withCurrency = true) => {
  if (v == null) return '—'
  const s = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 0 }).format(v)
  return withCurrency ? `${s} ${i18n.t('common.sum')}` : s
}
export const fmtNumber = (v: number) => new Intl.NumberFormat(intlLocale()).format(v)
/**
 * A sum for a glance where the room is small: up to 999 999 in full, then «48,6 mln», «1,99 mlrd» (three significant
 * digits, the locale's words) — the exact amount belongs in a tooltip next to it.
 */
export const fmtMoneyShort = (v: number | undefined | null) => {
  if (v == null) return '—'
  const loc = intlLocale()
  const abs = Math.abs(v)
  if (abs < 1_000_000) return new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(v)
  const [div, key] = abs >= 1e12 ? [1e12, 'trillionShort'] : abs >= 1e9 ? [1e9, 'billionShort'] : [1e6, 'millionShort']
  return i18n.t(`common.${key}`, { n: new Intl.NumberFormat(loc, { maximumSignificantDigits: 3 }).format(v / div) })
}
export const fmtDate = (iso?: string | null, pattern = 'dd.MM.yyyy') => (iso ? format(parseISO(iso), pattern, { locale: dfLocale() }) : '—')
export const fmtDateTime = (iso?: string | null) => fmtDate(iso, 'dd.MM.yyyy HH:mm')
export const fmtTime = (iso?: string | null) => fmtDate(iso, 'HH:mm')
export const fmtRelative = (iso?: string | null) => (iso ? formatDistanceToNowStrict(parseISO(iso), { addSuffix: true, locale: dfLocale() }) : '—')
export const fmtPhone = (p?: string | null) => {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('998')) return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)}-${d.slice(8, 10)}-${d.slice(10)}`
  return p
}
export const ageFrom = (birth?: string | null) => (birth ? differenceInYears(new Date(), parseISO(birth)) : undefined)
export const ageMonthsFrom = (birth?: string | null) => (birth ? differenceInMonths(new Date(), parseISO(birth)) : undefined)
export const isoDay = (d = new Date()) => format(d, 'yyyy-MM-dd')
export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('')
