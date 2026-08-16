import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowRight, BadgeCheck, ClipboardPlus, FlaskConical, UserPlus } from 'lucide-react'
import type { Permission } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { fadeUp, stagger } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'

interface Action { key: string; to: string; label: string; hint: string; icon: ReactNode; perm: Permission | Permission[]; tone: string; badge?: number }

export function QuickActions({ pendingLab, pendingApproval }: { pendingLab?: number; pendingApproval?: number }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const all: Action[] = [
    { key: 'reception', to: routes.app.reception, label: t('staff.dashboard.qaReception'), hint: t('staff.dashboard.qaReceptionHint'), icon: <ClipboardPlus />, perm: 'reception.order.create', tone: 'bg-brand-soft text-brand-ink' },
    { key: 'patient', to: `${routes.app.patients}?new=1`, label: t('staff.dashboard.qaPatient'), hint: t('staff.dashboard.qaPatientHint'), icon: <UserPlus />, perm: 'reception.patient.write', tone: 'bg-info-soft text-info' },
    { key: 'lab', to: routes.app.lab, label: t('staff.dashboard.qaLab'), hint: t('staff.dashboard.qaLabHint'), icon: <FlaskConical />, perm: 'lab.worklist.read', tone: 'bg-warn-soft text-warn', badge: pendingLab },
    { key: 'confirm', to: routes.app.confirm, label: t('staff.dashboard.qaConfirm'), hint: t('staff.dashboard.qaConfirmHint'), icon: <BadgeCheck />, perm: 'confirm.result.read', tone: 'bg-ok-soft text-ok', badge: pendingApproval },
  ]
  const actions = all.filter((a) => can(a.perm))
  if (!actions.length) return null
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((a) => (
        <motion.div key={a.key} variants={fadeUp}>
          <Link to={a.to} className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-1 transition-[transform,box-shadow,border-color] duration-250 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-2">
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl [&>svg]:size-5', a.tone)}>{a.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[14px] font-semibold">{a.label}{!!a.badge && <span className="rounded-full bg-accent/15 px-1.5 h-5 min-w-5 grid place-items-center text-[11px] font-semibold text-accent tabular">{a.badge}</span>}</span>
              <span className="block truncate text-[12.5px] text-ink-3">{a.hint}</span>
            </span>
            <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
