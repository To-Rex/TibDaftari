import { format, formatDistanceToNowStrict, parseISO, differenceInYears, differenceInMonths } from 'date-fns'
import { uz, ru, enGB } from 'date-fns/locale'
import i18n, { currentLocale, INTL_LOCALE } from '@/shared/i18n'

const dfLocale = () => ({ uz, ru, en: enGB })[currentLocale()]

export const fmtMoney = (v: number | undefined | null, withCurrency = true) => {
  if (v == null) return '—'
  const s = new Intl.NumberFormat(INTL_LOCALE[currentLocale()], { maximumFractionDigits: 0 }).format(v)
  return withCurrency ? `${s} ${i18n.t('common.sum')}` : s
}
export const fmtNumber = (v: number) => new Intl.NumberFormat(INTL_LOCALE[currentLocale()]).format(v)
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
