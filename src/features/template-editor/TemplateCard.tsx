import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Archive, CheckCircle2, Copy, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react'
import type { Category, ResultTemplate, ServiceType } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'
import { fmtRelative } from '@/shared/lib/format'
import { Badge, Card, Menu, Skeleton } from '@/shared/ui'
import { fadeUp } from '@/shared/ui/Page'
import { useTemplateSchema } from './useTemplateSchema'

const TONE = { draft: 'warn', active: 'ok', archived: 'neutral' } as const

export const TemplateCard = memo(function TemplateCard({ tpl, companyId, serviceTypes, categories, canWrite, canPublish, onOpen, onDuplicate, onSetStatus, onDelete }: {
  tpl: ResultTemplate; companyId: string; serviceTypes: ServiceType[]; categories: Category[]; canWrite: boolean; canPublish: boolean
  onOpen: () => void; onDuplicate: () => void; onSetStatus: (s: ResultTemplate['status']) => void; onDelete: () => void
}) {
  const { t } = useTranslation()
  const bound = tpl.serviceTypeIds.map((id) => serviceTypes.find((s) => s.id === id)).filter(Boolean) as ServiceType[]
  const cats = tpl.categoryIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean) as Category[]
  const chips = [...bound.map((s) => s.name), ...cats.map((c) => c.name)]
  return (
    <motion.div variants={fadeUp} className="h-full">
      <Card padded={false} interactive onClick={onOpen} className="group h-full flex flex-col overflow-hidden">
        <Thumb tpl={tpl} companyId={companyId} />
        <div className="p-4 flex flex-col gap-2.5 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] font-semibold leading-5 truncate">{tpl.name}</h3>
              <p className="text-[12px] text-ink-3">{fmtRelative(tpl.updatedAt)} · {t('catalog.templates.usage', { n: tpl.usage })}</p>
            </div>
            <span onClick={(e) => e.stopPropagation()} className="-mr-2 -mt-1">
              <Menu trigger={() => <span className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
                items={[
                  { key: 'open', label: t('catalog.templates.open'), icon: <ExternalLink />, onSelect: onOpen },
                  { key: 'dup', label: t('catalog.templates.duplicate'), icon: <Copy />, onSelect: onDuplicate, disabled: !canWrite },
                  ...(tpl.status === 'active'
                    ? [{ key: 'arch', label: t('catalog.templates.archive'), icon: <Archive />, onSelect: () => onSetStatus('archived'), disabled: !canPublish, separatorBefore: true }]
                    : [{ key: 'act', label: t('catalog.templates.activate'), icon: <CheckCircle2 />, onSelect: () => onSetStatus('active'), disabled: !canPublish, separatorBefore: true }]),
                  { key: 'del', label: t('common.delete'), icon: <Trash2 />, danger: true, onSelect: onDelete, disabled: !canWrite || tpl.status === 'active', separatorBefore: true },
                ]} />
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge tone={TONE[tpl.status]} dot size="sm">{t(`catalog.templates.status.${tpl.status}`)}</Badge>
            <Badge size="sm">v{tpl.version}</Badge>
            <Badge size="sm">{tpl.language.toUpperCase()}</Badge>
            <Badge size="sm">{tpl.scope === 'item' ? t('catalog.services.scopeItem') : t('catalog.services.scopeOrder')}</Badge>
          </div>
          <div className="mt-auto flex items-center gap-1 flex-wrap">
            {chips.length === 0 ? <span className="text-[12px] text-ink-3">{t('catalog.services.generic')}</span> : chips.slice(0, 3).map((c) => <span key={c} className="h-6 rounded-full bg-surface-2 px-2 text-[11.5px] text-ink-2 truncate max-w-[140px] leading-6">{c}</span>)}
            {chips.length > 3 && <span className="text-[11.5px] text-ink-3">+{chips.length - 3}</span>}
          </div>
        </div>
      </Card>
    </motion.div>
  )
})

/** Live mini thumbnail rendered via DocumentRenderer at small scale. */
function Thumb({ tpl, companyId }: { tpl: ResultTemplate; companyId: string }) {
  const { ctx, assets, loading } = useTemplateSchema(tpl.serviceTypeIds[0], companyId)
  const size = paperSize(tpl.doc)
  const scale = 240 / size.w
  return (
    <div className="relative h-44 overflow-hidden bg-surface-2/70 border-b border-line">
      {loading ? <Skeleton className="absolute inset-4 rounded-md" /> : (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 shadow-2 ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-1 pointer-events-none">
          <DocumentRenderer doc={tpl.doc} ctx={ctx} assets={assets} scale={scale} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" />
    </div>
  )
}
