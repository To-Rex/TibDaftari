import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { Branch, Category, ServiceType } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Field, SearchInput, Segmented, Select } from '@/shared/ui'
import { categoryPath } from '@/features/catalog/tree'

export interface Bindings { serviceTypeIds: string[]; categoryIds: string[]; branchIds: string[]; scope: 'item' | 'order' | 'receipt'; language: 'uz' | 'ru' | 'en' }

/** Shared form body: bind template to service types (searchable multi-select) / categories, scope, language. */
export function BindingsFields({ value, onChange, serviceTypes, categories, branches, kind, branchError }: {
  value: Bindings; onChange: (b: Bindings) => void; serviceTypes: ServiceType[]; categories: Category[]; branches?: Branch[]
  /** shown under the branch picker (e.g. "choose a branch" on create) */
  branchError?: string
  /** which library the template belongs to: a cheque keeps its scope, a result document picks item/order (default: from the scope) */
  kind?: 'result' | 'receipt'
}) {
  const { t } = useTranslation()
  const receipt = (kind ?? (value.scope === 'receipt' ? 'receipt' : 'result')) === 'receipt'
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return serviceTypes.filter((st) => !s || st.name.toLowerCase().includes(s) || (st.code ?? '').toLowerCase().includes(s)).slice(0, 80)
  }, [serviceTypes, q])
  const toggle = (id: string) => onChange({ ...value, serviceTypeIds: value.serviceTypeIds.includes(id) ? value.serviceTypeIds.filter((x) => x !== id) : [...value.serviceTypeIds, id] })
  const toggleCat = (id: string) => onChange({ ...value, categoryIds: value.categoryIds.includes(id) ? value.categoryIds.filter((x) => x !== id) : [...value.categoryIds, id] })
  // a template belongs to ONE branch (each branch owns its templates); picking another chip moves it there
  const pickBranch = (id: string) => onChange({ ...value, branchIds: [id] })
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {receipt
          ? <Field label={t('catalog.templates.scope')}>{() => <div className="flex h-10 items-center"><Badge tone="accent">{t('catalog.services.scopeReceipt')}</Badge></div>}</Field>
          : <Field label={t('catalog.templates.scope')}>{() => <Segmented value={value.scope} onChange={(v) => onChange({ ...value, scope: v })} items={[{ value: 'item', label: t('catalog.services.scopeItem') }, { value: 'order', label: t('catalog.services.scopeOrder') }]} />}</Field>}
        <Field label={t('common.language')}>{(id) => (
          <Select id={id} value={value.language} onChange={(e) => onChange({ ...value, language: e.target.value as Bindings['language'] })}>
            <option value="uz">O‘zbekcha</option><option value="ru">Русский</option><option value="en">English</option>
          </Select>
        )}</Field>
      </div>
      {branches && branches.length > 1 && (
        <Field label={t('catalog.templates.bindBranch')} hint={t('catalog.templates.bindBranchHint')} error={branchError}>{() => (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" data-branch-picker>
            {branches.map((b) => { const on = (value.branchIds ?? []).includes(b.id); return (
              <button key={b.id} type="button" onClick={() => pickBranch(b.id)} role="radio" aria-checked={on}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors', on ? 'border-brand bg-brand-soft/60 text-brand-ink' : 'border-line hover:border-line-strong text-ink-2')}>
                {on && <Check className="size-3.5" />}{b.name}
              </button>
            ) })}
          </div>
        )}</Field>
      )}
      {value.scope === 'receipt' && <p className="rounded-[var(--radius)] border border-dashed border-line px-3 py-2 text-[12.5px] text-ink-3">{t('catalog.templates.receiptHint')}</p>}
      {value.scope !== 'receipt' && <Field label={t('catalog.templates.bindServices')} hint={t('catalog.templates.bindServicesHint')}>{() => (
        <div className="rounded-[var(--radius)] border border-line overflow-hidden">
          <div className="p-2 border-b border-line bg-surface-2/40 flex items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder={t('catalog.services.searchPh')} className="h-9" />
            <Badge size="sm" tone={value.serviceTypeIds.length ? 'brand' : 'neutral'}>{value.serviceTypeIds.length ? t('catalog.templates.nBound', { n: value.serviceTypeIds.length }) : t('catalog.services.generic')}</Badge>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {list.map((st) => { const on = value.serviceTypeIds.includes(st.id); return (
              <button key={st.id} type="button" onClick={() => toggle(st.id)} className={cn('w-full flex items-center gap-2 h-9 px-2 rounded-lg text-left text-[13px] transition-colors', on ? 'bg-brand-soft/60 text-brand-ink' : 'hover:bg-surface-2')}>
                <span className={cn('grid size-4 place-items-center rounded border', on ? 'bg-brand border-brand text-white' : 'border-line-strong')}>{on && <Check className="size-3" />}</span>
                <span className="truncate flex-1">{st.name}</span>
                {st.code && <span className="font-mono text-[11px] text-ink-3">{st.code}</span>}
              </button>
            ) })}
            {list.length === 0 && <p className="px-2 py-3 text-[12.5px] text-ink-3">{t('common.empty')}</p>}
          </div>
        </div>
      )}</Field>}
      {!receipt && <Field label={t('catalog.templates.bindCategories')}>{() => (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => { const on = value.categoryIds.includes(c.id); return (
            <button key={c.id} type="button" onClick={() => toggleCat(c.id)} className={cn('h-7 rounded-full border px-2.5 text-[12.5px] transition-colors', on ? 'bg-brand-soft border-brand/40 text-brand-ink' : 'border-line text-ink-2 hover:bg-surface-2')} title={categoryPath(categories, c.id).map((x) => x.name).join(' / ')}>{c.name}</button>
          ) })}
        </div>
      )}</Field>}
    </div>
  )
}
