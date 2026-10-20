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

/** Brand panel beside the staff sign-in form: the clinic workflow, not a fake dashboard. */
export function StaffLoginAside({ className }: { className?: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <div className={cn('relative flex min-h-[420px] h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-brand/15 bg-brand-soft p-5 text-brand-ink shadow-1 sm:p-7 lg:min-h-[560px] lg:p-8', className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -right-4 -top-8 select-none font-mono text-[180px] leading-none text-brand/10 sm:text-[220px]">+</span>
        <span className="absolute -right-24 -top-28 size-72 rounded-full border border-brand/15" />
        <span className="absolute -right-12 -top-16 size-48 rounded-full border border-brand/10" />
        <span className="absolute inset-0 grid-dots opacity-[0.18]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-bg-elevated/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]">
          <span className="size-1.5 rounded-full bg-brand" />
          {t('auth.staffSecure')}
        </span>
        <span className="hidden text-right font-mono text-[11px] leading-tight text-ink-2 sm:block">{t('auth.staffAsideMeta')}</span>
      </div>

      <div className="relative z-10 mt-8 max-w-md lg:mt-10">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-2">{t('auth.staffEyebrow')}</p>
        <h2 className="mt-2 text-[28px] font-semibold leading-[1.06] tracking-[-0.045em] xs:text-[31px] sm:text-[34px] 2xl:text-[38px]">{t('auth.staffAsideTitle')}</h2>
        <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ink-2 sm:text-[14px]">{t('auth.staffAsideText')}</p>
      </div>

      <div className="relative z-10 mt-8 flex min-h-0 flex-1 flex-col">
        <span aria-hidden className="absolute bottom-5 left-[17px] top-5 w-px bg-brand/20" />
        <ol className="relative flex flex-col">
          {STEPS.map(({ key, icon: Icon, label }, i) => (
            <motion.li
              key={key}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={reduce ? undefined : { opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.18 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-3 py-2.5"
            >
              <span className="relative z-10 grid size-9 shrink-0 place-items-center rounded-[10px] border border-brand/20 bg-bg-elevated/70 text-brand-ink shadow-1 [&>svg]:size-4">
                <Icon />
              </span>
              <span className="w-5 shrink-0 font-mono text-[11px] tabular text-ink-2">{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0 text-[13.5px] font-medium sm:text-[14px]">{t(label)}</span>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="relative z-10 mt-6 flex items-start gap-2 border-t border-brand/15 pt-4 text-[12px] leading-relaxed text-ink-2">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" />
        <span className="max-w-sm">{t('auth.staffAsideFoot')}</span>
      </div>
    </div>
  )
}
