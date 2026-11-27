/**
 * What a round of the training consists of: the whole plan of the role — as on the first day — or only the tasks
 * that need brushing up. Used where an employee repeats the training by their own wish and where a manager sends
 * someone (back) to it.
 */
import { useTranslation } from 'react-i18next'
import { ListChecks, Sparkles } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { Checkbox } from '@/shared/ui'
import { taskIcon, taskTitle } from './tasks'

export interface PlanChoice { whole: boolean; picked: string[] }
export const WHOLE_PLAN: PlanChoice = { whole: true, picked: [] }
/** the choice as the API takes it: nothing = the whole plan */
export const tasksOf = (choice: PlanChoice, plan: string[]): string[] | undefined => (choice.whole ? undefined : plan.filter((k) => choice.picked.includes(k)))
export const choiceValid = (choice: PlanChoice) => choice.whole || choice.picked.length > 0

export function PlanPicker({ plan, value, onChange, wholeHint, someHint }: { plan: string[]; value: PlanChoice; onChange: (v: PlanChoice) => void; wholeHint: string; someHint: string }) {
  const { t } = useTranslation()
  const toggle = (key: string) => onChange({ whole: false, picked: value.picked.includes(key) ? value.picked.filter((k) => k !== key) : [...value.picked, key] })
  const option = (whole: boolean, icon: React.ReactNode, title: string, hint: string) => {
    const on = value.whole === whole
    return (
      <button type="button" role="radio" aria-checked={on} data-plan-option={whole ? 'whole' : 'some'} onClick={() => onChange({ ...value, whole })}
        className={cn('flex w-full items-start gap-3 rounded-[var(--radius)] border p-3 text-left transition-colors', on ? 'border-brand bg-brand-soft/50' : 'border-line bg-surface hover:border-line-strong')}>
        <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full [&>svg]:size-4', on ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3')}>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">{title}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">{hint}</span>
        </span>
        <span className={cn('mt-1 grid size-[18px] shrink-0 place-items-center rounded-full border', on ? 'border-brand' : 'border-line-strong')}>{on && <span className="size-2.5 rounded-full bg-brand" />}</span>
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-2" role="radiogroup" data-plan-picker>
      {option(true, <Sparkles />, t('training.repeat.whole'), wholeHint)}
      {/* one task is the whole plan already — there is nothing to choose from */}
      {plan.length > 1 && option(false, <ListChecks />, t('training.repeat.some'), someHint)}
      {!value.whole && (
        <ul className="ml-1 flex flex-col gap-1 border-l-2 border-brand/30 pl-3">
          {plan.map((key) => {
            const Icon = taskIcon(key)
            return (
              <li key={key}>
                <Checkbox data-plan-task={key} checked={value.picked.includes(key)} onChange={() => toggle(key)} className="w-full rounded-[var(--radius-sm)] px-2 py-1.5 hover:bg-surface-2"
                  label={<span className="flex min-w-0 items-center gap-1.5"><Icon className="size-4 shrink-0 text-ink-3" /><span className="min-w-0 break-words">{taskTitle(t, key)}</span></span>} />
              </li>
            )
          })}
          {value.picked.length === 0 && <li className="px-2 text-[12.5px] text-warn">{t('training.repeat.pickOne')}</li>}
        </ul>
      )}
    </div>
  )
}
