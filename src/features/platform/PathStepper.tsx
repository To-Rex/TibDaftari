/**
 * The way down the organisation tree, drawn as steps: Kompaniya → Davlat → Viloyat → Tuman / shahar → Muassasa.
 * A step already taken shows what was picked and leads back to that level; the current one says how many there are
 * to choose from; the next ones wait. It is the page's breadcrumb and, for someone new, the map of how the system
 * is built. A step never shrinks below its content (the extra room goes to the lines between). Where the row is
 * narrower than 64rem (a phone, a laptop with the sidebar open) the steps are their icons only — still a way back —
 * and the current one is spelled out on a line below; the row scrolls sideways if even that does not fit.
 */
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { BriefcaseBusiness, Globe2, Hospital, Map as MapIcon, MapPin, type LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export type PlatformLevel = 'company' | 'country' | 'region' | 'district' | 'facility'
export const LADDER: PlatformLevel[] = ['company', 'country', 'region', 'district', 'facility']
export const LEVEL_ICON: Record<PlatformLevel, LucideIcon> = { company: BriefcaseBusiness, country: Globe2, region: MapIcon, district: MapPin, facility: Hospital }

export interface PathStep {
  level: PlatformLevel
  state: 'done' | 'current' | 'next'
  /** done: what was picked; current: how many to choose from */
  value?: string
  /** done: go back to this level and pick again */
  onClick?: () => void
}

export function PathStepper({ steps }: { steps: PathStep[] }) {
  const { t } = useTranslation()
  const box = useRef<HTMLOListElement>(null)
  const current = steps.findIndex((s) => s.state === 'current')
  // on a narrow screen the steps scroll sideways — keep the current one in sight
  useEffect(() => {
    const el = box.current
    const step = el?.querySelector<HTMLElement>('[data-path-state="current"]')
    if (!el || !step || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({ left: Math.max(0, step.offsetLeft - 16), behavior: 'smooth' })
  }, [current, steps.length])
  return (
    <nav aria-label={t('admin.platform.path.label')} className="app-card @container overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-1" data-platform-path>
      <ol ref={box} className="no-scrollbar flex snap-x items-stretch overflow-x-auto p-2 sm:p-2.5">
        {steps.map((s, i) => {
          const Icon = LEVEL_ICON[s.level]
          const body = (
            <>
              <span className={cn('relative grid size-10 shrink-0 place-items-center rounded-full transition-colors',
                s.state === 'current' ? 'bg-brand text-white ring-4 ring-brand/15 dark:text-bg' : s.state === 'done' ? 'bg-brand-soft text-brand' : 'bg-surface-2 text-ink-3')}>
                <Icon className="size-[18px]" />
                <span className={cn('absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full text-[10px] font-bold ring-2 ring-surface',
                  s.state === 'next' ? 'bg-surface-3 text-ink-3' : 'bg-ink text-bg')}>{i + 1}</span>
              </span>
              <span className="min-w-0 text-left @max-[64rem]:hidden">
                <span className={cn('block text-[11.5px] font-medium uppercase tracking-[0.06em]', s.state === 'current' ? 'text-brand-ink' : 'text-ink-3')}>{t(`admin.platform.level.${s.level}`)}</span>
                <span className={cn('block max-w-[11rem] truncate text-[13.5px] leading-snug', s.state === 'next' ? 'text-ink-3' : 'font-semibold text-ink')} title={s.value}>
                  {s.value ?? t('admin.platform.path.next')}
                </span>
              </span>
            </>
          )
          const named = `${t(`admin.platform.level.${s.level}`)}: ${s.value ?? t('admin.platform.path.next')}`
          return (
            <li key={s.level} className={cn('flex shrink-0 snap-start items-center', i < steps.length - 1 && 'grow')} data-path-step={s.level} data-path-state={s.state}>
              {s.onClick ? (
                <button type="button" onClick={s.onClick} aria-label={named} title={`${named} — ${t('admin.platform.path.backTo', { level: t(`admin.platform.levels.${s.level}`) })}`}
                  className="flex min-w-max items-center gap-3 rounded-xl px-1.5 py-2 outline-offset-2 transition-colors hover:bg-surface-2 sm:px-2.5">
                  {body}
                </button>
              ) : (
                <span className={cn('flex min-w-max items-center gap-3 rounded-xl px-1.5 py-2 sm:px-2.5', s.state === 'current' && 'bg-brand-soft/40 @min-[64rem]:pr-3')} aria-current={s.state === 'current' ? 'step' : undefined} aria-label={named} title={named}>{body}</span>
              )}
              {i < steps.length - 1 && <span aria-hidden className={cn('mx-0.5 h-px min-w-3 flex-1 rounded-full sm:mx-1 sm:min-w-6', s.state === 'done' ? 'bg-brand/45' : 'bg-line')} />}
            </li>
          )
        })}
      </ol>
      {steps[current] && (
        <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 @min-[64rem]:hidden" data-path-current aria-hidden>
          <span className="shrink-0 text-[11.5px] font-medium uppercase tracking-[0.06em] text-brand-ink">{t(`admin.platform.level.${steps[current].level}`)}</span>
          <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{steps[current].value}</span>
          <span className="ml-auto shrink-0 text-[12px] text-ink-3 tabular">{t('admin.platform.path.stepOf', { n: current + 1, total: steps.length })}</span>
        </p>
      )}
    </nav>
  )
}
