import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import type { ItemStatus } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { ITEM_STEPS, stepIndex } from '../status'

const ease = [0.22, 1, 0.36, 1] as const

/** Linear workflow timeline: pending → entered → submitted → approved. */
export function StatusTimeline({ status, className }: { status: ItemStatus; className?: string }) {
  const { t } = useTranslation()
  const cur = stepIndex(status)
  const rejected = status === 'rejected'
  const approved = status === 'approved'
  return (
    <ol className={cn('flex items-start', className)} aria-label={t('portal.visit.timeline')}>
      {ITEM_STEPS.map((s, i) => {
        const done = approved || i < cur
        const active = !approved && i === cur
        const last = i === ITEM_STEPS.length - 1
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center">
            {!last && (
              <span className="bg-surface-3 absolute top-[11px] left-1/2 h-0.5 w-full">
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: done ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + i * 0.12, ease }}
                  className="bg-ok block h-full origin-left"
                />
              </span>
            )}
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, delay: i * 0.12, ease }}
              className={cn(
                'relative z-[1] grid size-6 place-items-center rounded-full border-2 transition-colors',
                done
                  ? 'border-ok bg-ok text-white'
                  : active
                    ? rejected
                      ? 'border-danger bg-danger-soft'
                      : 'border-brand bg-brand-soft'
                    : 'border-line-strong bg-surface',
              )}
            >
              {done ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : active ? (
                <span
                  className={cn(
                    'size-2 rounded-full',
                    rejected ? 'bg-danger' : 'bg-brand animate-pulse',
                  )}
                />
              ) : null}
            </motion.span>
            <span
              className={cn(
                'mt-1.5 px-0.5 text-center text-[11px] leading-tight',
                done ? 'text-ink-2' : active ? 'text-ink font-medium' : 'text-ink-3',
              )}
            >
              {t(`portal.status.${s}`)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
