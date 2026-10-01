/**
 * Which services of the branch print a result document: the services with no template at all (approval cannot
 * issue a document) and those falling back to a template not bound to them — each with "create a template for
 * it" and "show the templates that fit it".
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ListFilter, Plus, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Category, ServiceType } from '@/domain'
import { categoryPath } from '@/features/catalog/tree'
import type { Coverage } from '@/features/template-editor/galleryFilters'
import { cn } from '@/shared/lib/cn'
import { Button, IconButton } from '@/shared/ui'

export function TemplateCoverage({ coverage, categories, canWrite, onCreate, onFilter }: {
  coverage: Coverage
  categories: Category[]
  canWrite: boolean
  onCreate: (s: ServiceType) => void
  onFilter: (s: ServiceType) => void
}) {
  const { t } = useTranslation()
  const V = 'catalog.templates.cov'
  const [open, setOpen] = useState(false)
  const total = coverage.needing.length
  if (!total) return null
  const missing = coverage.missing.length
  const fallback = coverage.fallback.length
  const tone = missing ? 'warn' : fallback ? 'info' : 'ok'
  const pct = Math.round((coverage.direct / total) * 100)
  const title = missing ? t(`${V}.missing`, { n: missing }) : fallback ? t(`${V}.fallback`, { n: fallback }) : t(`${V}.ok`, { n: total })
  const hint = missing ? t(`${V}.missingHint`) : fallback ? t(`${V}.fallbackHint`) : null

  const row = (s: ServiceType) => (
    <li key={s.id} className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{s.name}{s.code ? <span className="ml-1.5 font-mono text-[11px] font-normal text-ink-3">{s.code}</span> : null}</span>
        <span className="block truncate text-[11.5px] text-ink-3">{categoryPath(categories, s.categoryId).map((c) => c.name).join(' / ')}</span>
      </span>
      <IconButton size="sm" label={t(`${V}.filter`)} title={t(`${V}.filter`)} onClick={() => onFilter(s)}><ListFilter /></IconButton>
      {canWrite && <Button size="xs" variant="secondary" leftIcon={<Plus className="size-3.5" />} onClick={() => onCreate(s)}>{t(`${V}.create`)}</Button>}
    </li>
  )

  return (
    <section data-template-coverage={tone} className={cn('mb-4 rounded-[var(--radius-lg)] border px-4 py-3', tone === 'warn' ? 'border-warn/40 bg-warn-soft/40' : tone === 'info' ? 'border-info/30 bg-info-soft/40' : 'border-line bg-surface')}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', tone === 'warn' ? 'bg-warn-soft text-warn' : tone === 'info' ? 'bg-info-soft text-info' : 'bg-ok-soft text-ok')}>
          {tone === 'ok' ? <ShieldCheck className="size-4" /> : <TriangleAlert className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">{title}</p>
          {hint && <p className="text-[12px] text-ink-3">{hint}</p>}
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-3" title={t(`${V}.progress`, { n: coverage.direct, total })}>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-2"><span className={cn('block h-full rounded-full', missing ? 'bg-warn' : 'bg-ok')} style={{ width: `${pct}%` }} /></span>
          <span className="tabular">{coverage.direct}/{total}</span>
        </div>
        {(missing > 0 || fallback > 0) && (
          <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} rightIcon={<ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />} aria-expanded={open}>
            {open ? t(`${V}.hide`) : t(`${V}.show`)}
          </Button>
        )}
      </div>
      {open && (
        <div className="mt-3 grid gap-4 border-t border-line/70 pt-3 md:grid-cols-2">
          {missing > 0 && (
            <div className="min-w-0">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-warn">{t(`${V}.missingList`)} · {missing}</p>
              <ul className="max-h-72 divide-y divide-line/60 overflow-y-auto pr-1">{coverage.missing.map(row)}</ul>
            </div>
          )}
          {fallback > 0 && (
            <div className="min-w-0">
              <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-info">{t(`${V}.fallbackList`)} · {fallback}</p>
              <ul className="max-h-72 divide-y divide-line/60 overflow-y-auto pr-1">{coverage.fallback.map(row)}</ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
