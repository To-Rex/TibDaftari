/** The extra filters in use, one chip each (× removes it), and the filtered cheques at a glance. */
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import type { Category, OrderSummary, ServiceType } from '@/domain'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { EMPTY_EXTRA, type ExtraFilters } from './ordersFilters'
import { paymentMethodLabel } from './status'

const O = 'staff.orders'

export function OrdersFilterChips({ value, onChange, categories, services, summary }: {
  value: ExtraFilters
  onChange: (next: ExtraFilters) => void
  categories?: Category[]
  services?: ServiceType[]
  summary?: OrderSummary
}) {
  const { t } = useTranslation()
  const chips: { key: string; label: string; clear: Partial<ExtraFilters> }[] = []
  if (value.methods.length) chips.push({ key: 'methods', label: t(`${O}.chipMethod`, { v: value.methods.map(paymentMethodLabel).join(', ') }), clear: { methods: [] } })
  if (value.minTotal != null || value.maxTotal != null) {
    const v = value.minTotal != null && value.maxTotal != null ? `${fmtMoney(value.minTotal, false)} – ${fmtMoney(value.maxTotal, false)}` : value.minTotal != null ? `≥ ${fmtMoney(value.minTotal, false)}` : `≤ ${fmtMoney(value.maxTotal ?? 0, false)}`
    chips.push({ key: 'amount', label: t(`${O}.chipAmount`, { v }), clear: { minTotal: undefined, maxTotal: undefined } })
  }
  if (value.debt != null) chips.push({ key: 'debt', label: value.debt ? t(`${O}.debtYes`) : t(`${O}.debtNo`), clear: { debt: undefined } })
  if (value.discount != null) chips.push({ key: 'discount', label: value.discount ? t(`${O}.discountYes`) : t(`${O}.discountNo`), clear: { discount: undefined } })
  if (value.categoryId) chips.push({ key: 'category', label: `${t(`${O}.category`)}: ${categories?.find((c) => c.id === value.categoryId)?.name ?? '…'}`, clear: { categoryId: undefined, serviceTypeId: undefined } })
  if (value.serviceTypeId) chips.push({ key: 'service', label: `${t(`${O}.service`)}: ${services?.find((s) => s.id === value.serviceTypeId)?.name ?? '…'}`, clear: { serviceTypeId: undefined } })
  if (value.results) chips.push({ key: 'results', label: `${t(`${O}.results`)}: ${t(`${O}.results${value.results[0]!.toUpperCase()}${value.results.slice(1)}`)}`, clear: { results: undefined } })
  if (value.minItems != null || value.maxItems != null) {
    const v = value.minItems != null && value.maxItems != null ? `${value.minItems} – ${value.maxItems}` : value.minItems != null ? `≥ ${value.minItems}` : `≤ ${value.maxItems}`
    chips.push({ key: 'items', label: `${t(`${O}.items`)}: ${v}`, clear: { minItems: undefined, maxItems: undefined } })
  }
  if (value.refunded != null) chips.push({ key: 'refunded', label: value.refunded ? t(`${O}.refundedYes`) : t(`${O}.refundedNo`), clear: { refunded: undefined } })
  if (value.createdBy) chips.push({ key: 'createdBy', label: `${t(`${O}.createdBy`)}: ${summary?.cashiers.find((c) => c.id === value.createdBy)?.name ?? '…'}`, clear: { createdBy: undefined } })
  if (!chips.length) return null
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" data-orders-chips>
      {chips.map((c) => (
        <span key={c.key} className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-brand/40 bg-brand-soft/60 pl-3 pr-1 text-[12.5px] font-medium text-brand-ink" data-chip={c.key}>
          <span className="truncate">{c.label}</span>
          <button type="button" onClick={() => onChange({ ...value, ...c.clear })} className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-brand/15" aria-label={t(`${O}.removeFilter`)}><X className="size-3.5" /></button>
        </span>
      ))}
      <button type="button" onClick={() => onChange(EMPTY_EXTRA)} className="h-8 rounded-full px-2.5 text-[12.5px] font-medium text-ink-3 hover:text-ink" data-chips-clear>{t(`${O}.clearAll`)}</button>
    </div>
  )
}

export function OrdersSummaryBar({ summary }: { summary?: OrderSummary }) {
  const { t } = useTranslation()
  if (!summary) return null
  const item = (label: string, value: string, tone?: string, key?: string) => (
    <span className="inline-flex items-baseline gap-1.5" data-sum={key}>
      <span className="text-ink-3">{label}</span>
      <span className={`font-semibold tabular ${tone ?? 'text-ink'}`}>{value}</span>
    </span>
  )
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-[var(--radius)] border border-line bg-surface px-4 py-2.5 text-[13px]" title={t(`${O}.sumNote`)} data-orders-summary>
      {item(t(`${O}.sumCount`), fmtNumber(summary.count), undefined, 'count')}
      {item(t(`${O}.sumTotal`), fmtMoney(summary.total, false), undefined, 'total')}
      {item(t(`${O}.sumPaid`), fmtMoney(summary.paid, false), 'text-ok', 'paid')}
      {item(t(`${O}.sumDebt`), fmtMoney(summary.debt, false), summary.debt > 0 ? 'text-warn' : undefined, 'debt')}
      {summary.methods.length > 0 && <span className="hidden h-4 w-px bg-line sm:inline-block" />}
      {summary.methods.map((m) => item(paymentMethodLabel(m.method), fmtMoney(m.amount, false), 'text-ink-2', `method-${m.method}`))}
    </div>
  )
}
