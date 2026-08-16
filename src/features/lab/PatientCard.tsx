/** Compact patient block used on the item entry page and confirm detail. */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { Patient } from '@/domain'
import { routes } from '@/shared/config/routes'
import { ageFrom, fmtDate, fmtPhone } from '@/shared/lib/format'
import { Avatar, Skeleton } from '@/shared/ui'

export function PatientCard({ patient, loading, compact }: { patient?: Patient | null; loading?: boolean; compact?: boolean }) {
  const { t } = useTranslation()
  if (loading || !patient) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
      </div>
    )
  }
  const age = ageFrom(patient.birthDate)
  return (
    <div className="flex items-start gap-3">
      <Avatar name={patient.fullName} size={compact ? 'sm' : 'md'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Link to={routes.app.patient(patient.id)} className="truncate font-semibold text-ink hover:text-brand-ink transition-colors">{patient.fullName}</Link>
          <ExternalLink className="size-3 shrink-0 text-ink-3" />
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-ink-3 tabular">
          <span>{fmtPhone(patient.phone)}</span>
          {patient.gender && <><span className="opacity-50">·</span><span>{t(`common.${patient.gender}`)}</span></>}
          {age != null && <><span className="opacity-50">·</span><span>{t('clinical.lab.age', { n: age })}</span></>}
        </div>
        {!compact && patient.birthDate && <div className="mt-0.5 text-[12px] text-ink-3">{t('common.birthDate')}: <span className="tabular">{fmtDate(patient.birthDate)}</span></div>}
      </div>
    </div>
  )
}
