/**
 * Steps 4–5 of the quick-start wizard: the catalogue (what is inherited, which sample facility's working set is
 * copied, who owns the copies, the cheque) and the review before the one request goes out.
 */
import { useTranslation } from 'react-i18next'
import { Check, Copy, FolderTree, Hospital, Layers, ReceiptText, Users } from 'lucide-react'
import type { OrgUnit, QuickStartOwner, QuickStartPreview, QuickStartSample } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Segmented, Skeleton, Switch } from '@/shared/ui'
import { UnitIcon, useUnitLabels } from '../unitUi'
import { countsSummary, type Draft } from './draft'

type Patch = (fn: (d: Draft) => Draft) => void
type CountKey = 'categories' | 'serviceTypes' | 'schemas' | 'templates' | 'receipts'

/* ------------------------------------------------------------------ 4. catalogue */

export function CatalogStep({ draft, patch, preview, loading }: { draft: Draft; patch: Patch; preview: QuickStartPreview | undefined; loading: boolean }) {
  const { t } = useTranslation()
  const label = (k: CountKey) => t(`admin.quickStart.counts.${k}`)
  const inherits = preview?.inherits
  const inheritsAny = !!inherits && Object.values(inherits).some((n) => n > 0)
  const sample = preview?.samples.find((s) => s.id === draft.sampleId) ?? null
  const sampleCard = (s: QuickStartSample | null) => {
    const on = s ? draft.sampleId === s.id : draft.sampleId === null
    return (
      <button key={s?.id ?? 'none'} type="button" role="radio" aria-checked={on} onClick={() => patch((d) => ({ ...d, sampleId: s ? s.id : null }))} data-qs-sample={s?.id ?? 'none'}
        className={cn('flex w-full items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 text-left transition-colors', on ? 'border-brand bg-brand-soft/40' : 'border-line hover:border-line-strong hover:bg-surface-2/60')}>
        <span className={cn('mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border', on ? 'border-brand bg-brand text-white' : 'border-line-strong')}>{on && <Check className="size-3" />}</span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13.5px] font-medium">
            {s ? <><UnitIcon unit={{ level: 'facility', kind: s.kind }} className="text-ink-3" /><span className="truncate">{s.name}</span>{s.code && <span className="font-mono text-[11.5px] font-normal text-ink-3">{s.code}</span>}</> : t('admin.quickStart.noSample')}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink-3">{s ? countsSummary(s.counts, label) || '—' : t('admin.quickStart.noSampleHint')}</span>
          {s?.sameCatalogue && <Badge size="sm" tone="info" className="mt-1.5">{t('admin.quickStart.sameCatalogue')}</Badge>}
        </span>
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-5" data-qs-step="catalog">
      {/* inherited */}
      <section className={cn('rounded-[var(--radius)] border px-3.5 py-3', inheritsAny ? 'border-ok/40 bg-ok-soft/40' : 'border-warn/40 bg-warn-soft/40')} data-qs-inherits>
        <div className="flex items-center gap-2 text-[13.5px] font-semibold"><Layers className="size-4" />{t('admin.quickStart.inheritsTitle')}</div>
        {loading ? <Skeleton className="mt-2 h-5 w-2/3" /> : inheritsAny
          ? <><p className="mt-1 text-[13px]">{countsSummary(inherits!, label)}</p>{!!preview?.inheritsFrom.length && <p className="text-[12px] text-ink-3">{t('admin.quickStart.inheritsFrom', { names: preview.inheritsFrom.join(', ') })}</p>}</>
          : <p className="mt-1 text-[12.5px] text-ink-2">{t('admin.quickStart.inheritsNone')}</p>}
      </section>

      {/* the sample */}
      <section>
        <div className="flex items-center gap-2 text-[14px] font-semibold"><Copy className="size-4 text-ink-3" />{t('admin.quickStart.sampleTitle')}</div>
        <p className="mt-0.5 text-[12.5px] text-ink-3">{t('admin.quickStart.sampleHint')}</p>
        <div role="radiogroup" className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {loading ? [0, 1].map((i) => <Skeleton key={i} className="h-16" />) : (
            <>
              {preview?.samples.map((s) => sampleCard(s))}
              {sampleCard(null)}
            </>
          )}
        </div>
        {!loading && preview && preview.samples.length === 0 && <p className="mt-2 text-[12.5px] text-ink-3">{t('admin.quickStart.noSamples')}</p>}
      </section>

      {sample && !sample.sameCatalogue && (
        <section data-qs-owner>
          <div className="text-[13.5px] font-semibold">{t('admin.quickStart.owner')}</div>
          <p className="mb-2 mt-0.5 text-[12.5px] text-ink-3">{t('admin.quickStart.ownerHint')}</p>
          <Segmented<QuickStartOwner> size="sm" value={draft.owner} onChange={(v) => patch((d) => ({ ...d, owner: v }))}
            items={[{ value: 'region', label: t('admin.quickStart.ownerRegion') }, { value: 'district', label: t('admin.quickStart.ownerDistrict') }, { value: 'facility', label: t('admin.quickStart.ownerFacility') }]} />
        </section>
      )}

      <Switch checked={draft.activateReceipt} onChange={(v) => patch((d) => ({ ...d, activateReceipt: v }))} label={t('admin.quickStart.activateReceipt')} description={t('admin.quickStart.activateReceiptHint')} />
    </div>
  )
}

/* ------------------------------------------------------------------ 5. review */

export function ReviewStep({ draft, parent, preview, units, regionName, districtName }: { draft: Draft; parent: OrgUnit | null; preview: QuickStartPreview | undefined; units: OrgUnit[]; regionName?: string; districtName?: string }) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const label = (k: CountKey) => t(`admin.quickStart.counts.${k}`)
  const sample = preview?.samples.find((s) => s.id === draft.sampleId) ?? null
  const roles = (preview?.roles ?? []).filter((r) => draft.staff[r.key]?.on)
  const newRegion = parent?.level === 'country' && draft.regionId && !units.some((u) => u.level === 'region' && u.parentId === parent.id && u.regionId === draft.regionId)
  const newDistrict = parent && parent.level !== 'district' && draft.districtId && !units.some((u) => u.level === 'district' && u.districtId === draft.districtId)
  const row = (icon: React.ReactNode, title: string, body: React.ReactNode) => (
    <div className="flex gap-3 border-b border-line/70 py-3 last:border-b-0">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-2 [&>svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{title}</div>
        <div className="mt-0.5 text-[13.5px]">{body}</div>
      </div>
    </div>
  )
  return (
    <div data-qs-step="review">
      <div className="text-[14px] font-semibold">{t('admin.quickStart.reviewTitle')}</div>
      <div className="mt-1 rounded-[var(--radius)] border border-line px-3.5">
        {(newRegion || newDistrict) && row(<FolderTree />, t('admin.quickStart.reviewNodes'), (
          <div className="flex flex-wrap gap-1.5">
            {newRegion && <Badge tone="info" size="sm"><span>{labels.level('region')}:</span> {regionName}</Badge>}
            {newDistrict && <Badge tone="info" size="sm"><span>{labels.level('district')}:</span> {districtName}</Badge>}
          </div>
        ))}
        {row(<Hospital />, t('admin.quickStart.reviewFacility'), (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span className="font-medium">{draft.name.trim()}</span><span className="font-mono text-[12px] text-ink-3">{draft.code}</span><Badge size="sm" tone="ok">{labels.kind(draft.kind)}</Badge>{draft.phone && <span className="text-ink-3">{draft.phone}</span>}</span>
        ))}
        {row(<Users />, t('admin.quickStart.reviewStaff'), roles.length
          ? <ul className="flex flex-col gap-0.5">{roles.map((r) => <li key={r.key} className="flex flex-wrap items-center gap-x-2"><span className="text-ink-3">{r.name}:</span><span>{draft.staff[r.key]!.fullName}</span><span className="font-mono text-[12.5px] text-brand-ink">{draft.staff[r.key]!.login}</span></li>)}<li className="mt-1 text-[12.5px] text-ink-3">{t('admin.quickStart.password')}: <span className="font-mono text-ink">{draft.password}</span></li></ul>
          : <span className="text-warn">{t('admin.quickStart.noStaff')}</span>)}
        {row(<Copy />, t('admin.quickStart.reviewCatalog'), (
          <ul className="flex flex-col gap-0.5">
            {preview && <li>{t('admin.quickStart.reviewInherit', { summary: countsSummary(preview.inherits, label) || '—' })}</li>}
            <li>{sample ? t('admin.quickStart.reviewCopy', { name: sample.name, summary: countsSummary(sample.counts, label) || '—' }) : t('admin.quickStart.reviewNoCopy')}</li>
          </ul>
        ))}
        {draft.activateReceipt && row(<ReceiptText />, t('admin.quickStart.counts.receipts'), t('admin.quickStart.reviewReceipt'))}
      </div>
    </div>
  )
}
