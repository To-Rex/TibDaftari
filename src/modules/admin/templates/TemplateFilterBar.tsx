/** Gallery filters: document type, binding, category, service, language, paper and (all-branches view) branch. */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Branch, Category, PaperSize, ServiceType } from '@/domain'
import { buildCategoryTree, categoryPath, descendantIds, flattenTree } from '@/features/catalog/tree'
import { collationLocale, EMPTY_FILTERS, RECEIPT_PAPERS, RESULT_PAPERS, type GalleryFilters } from '@/features/template-editor/galleryFilters'
import type { TemplateKind } from '@/features/template-editor/kind'
import { cn } from '@/shared/lib/cn'
import { Select } from '@/shared/ui'

const LANGS = [['uz', 'O‘zbekcha'], ['ru', 'Русский'], ['en', 'English']] as const

export function TemplateFilterBar({ kind, value, onChange, services, categories, branches, showBranch, className }: {
  kind: TemplateKind
  value: GalleryFilters
  onChange: (f: GalleryFilters) => void
  services: ServiceType[]
  categories: Category[]
  branches: Branch[]
  /** the branch filter exists only while the top bar shows every branch */
  showBranch: boolean
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const F = 'catalog.templates.f'
  const lang = collationLocale(i18n.language)
  const set = <K extends keyof GalleryFilters>(k: K, v: GalleryFilters[K]) => onChange({ ...value, [k]: v })
  const catRows = useMemo(() => flattenTree(buildCategoryTree(categories), new Set(categories.map((c) => c.id))), [categories])
  // services grouped under their category path — only the chosen category's subtree when one is chosen
  const serviceGroups = useMemo(() => {
    const allowed = value.categoryId ? descendantIds(categories, value.categoryId) : null
    const groups = new Map<string, { label: string; items: ServiceType[] }>()
    for (const s of services) {
      if (allowed && !allowed.has(s.categoryId) && s.id !== value.serviceTypeId) continue
      const g = groups.get(s.categoryId) ?? { label: categoryPath(categories, s.categoryId).map((c) => c.name).join(' / ') || '—', items: [] }
      g.items.push(s)
      groups.set(s.categoryId, g)
    }
    const byName = (a: string, b: string) => a.localeCompare(b, lang, { sensitivity: 'base', numeric: true })
    return [...groups.values()].sort((a, b) => byName(a.label, b.label)).map((g) => ({ ...g, items: g.items.sort((a, b) => byName(a.name, b.name)) }))
  }, [services, categories, value.categoryId, value.serviceTypeId, lang])
  const papers = kind === 'receipt' ? RECEIPT_PAPERS : RESULT_PAPERS
  const paperLabel = (p: PaperSize) => (p.startsWith('Receipt') ? t('catalog.editor.receiptPaper', { mm: p.slice(7) }) : p)
  // a select whose value differs from "all" is tinted, so the active filters are visible at a glance
  const cls = (k: keyof GalleryFilters) => cn('h-9 w-full text-[13px] sm:w-auto sm:min-w-40 sm:max-w-64', value[k] !== EMPTY_FILTERS[k] && 'border-brand/60 bg-brand-soft/30 text-brand-ink')
  const pick = (k: keyof GalleryFilters, label: string) => ({ 'aria-label': label, title: label, 'data-filter': k, className: cls(k) })
  const onCategory = (categoryId: string) => {
    const svc = services.find((s) => s.id === value.serviceTypeId)
    // a chosen service outside the new category no longer fits — drop it
    const keep = !categoryId || !svc || descendantIds(categories, categoryId).has(svc.categoryId)
    onChange({ ...value, categoryId, serviceTypeId: keep ? value.serviceTypeId : '' })
  }

  return (
    <div className={cn('grid grid-cols-1 gap-2 xs:grid-cols-2 sm:flex sm:flex-wrap sm:items-center', className)} data-template-filters>
      {kind === 'result' && (
        <>
          <Select {...pick('scope', t(`${F}.scopeLabel`))} value={value.scope} onChange={(e) => set('scope', e.target.value as GalleryFilters['scope'])}>
            <option value="all">{t(`${F}.scopeAll`)}</option>
            <option value="item">{t('catalog.services.scopeItem')}</option>
            <option value="order">{t('catalog.services.scopeOrder')}</option>
          </Select>
          <Select {...pick('binding', t(`${F}.bindingLabel`))} value={value.binding} onChange={(e) => set('binding', e.target.value as GalleryFilters['binding'])}>
            <option value="all">{t(`${F}.bindingAll`)}</option>
            <option value="bound">{t(`${F}.bindingBound`)}</option>
            <option value="generic">{t(`${F}.bindingGeneric`)}</option>
          </Select>
          <Select {...pick('categoryId', t(`${F}.categoryLabel`))} value={value.categoryId} onChange={(e) => onCategory(e.target.value)}>
            <option value="">{t(`${F}.categoryAll`)}</option>
            {catRows.map((n) => <option key={n.cat.id} value={n.cat.id}>{' '.repeat(n.depth) + n.cat.name}</option>)}
          </Select>
          <Select {...pick('serviceTypeId', t(`${F}.serviceLabel`))} value={value.serviceTypeId} onChange={(e) => set('serviceTypeId', e.target.value)}>
            <option value="">{t(`${F}.serviceAll`)}</option>
            {serviceGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((s) => <option key={s.id} value={s.id}>{s.name}{s.code ? ` · ${s.code}` : ''}{s.isActive ? '' : ` (${t(`${F}.inactive`)})`}</option>)}
              </optgroup>
            ))}
          </Select>
        </>
      )}
      <Select {...pick('language', t(`${F}.languageLabel`))} value={value.language} onChange={(e) => set('language', e.target.value as GalleryFilters['language'])}>
        <option value="all">{t(`${F}.languageAll`)}</option>
        {LANGS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </Select>
      <Select {...pick('paper', t(`${F}.paperLabel`))} value={value.paper} onChange={(e) => set('paper', e.target.value as GalleryFilters['paper'])}>
        <option value="all">{t(`${F}.paperAll`)}</option>
        {papers.map((p) => <option key={p} value={p}>{paperLabel(p)}</option>)}
      </Select>
      {showBranch && branches.length > 1 && (
        <Select {...pick('branch', t(`${F}.branchLabel`))} value={value.branch} onChange={(e) => set('branch', e.target.value)}>
          <option value="all">{t('catalog.templates.allBranches')}</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          <option value="none">{t(`${F}.branchNone`)}</option>
        </Select>
      )}
    </div>
  )
}
