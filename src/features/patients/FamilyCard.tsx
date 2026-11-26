/**
 * "On this number": the family members who share the patient's phone (and relatives linked by a relation) — who
 * each one is, how old, where they were registered; a click opens them (the patient page) or picks them (reception).
 */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronRight, Crown, UsersRound } from 'lucide-react'
import type { FamilyMember, Id, Patient } from '@/domain'
import { Avatar, Badge, Card, Skeleton } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { ageFrom, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { usePatientFamily } from './queries'
import { useRelationLabels } from './relations'

/** "Aziza Karimovaning o‘g‘li" for a patient who carries a relation; null for the number's owner */
export function useRelationLine() {
  const rel = useRelationLabels()
  return (p: Pick<Patient, 'relation' | 'gender' | 'relatedPatientName'>) =>
    p.relation ? (p.relatedPatientName ? rel.of(p.relation, p.gender, p.relatedPatientName) : rel.label(p.relation, p.gender)) : null
}

export function hasFamily(p: Pick<Patient, 'phoneShared' | 'relation'>) {
  return (p.phoneShared ?? 0) > 0 || !!p.relation
}

export function FamilyCard({ patient, onPick, compact }: { patient: Patient; /** reception: pick the member instead of opening their page */ onPick?: (id: Id) => void; compact?: boolean }) {
  const { t } = useTranslation()
  const rel = useRelationLabels()
  const q = usePatientFamily(patient.id, hasFamily(patient))
  if (!hasFamily(patient)) return null
  const members = q.data?.members ?? []
  const names = new Map<Id, string>([[patient.id, patient.fullName], ...members.map((m) => [m.id, m.fullName] as [Id, string])])
  const describe = (m: FamilyMember) => {
    if (m.isOwner || !m.relation) return null
    const to = m.relatedPatientId ? names.get(m.relatedPatientId) : undefined
    return to ? rel.of(m.relation, m.gender, to) : rel.label(m.relation, m.gender)
  }
  const row = (m: FamilyMember) => {
    const age = m.birthDate ? ageFrom(m.birthDate) : null
    const line = describe(m)
    const body = (
      <>
        <Avatar name={m.fullName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-[13.5px] font-medium">{m.fullName}</span>
            {age != null && <span className="text-[12px] text-ink-3 tabular">{age} {t('staff.reception.yearsOld')}</span>}
          </span>
          <span className="flex min-w-0 items-center gap-1 truncate text-[12px] text-ink-3">
            {m.isOwner ? <><Crown className="size-3 shrink-0 text-accent" />{t('relation.owner')}</> : line}
            {m.phone !== patient.phone && <span className="tabular">· {fmtPhone(m.phone)}</span>}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
      </>
    )
    const cls = 'group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-surface-2/70'
    return onPick
      ? <button type="button" className={cls} onClick={() => onPick(m.id)} data-family-member={m.id}>{body}</button>
      : <Link to={routes.app.patient(m.id)} className={cls} data-family-member={m.id}>{body}</Link>
  }

  return (
    <Card className={cn('min-w-0', compact && 'p-4')} data-family-card={members.length} data-tour="patient-family">
      <div className="mb-2 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info"><UsersRound className="size-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[14px] font-semibold">
            {t('staff.patients.family.cardTitle')} <Badge size="sm" tone="info">{fmtPhone(patient.phone)}</Badge>
          </div>
          <div className="text-[12.5px] text-ink-3">{t('staff.patients.family.cardHint')}</div>
        </div>
      </div>
      {q.isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1].map((i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : (
        <motion.ul initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="flex flex-col">
          {members.map((m) => (
            <motion.li key={m.id} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}>{row(m)}</motion.li>
          ))}
        </motion.ul>
      )}
    </Card>
  )
}
