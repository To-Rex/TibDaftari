/** "Whose results?" — everyone on the number, or one family member (shown only when the number is a family's). */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { UsersRound } from 'lucide-react'
import { useRelationLabels } from '@/features/patients/relations'
import { Avatar } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { usePortalMember, type PortalFamilyMember } from '../family'
import { firstName } from '../status'

export function FamilySwitch({ family, memberId, counts, className }: {
  family: PortalFamilyMember[]
  memberId: string
  /** visits per member id (shown as a small number on each pill) */
  counts?: Record<string, number>
  className?: string
}) {
  const { t } = useTranslation()
  const rel = useRelationLabels()
  const setMember = usePortalMember((s) => s.setMember)
  const row = useRef<HTMLDivElement>(null)
  // on a phone the row scrolls sideways: keep the chosen person in view
  useEffect(() => {
    row.current?.querySelector<HTMLElement>(`[data-family-pill="${memberId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [memberId])
  if (family.length < 2) return null
  const pill = (id: string, label: string, sub: string | null, avatar: string | null, count?: number) => {
    const active = memberId === id
    return (
      <button key={id} type="button" role="radio" aria-checked={active} onClick={() => setMember(id)} data-family-pill={id} title={avatar ?? undefined}
        className={cn('relative inline-flex h-12 shrink-0 items-center gap-2.5 rounded-2xl border pl-1.5 pr-3.5 text-left transition-colors', active ? 'border-transparent text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}>
        {active && <motion.span layoutId="portal-family-pill" className="absolute inset-0 rounded-2xl bg-brand-soft ring-1 ring-brand/30" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
        <span className="relative">{avatar ? <Avatar name={avatar} size="sm" /> : <span className="grid size-8 place-items-center rounded-full bg-surface-2 text-ink-2"><UsersRound className="size-4" /></span>}</span>
        <span className="relative flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[13.5px] font-medium">{label}</span>
          {sub && <span className="truncate text-[11.5px] text-ink-3">{sub}</span>}
        </span>
        {count != null && <span className="relative ml-0.5 rounded-full bg-surface-2 px-1.5 text-[11px] tabular text-ink-3">{count}</span>}
      </button>
    )
  }
  return (
    <div className={cn('mb-5', className)} data-family-switch={family.length} data-tour="portal-family">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('portal.family.title')}</div>
      <div ref={row} className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 xs:-mx-4 xs:px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="radiogroup" aria-label={t('portal.family.title')}>
        {pill('all', t('portal.family.all'), t('portal.family.allSub', { count: family.length }), null, counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined)}
        {family.map((m) => pill(
          m.id,
          firstName(m.fullName),
          m.isSelf ? t('portal.family.you') : m.relation ? rel.label(m.relation, m.gender) : t('relation.owner'),
          m.fullName,
          counts?.[m.id] ?? 0,
        ))}
      </div>
    </div>
  )
}
