/** Live document preview scaled to its container width. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import type { AttributeSchema, Order, OrderItem, Patient, ResultTemplate } from '@/domain'
import { paperSize } from '@/domain'
import { DocumentRenderer } from '@/features/documents/DocumentRenderer'
import { buildRenderContext } from '@/features/documents/buildContext'
import { cn } from '@/shared/lib/cn'
import { EmptyState, Select, Skeleton } from '@/shared/ui'
import { useBranches, useCompany, useTemplateAssets, useTemplatesFor } from './queries'

export function useFitScale<T extends HTMLElement>(paperW: number) {
  const ref = useRef<T>(null)
  const [scale, setScale] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { const w = e?.contentRect.width ?? 0; if (w > 0) setScale(Math.min(1, w / paperW)) })
    ro.observe(el)
    return () => ro.disconnect()
  }, [paperW])
  return { ref, scale }
}

export function DocumentPreview({ companyId, item, order, patient, schema, templateId, onTemplateChange, showTemplateSelect = true, className, fixedTemplate }: {
  companyId: string
  item: OrderItem
  order?: Order | null
  patient?: Patient | null
  schema?: AttributeSchema | null
  templateId?: string
  onTemplateChange?: (id: string) => void
  showTemplateSelect?: boolean
  className?: string
  /** when given (approved documents) — render exactly this template */
  fixedTemplate?: ResultTemplate | null
}) {
  const { t } = useTranslation()
  const templates = useTemplatesFor(companyId, fixedTemplate ? undefined : item)
  const assets = useTemplateAssets(companyId)
  const company = useCompany(companyId)
  const branches = useBranches(companyId)
  const branch = branches.data?.find((b) => b.id === item.branchId)

  const list = templates.data ?? []
  const template = fixedTemplate ?? list.find((x) => x.id === templateId) ?? list[0]

  // auto-pick first template when none selected
  useEffect(() => {
    if (!fixedTemplate && list[0] && onTemplateChange && !list.some((x) => x.id === templateId)) onTemplateChange(list[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, templateId, fixedTemplate])

  const ctx = useMemo(
    () => buildRenderContext({ patient, order, item, company: company.data, branch, schema }),
    [patient, order, item, company.data, branch, schema],
  )
  const size = template ? paperSize(template.doc) : { w: 794, h: 1123 }
  const { ref, scale } = useFitScale<HTMLDivElement>(size.w)
  const loading = (!fixedTemplate && templates.isLoading) || assets.isLoading || company.isLoading

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {showTemplateSelect && !fixedTemplate && list.length > 1 && (
        <Select value={template?.id ?? ''} onChange={(e) => onTemplateChange?.(e.target.value)} className="h-9 text-[13px]">
          {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </Select>
      )}
      <div ref={ref} className="w-full">
        {loading ? (
          <div className="w-full" style={{ aspectRatio: `${size.w} / ${size.h}` }}><Skeleton className="size-full rounded-md" /></div>
        ) : !template ? (
          <EmptyState icon={<FileText />} title={t('clinical.confirm.noTemplate')} description={t('clinical.confirm.noTemplateHint')} className="py-10" />
        ) : (
          <div className="overflow-hidden rounded-md shadow-2 ring-1 ring-black/10 dark:ring-white/10">
            <DocumentRenderer doc={template.doc} ctx={ctx} assets={assets.data ?? []} scale={scale} />
          </div>
        )}
      </div>
    </div>
  )
}
