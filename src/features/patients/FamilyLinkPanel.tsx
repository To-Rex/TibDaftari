/**
 * "This number already belongs to a family": the people on the phone number being typed, a way to open the right one
 * instead of registering them twice, and — for a new person — who they are to someone on the number (chips:
 * farzandi, turmush o‘rtog‘i, otasi, onasi, akasi, ukasi, opasi, singlisi, nevarasi, bobosi / buvisi …).
 */
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight, Check, Crown, UsersRound } from 'lucide-react'
import type { Gender, Id, IsoDate, Relation } from '@/domain'
import { Avatar, Badge, Select } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { ageFrom } from '@/shared/lib/format'
import { relationsFor, useRelationLabels } from './relations'

/** a person on the number (a `Patient`, a `FamilyMember` or an error detail all fit) */
export interface Mate {
  id: Id
  fullName: string
  gender?: Gender | null
  birthDate?: IsoDate | null
  relation?: Relation | null
  relatedPatientId?: Id | null
  createdAt?: string
}

export interface FamilyLinkValue { relation: Relation | null; relatedPatientId: Id | null }

/** the number's owner first (no relation, registered first), then by registration */
export function orderMates<T extends Mate>(mates: T[]): T[] {
  return [...mates].sort((a, b) => Number(!!a.relation) - Number(!!b.relation) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

export function FamilyLinkPanel({ mates, value, onChange, required, draftName, draftGender, samePersonId, onOpen, editing }: {
  mates: Mate[]
  value: FamilyLinkValue
  onChange: (v: FamilyLinkValue) => void
  /** an undocumented person must say who they are; a documented one may */
  required: boolean
  draftName: string
  draftGender?: Gender | '' | null
  /** the server said this person is already on the number */
  samePersonId?: Id | null
  onOpen?: (m: Mate) => void
  editing?: boolean
}) {
  const { t } = useTranslation()
  const rel = useRelationLabels()
  const ordered = orderMates(mates)
  const byId = new Map(ordered.map((m) => [m.id, m]))
  const target = (value.relatedPatientId && byId.get(value.relatedPatientId)) || ordered[0]
  const name = draftName.trim() || t('staff.patients.family.newPerson')
  const choices = relationsFor(draftGender)
  const describe = (m: Mate) => {
    if (!m.relation) return null
    const to = m.relatedPatientId ? byId.get(m.relatedPatientId)?.fullName : undefined
    return to ? rel.of(m.relation, m.gender, to) : rel.label(m.relation, m.gender)
  }

  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
      className="rounded-[var(--radius)] border border-info/30 bg-info-soft/30 p-4" data-family-link={value.relation ?? 'none'}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-info-soft text-info"><UsersRound className="size-[18px]" /></span>
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-ink">{t('staff.patients.family.title', { count: ordered.length })}</div>
          <div className="mt-0.5 text-[12.5px] text-ink-2">{editing ? t('staff.patients.family.hintEdit') : t('staff.patients.family.hint')}</div>
        </div>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5" data-family-mates={ordered.length}>
        {ordered.map((m, i) => {
          const same = samePersonId === m.id
          const age = m.birthDate ? ageFrom(m.birthDate) : null
          return (
            <li key={m.id}>
              <div className={cn('group flex items-center gap-3 rounded-lg border bg-surface px-3 py-2 shadow-1', same ? 'border-warn/60 ring-2 ring-warn/20' : 'border-transparent')} data-family-mate={m.id}>
                <Avatar name={m.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="truncate text-[13.5px] font-medium">{m.fullName}</span>
                    {age != null && <span className="text-[12px] text-ink-3 tabular">{age} {t('staff.reception.yearsOld')}</span>}
                    {same && <Badge size="sm" tone="warn">{t('staff.patients.family.samePerson')}</Badge>}
                  </span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {!m.relation || i === 0 ? <span className="inline-flex items-center gap-1"><Crown className="size-3 text-accent" />{t('relation.owner')}</span> : describe(m)}
                  </span>
                </span>
                {onOpen && (
                  <button type="button" onClick={() => onOpen(m)} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-brand-ink transition-colors hover:bg-brand-soft" data-family-open={m.id}>
                    {t('staff.patients.family.thisOne')} <ArrowRight className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 border-t border-info/20 pt-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-[13.5px] font-medium text-ink">
            {t('staff.patients.family.question', { name, target: target?.fullName ?? '' })}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </span>
          {ordered.length > 1 && (
            <Select value={target?.id ?? ''} onChange={(e) => onChange({ relation: value.relation, relatedPatientId: e.target.value || null })} className="h-8 w-auto min-w-0 max-w-full text-[12.5px]" aria-label={t('staff.patients.family.relatedTo')} data-family-target>
              {ordered.map((m) => <option key={m.id} value={m.id}>{t('staff.patients.family.relatedToOption', { name: m.fullName })}</option>)}
            </Select>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('staff.patients.family.relation')}>
          {choices.map((r) => {
            const on = value.relation === r
            return (
              <button key={r} type="button" role="radio" aria-checked={on} data-relation={r}
                onClick={() => onChange({ relation: on && !required ? null : r, relatedPatientId: value.relatedPatientId ?? target?.id ?? null })}
                className={cn('inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[12.5px] font-medium transition-colors', on ? 'border-brand bg-brand text-white shadow-1' : 'border-line bg-surface text-ink-2 hover:border-brand/60 hover:text-ink')}>
                {on && <Check className="size-3.5" />}{rel.label(r, draftGender)}
              </button>
            )
          })}
        </div>
        <p className={cn('mt-2 text-[12px]', required && !value.relation ? 'text-warn' : 'text-ink-3')}>
          {required ? t('staff.patients.family.requiredHint') : t('staff.patients.family.optionalHint')}
        </p>
      </div>
    </motion.div>
  )
}
