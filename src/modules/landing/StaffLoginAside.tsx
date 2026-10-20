import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { BadgeCheck, ClipboardList, FileText, FlaskConical, ShieldCheck } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

const STEPS = [
  { key: 'reception', icon: ClipboardList, label: 'auth.staffFlowReception' },
  { key: 'lab', icon: FlaskConical, label: 'auth.staffFlowLab' },
  { key: 'confirm', icon: BadgeCheck, label: 'auth.staffFlowConfirm' },
  { key: 'result', icon: FileText, label: 'auth.staffFlowResult' },
] as const

/** Quiet workflow rail beside the staff sign-in form — text and hairlines only, no filled panel. */
export function StaffLoginAside({ className }: { className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <div className={cn('relative flex h-full flex-col border-t border-line pt-8 lg:border-t-0 lg:pt-0', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('auth.staffFlowLabel')}</p>
      <h2 className="mt-4 max-w-sm text-[24px] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[27px]">{t('auth.staffAsideTitle')}</h2>
      <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-2">{t('auth.staffAsideText')}</p>

      <ol className="mt-8 border-t border-line/80">
        {STEPS.map(({ key, icon: Icon, label }, i) => (
          <motion.li
            key={key}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={reduce ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.12 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 border-b border-line/80 py-3"
          >
            <span className="w-6 shrink-0 font-mono text-[11px] tabular text-ink-3">{String(i + 1).padStart(2, '0')}</span>
            <Icon className="size-4 shrink-0 text-brand" />
            <span className="min-w-0 text-[13.5px] font-medium text-ink-2">{t(label)}</span>
          </motion.li>
        ))}
      </ol>

      <p className="mt-6 flex max-w-sm items-start gap-2 text-[12px] leading-relaxed text-ink-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <span>{t('auth.staffAsideFoot')}</span>
      </p>
    </div>
  )
}
