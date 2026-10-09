/** "Filtrlar" panel of the cheque list: payment method, amount, debt, discount, department, service, cashier. */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { Category, OrderSummary, ServiceType } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtNumber } from '@/shared/lib/format'
import { Button, Drawer, Field, Input, Segmented, Select } from '@/shared/ui'
import { categoryWithChildren, EMPTY_EXTRA, type ExtraFilters } from './ordersFilters'
import { PAYMENT_METHODS, paymentMethodLabel } from './status'

const O = 'staff.orders'
type Tri = 'all' | 'yes' | 'no'
const tri = (v: boolean | undefined): Tri => (v === true ? 'yes' : v === false ? 'no' : 'all')
const fromTri = (v: Tri): boolean | undefined => (v === 'yes' ? true : v === 'no' ? false : undefined)
const num = (s: string): number | undefined => { const d = s.replace(/\D/g, ''); return d ? Number(d) : undefined }

export function OrdersFilterDrawer({ open, onClose, value, onChange, categories, services, summary }: {
  open: boolean
  onClose: () => void
  value: ExtraFilters
  onChange: (next: ExtraFilters) => void
  categories?: Category[]
  services?: ServiceType[]
  summary?: OrderSummary
}) {
  const { t } = useTranslation()
  const set = (patch: Partial<ExtraFilters>) => onChange({ ...value, ...patch })

  // departments as a tree (sub-departments indented under their parent)
  const catOptions = useMemo(() => {
    const list = categories ?? []
    const out: { id: string; label: string }[] = []
    const walk = (parent: string | null, depth: number) => {
      for (const c of list.filter((x) => (x.parentId ?? null) === parent).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))) {
        out.push({ id: c.id, label: `${'— '.repeat(depth)}${c.name}` })
        walk(c.id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  }, [categories])
  // services of the chosen department only
  const svcOptions = useMemo(() => {
    const ids = value.categoryId ? new Set(categoryWithChildren(categories, value.categoryId)) : null
    return (services ?? []).filter((s) => !ids || ids.has(s.categoryId)).sort((a, b) => a.name.localeCompare(b.name))
  }, [services, categories, value.categoryId])

  return (
    <Drawer open={open} onClose={onClose} title={t(`${O}.filtersTitle`)} description={t(`${O}.filtersHint`)} width="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={() => onChange(EMPTY_EXTRA)} data-orders-filters-reset>{t(`${O}.reset`)}</Button>
        <Button onClick={onClose} data-orders-filters-apply>{summary ? t(`${O}.showN`, { n: fmtNumber(summary.count) }) : t('common.close')}</Button>
      </>}>
      <div className="flex flex-col gap-5" data-orders-filters>
        <Field label={t(`${O}.method`)} hint={t(`${O}.methodHint`)}>
          {() => (
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((m) => {
                const on = value.methods.includes(m)
                return (
                  <button key={m} type="button" aria-pressed={on} onClick={() => set({ methods: on ? value.methods.filter((x) => x !== m) : [...value.methods, m] })} data-method={m}
                    className={cn('inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors', on ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong')}>
                    {on && <Check className="size-3.5" />}{paymentMethodLabel(m)}
                  </button>
                )
              })}
            </div>
          )}
        </Field>
        <Field label={t(`${O}.amount`)}>
          {(id) => (
            <div className="flex items-center gap-2">
              <Input id={id} inputMode="numeric" placeholder={t(`${O}.amountFrom`)} value={value.minTotal != null ? String(value.minTotal) : ''} onChange={(e) => set({ minTotal: num(e.target.value) })} className="tabular" data-min-total />
              <span className="text-ink-3">–</span>
              <Input inputMode="numeric" placeholder={t(`${O}.amountTo`)} value={value.maxTotal != null ? String(value.maxTotal) : ''} onChange={(e) => set({ maxTotal: num(e.target.value) })} className="tabular" data-max-total />
            </div>
          )}
        </Field>
        <Field label={t(`${O}.debt`)}>
          {() => <Segmented<Tri> size="sm" value={tri(value.debt)} onChange={(v) => set({ debt: fromTri(v) })} className="max-w-full flex-wrap" items={[{ value: 'all', label: t(`${O}.any`) }, { value: 'yes', label: t(`${O}.debtYes`) }, { value: 'no', label: t(`${O}.debtNo`) }]} />}
        </Field>
        <Field label={t(`${O}.discount`)}>
          {() => <Segmented<Tri> size="sm" value={tri(value.discount)} onChange={(v) => set({ discount: fromTri(v) })} className="max-w-full flex-wrap" items={[{ value: 'all', label: t(`${O}.any`) }, { value: 'yes', label: t(`${O}.discountYes`) }, { value: 'no', label: t(`${O}.discountNo`) }]} />}
        </Field>
        <Field label={t(`${O}.category`)}>
          {(id) => (
            <Select id={id} value={value.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value || undefined, serviceTypeId: undefined })} data-category>
              <option value="">{t(`${O}.any`)}</option>
              {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t(`${O}.service`)}>
          {(id) => (
            <Select id={id} value={value.serviceTypeId ?? ''} onChange={(e) => set({ serviceTypeId: e.target.value || undefined })} data-service>
              <option value="">{t(`${O}.any`)}</option>
              {svcOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t(`${O}.createdBy`)} hint={t(`${O}.createdByHint`)}>
          {(id) => (
            <Select id={id} value={value.createdBy ?? ''} onChange={(e) => set({ createdBy: e.target.value || undefined })} data-created-by>
              <option value="">{t(`${O}.any`)}</option>
              {(summary?.cashiers ?? []).map((c) => <option key={c.id} value={c.id}>{c.name} · {fmtNumber(c.count)}</option>)}
            </Select>
          )}
        </Field>
      </div>
    </Drawer>
  )
}
