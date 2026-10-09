/** A result's trail — every submit, return, approval and revoked approval: who, when and why (newest first). */
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, CornerUpLeft, Repeat, RotateCcw, Send, Undo2 } from 'lucide-react'
import type { ItemEvent } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime } from '@/shared/lib/format'
import { Badge } from '@/shared/ui'

const META: Record<ItemEvent['type'], { icon: ReactNode; tone: string }> = {
  submitted: { icon: <Send />, tone: 'bg-info-soft text-info' },
  unsubmitted: { icon: <Undo2 />, tone: 'bg-surface-2 text-ink-3' },
  returned: { icon: <CornerUpLeft />, tone: 'bg-warn-soft text-warn' },
  approved: { icon: <BadgeCheck />, tone: 'bg-ok-soft text-ok' },
  revoked: { icon: <RotateCcw />, tone: 'bg-danger-soft text-danger' },
  reopened: { icon: <Repeat />, tone: 'bg-warn-soft text-warn' },
}

/** How often the result went to the doctor, and how often it came back to the lab. */
export function historyCounts(history?: ItemEvent[] | null): { submits: number; returns: number } {
  const h = history ?? []
  return { submits: h.filter((e) => e.type === 'submitted').length, returns: h.filter((e) => e.type === 'returned' || e.type === 'revoked').length }
}

export function ItemHistory({ history, className }: { history?: ItemEvent[] | null; className?: string }) {
  const { t } = useTranslation()
  if (!history?.length) return null
  const { submits, returns } = historyCounts(history)
  return (
    <section className={cn('flex flex-col gap-3', className)} data-item-history>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-[13px] font-semibold text-ink">{t('clinical.confirm.histTitle')}</h3>
        <Badge size="sm" tone="info">{t('clinical.confirm.histSubmits', { n: submits })}</Badge>
        {returns > 0 && <Badge size="sm" tone="warn">{t('clinical.confirm.histReturns', { n: returns })}</Badge>}
      </div>
      <ol className="ml-2 flex flex-col gap-3 border-l border-line pl-5">
        {[...history].reverse().map((e, i) => (
          <li key={`${e.at}-${i}`} className="relative min-w-0" data-event={e.type}>
            <span className={cn('absolute -left-[30px] top-0 grid size-5 place-items-center rounded-full ring-4 ring-surface [&>svg]:size-3', META[e.type]?.tone ?? 'bg-surface-2 text-ink-3')}>{META[e.type]?.icon}</span>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px]">
              <span className="font-medium text-ink">{t(`clinical.confirm.ev_${e.type}`, { defaultValue: e.type })}</span>
              {e.byName && <span className="text-ink-2">{e.byName}</span>}
              <span className="text-[12px] tabular text-ink-3">{fmtDateTime(e.at)}</span>
            </div>
            {e.reason && <p className="mt-1 break-words rounded-md bg-surface-2/70 px-2.5 py-1.5 text-[12.5px] text-ink-2">«{e.reason}»</p>}
          </li>
        ))}
      </ol>
    </section>
  )
}
