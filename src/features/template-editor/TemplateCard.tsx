import { memo, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check, MoreHorizontal } from 'lucide-react'
import type { Branch, Category, ResultTemplate, ServiceType } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'
import { cn } from '@/shared/lib/cn'
import { fmtRelative } from '@/shared/lib/format'
import { Badge, Card, Menu, Skeleton } from '@/shared/ui'
import { fadeUp } from '@/shared/ui/Page'
import { templateMenuItems } from './templateMenu'
import { useTemplateSchema } from './useTemplateSchema'

const TONE = { draft: 'warn', active: 'ok', archived: 'neutral' } as const

export const TemplateCard = memo(function TemplateCard({ tpl, companyId, serviceTypes, categories, branches, canWrite, canPublish, onOpen, onDuplicate, onSetStatus, onDelete, onExport, selecting, selected, onToggleSelect }: {
  tpl: ResultTemplate; companyId: string; serviceTypes: ServiceType[]; categories: Category[]; branches?: Branch[]; canWrite: boolean; canPublish: boolean
  onOpen: () => void; onDuplicate: () => void; onSetStatus: (s: ResultTemplate['status']) => void; onDelete: () => void; onExport?: () => void
  /** selection mode (bulk actions): a click toggles the card instead of opening it */
  selecting?: boolean; selected?: boolean; onToggleSelect?: () => void
}) {
  const { t } = useTranslation()
  const bound = tpl.serviceTypeIds.map((id) => serviceTypes.find((s) => s.id === id)).filter(Boolean) as ServiceType[]
  const cats = tpl.categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean) as Category[]
  const chips = [...bound.map((s) => s.name), ...cats.map((c) => c.name)]
  const branchNames = (tpl.branchIds ?? []).map((id) => branches?.find((b) => b.id === id)?.name ?? null).filter(Boolean) as string[]
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card padded={false} interactive onClick={selecting ? onToggleSelect : onOpen} role={selecting ? 'checkbox' : undefined} aria-checked={selecting ? !!selected : undefined} data-template-id={tpl.id}
        className={cn('group relative h-full flex flex-col overflow-hidden', selecting && selected && 'ring-2 ring-brand border-brand')}>
        {selecting && (
          <span aria-hidden className={cn('absolute left-3 top-3 z-10 grid size-6 place-items-center rounded-md border-2 shadow-1 transition-colors', selected ? 'border-brand bg-brand text-white' : 'border-line-strong bg-surface/90')}>
            {selected && <Check className="size-4" />}
          </span>
        )}
        <Thumb tpl={tpl} companyId={companyId} />
        <div className="p-4 flex flex-col gap-2.5 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] font-semibold leading-5 truncate">{tpl.name}</h3>
              <p className="text-[12px] text-ink-3">{fmtRelative(tpl.updatedAt)} · {t('catalog.templates.usage', { n: tpl.usage })}</p>
            </div>
            <span onClick={(e) => e.stopPropagation()} className="-mr-2 -mt-1">
              <Menu trigger={() => <span className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
                items={templateMenuItems(tpl, t, { canWrite, canPublish }, { onOpen, onDuplicate, onSetStatus, onDelete, onExport })} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={TONE[tpl.status]} dot size="sm">{t(`catalog.templates.status.${tpl.status}`)}</Badge>
            <Badge size="sm">v{tpl.version}</Badge>
            <Badge size="sm">{tpl.language.toUpperCase()}</Badge>
            {tpl.scope !== 'receipt' && tpl.doc.paper !== 'A4' && <Badge size="sm">{tpl.doc.paper}</Badge>}
            <Badge size="sm" tone={tpl.scope === 'receipt' ? 'accent' : undefined}>{tpl.scope === 'item' ? t('catalog.services.scopeItem') : tpl.scope === 'receipt' ? t('catalog.services.scopeReceipt') : t('catalog.services.scopeOrder')}</Badge>
            {branchNames.length > 2 ? <span title={branchNames.join(' · ')}><Badge size="sm" tone="brand">{t('catalog.templates.nBranches', { n: branchNames.length })}</Badge></span>
              : branchNames.length > 0 ? <Badge size="sm" tone="brand">{branchNames.join(' · ')}</Badge> : <Badge size="sm">{t('catalog.templates.allBranches')}</Badge>}
          </div>
          <div className="mt-auto flex items-center gap-1 flex-wrap">
            {tpl.scope === 'receipt' ? <span className="text-[12px] text-ink-3">{tpl.doc.paper.startsWith('Receipt') ? t('catalog.editor.receiptPaper', { mm: tpl.doc.paper.slice(7) }) : tpl.doc.paper}</span>
              : chips.length === 0 ? <span className="text-[12px] text-ink-3">{t('catalog.services.generic')}</span> : chips.slice(0, 3).map((c) => <span key={c} className="h-6 rounded-full bg-surface-2 px-2 text-[11.5px] text-ink-2 truncate max-w-full sm:max-w-[140px] leading-6">{c}</span>)}
            {chips.length > 3 && <span className="text-[11.5px] text-ink-3">+{chips.length - 3}</span>}
          </div>
        </div>
      </Card>
    </motion.div>
  )
})

/** Live mini thumbnail rendered via DocumentRenderer — scaled to the card width (phones → big monitors). */
function Thumb({ tpl, companyId }: { tpl: ResultTemplate; companyId: string }) {
  const { ctx, assets, loading } = useTemplateSchema(tpl.serviceTypeIds[0], companyId, tpl)
  const size = paperSize(tpl.doc)
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(240)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { if (e) setWidth(e.contentRect.width) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const scale = Math.max(0.12, (width - 32) / size.w)
  const h = Math.round(Math.max(120, Math.min(260, width * 0.62)))
  return (
    <div ref={ref} className="relative overflow-hidden bg-surface-2/70 border-b border-line" style={{ height: h }}>
      {loading ? <Skeleton className="absolute inset-4 rounded-md" /> : (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 shadow-2 ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1 pointer-events-none">
          <DocumentRenderer doc={tpl.doc} ctx={ctx} assets={assets} scale={scale} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" />
    </div>
  )
}
