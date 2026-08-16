import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { FileText, ExternalLink } from 'lucide-react'
import type { Patient, ResultDocument } from '@/domain'
import { Badge, Card, EmptyState, Skeleton, fadeUp, stagger } from '@/shared/ui'
import { fmtDate, fmtDateTime, fmtPhone } from '@/shared/lib/format'
import { routes } from '@/shared/config/routes'
import { useDistricts, useRegions } from './queries'

/** "Ma’lumot" tab — read-only profile facts. */
export function PatientDetails({ patient }: { patient: Patient }) {
  const { t } = useTranslation()
  const regions = useRegions()
  const districts = useDistricts(patient.address?.regionId)
  const region = regions.data?.find((r) => r.id === patient.address?.regionId)?.name
  const district = districts.data?.find((d) => d.id === patient.address?.districtId)?.name
  const address = [region, district, patient.address?.street].filter(Boolean).join(', ')
  const rows: [string, string | undefined][] = [
    [t('common.phone'), fmtPhone(patient.phone)],
    [t('common.gender'), patient.gender ? t(`common.${patient.gender}`) : undefined],
    [t('common.birthDate'), patient.birthDate ? fmtDate(patient.birthDate) : undefined],
    [t('staff.patients.form.passport'), patient.passportNumber],
    [t('staff.patients.form.pinfl'), patient.pinfl],
    [t('common.address'), address || undefined],
    [t('staff.patients.form.workplace'), patient.workplace],
    [t('staff.patients.form.discount'), patient.discountPercent ? `${patient.discountPercent}%` : undefined],
    [t('staff.patients.form.contract'), patient.contractNumber],
    [t('staff.patients.form.note'), patient.note],
    [t('staff.patients.portal'), patient.portal.linked ? t('staff.patients.portalLinked') : t('staff.patients.portalNotLinked')],
    [t('staff.patients.colCreated'), fmtDateTime(patient.createdAt)],
  ]
  return (
    <Card>
      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 border-b border-line/60 pb-3 last:border-0">
            <dt className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{k}</dt>
            <dd className={v ? 'text-[14px] tabular' : 'text-[14px] text-ink-3'}>{v ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/** "Natijalar" tab — result documents of the patient. */
export function PatientDocuments({ docs, loading }: { docs?: ResultDocument[]; loading: boolean }) {
  const { t } = useTranslation()
  if (loading) return <Card><div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div></Card>
  if (!docs?.length) return <Card><EmptyState icon={<FileText />} title={t('staff.patients.noDocs')} description={t('staff.patients.noDocsHint')} /></Card>
  return (
    <Card padded={false}>
      <motion.ul variants={stagger} initial="hidden" animate="show" className="divide-y divide-line/70">
        {docs.map((d) => (
          <motion.li key={d.id} variants={fadeUp}>
            <Link to={routes.app.order(d.orderId)} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2/60">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink"><FileText className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{d.title}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3 tabular">
                  {fmtDateTime(d.createdAt)}
                  {d.deliveries.map((dl, i) => <Badge key={i} size="sm" tone={dl.status === 'delivered' || dl.status === 'sent' ? 'ok' : dl.status === 'failed' ? 'danger' : 'neutral'}>{dl.channel} · {dl.status}</Badge>)}
                </span>
              </span>
              <Badge tone={d.status === 'final' ? 'ok' : 'neutral'} size="sm">{d.status === 'final' ? t('staff.patients.docFinal') : t('common.draft')}</Badge>
              <ExternalLink className="size-4 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </Card>
  )
}
