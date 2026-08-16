import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check, Minus, X } from 'lucide-react'
import { PERMISSIONS, permissionsByModule, resolvePermissions, type Permission, type PermissionModule, type PermissionOverrides } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Checkbox, EmptyState, MotionItem, MotionList, fadeUp, stagger } from '@/shared/ui'
import { MODULE_ORDER, moduleLabel, permissionLabel } from './permissionLabels'

type RoleModeProps = { mode: 'role'; value: Permission[]; onChange: (v: Permission[]) => void }
type OverrideModeProps = { mode: 'override'; rolePermissions: Permission[]; overrides: PermissionOverrides; onChange: (o: PermissionOverrides) => void }
export type PermissionMatrixProps = (RoleModeProps | OverrideModeProps) & { search?: string; readOnly?: boolean; className?: string }

type OverrideState = 'inherit' | 'allow' | 'deny'

/**
 * Permission matrix grouped by module.
 * - role mode: checkbox per permission + module-level select-all.
 * - override mode: 3-state control per permission (inherit / force allow / force deny) + effective preview.
 */
export function PermissionMatrix(props: PermissionMatrixProps) {
  const { t } = useTranslation()
  const { search = '', readOnly, className } = props
  const grouped = useMemo(() => permissionsByModule(), [])

  const modules = useMemo(() => {
    const q = search.trim().toLowerCase()
    return MODULE_ORDER
      .filter((m) => grouped[m]?.length)
      .map((m) => ({
        mod: m,
        perms: grouped[m].filter((p) => !q || p.includes(q) || permissionLabel(t, p).toLowerCase().includes(q) || moduleLabel(t, m).toLowerCase().includes(q)),
      }))
      .filter((g) => g.perms.length)
  }, [grouped, search, t])

  if (!modules.length) return <EmptyState title={t('admin.roles.noMatch')} description={t('common.emptyHint')} className="py-10" />

  return (
    <MotionList variants={stagger} initial="hidden" animate="show" className={cn('flex flex-col gap-4', className)}>
      {modules.map(({ mod, perms }) => (
        <MotionItem key={mod} variants={fadeUp} className="rounded-[var(--radius)] border border-line bg-surface overflow-hidden">
          {props.mode === 'role' ? (
            <RoleGroup mod={mod} perms={perms} value={props.value} onChange={props.onChange} readOnly={readOnly} />
          ) : (
            <OverrideGroup mod={mod} perms={perms} rolePermissions={props.rolePermissions} overrides={props.overrides} onChange={props.onChange} readOnly={readOnly} />
          )}
        </MotionItem>
      ))}
    </MotionList>
  )
}

/* ------------------------------ role mode ------------------------------ */

function RoleGroup({ mod, perms, value, onChange, readOnly }: { mod: PermissionModule; perms: Permission[]; value: Permission[]; onChange: (v: Permission[]) => void; readOnly?: boolean }) {
  const { t } = useTranslation()
  const set = new Set(value)
  const checked = perms.filter((p) => set.has(p)).length
  const all = checked === perms.length
  const toggleAll = () => {
    const next = new Set(value)
    perms.forEach((p) => (all ? next.delete(p) : next.add(p)))
    onChange(PERMISSIONS.filter((p) => next.has(p)))
  }
  const toggle = (p: Permission) => {
    const next = new Set(value)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    onChange(PERMISSIONS.filter((x) => next.has(x)))
  }
  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 h-11 bg-surface-2/60 border-b border-line">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold text-ink">{moduleLabel(t, mod)}</span>
          <span className="text-[12px] tabular text-ink-3">{checked}/{perms.length}</span>
        </div>
        {!readOnly && (
          <Checkbox className="text-[12.5px] text-ink-2" checked={all} onChange={toggleAll} label={t('admin.roles.selectAll')} />
        )}
      </div>
      <ul className="divide-y divide-line/70">
        {perms.map((p) => {
          const on = set.has(p)
          return (
            <li key={p} className={cn('flex items-center justify-between gap-3 px-4 h-11 transition-colors', !readOnly && 'hover:bg-surface-2/50')}>
              <label className={cn('flex items-center gap-3 flex-1 min-w-0', !readOnly && 'cursor-pointer')}>
                {readOnly ? (
                  <span className={cn('grid size-[18px] place-items-center rounded-[5px]', on ? 'bg-brand text-white' : 'border border-line-strong')}>{on && <Check className="size-3" />}</span>
                ) : (
                  <Checkbox checked={on} onChange={() => toggle(p)} />
                )}
                <span className="flex flex-col min-w-0">
                  <span className={cn('text-[13.5px] leading-5', on ? 'text-ink' : 'text-ink-2')}>{permissionLabel(t, p)}</span>
                  <span className="text-[11.5px] font-mono text-ink-3 truncate">{p}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/* ---------------------------- override mode ---------------------------- */

function OverrideGroup({ mod, perms, rolePermissions, overrides, onChange, readOnly }: { mod: PermissionModule; perms: Permission[]; rolePermissions: Permission[]; overrides: PermissionOverrides; onChange: (o: PermissionOverrides) => void; readOnly?: boolean }) {
  const { t } = useTranslation()
  const roleSet = new Set(rolePermissions)
  const effective = resolvePermissions({ permissions: rolePermissions }, overrides)
  const stateOf = (p: Permission): OverrideState => (overrides.allow.includes(p) ? 'allow' : overrides.deny.includes(p) ? 'deny' : 'inherit')
  const setState = (p: Permission, s: OverrideState) => {
    const allow = overrides.allow.filter((x) => x !== p)
    const deny = overrides.deny.filter((x) => x !== p)
    if (s === 'allow') allow.push(p)
    if (s === 'deny') deny.push(p)
    onChange({ allow: PERMISSIONS.filter((x) => allow.includes(x)), deny: PERMISSIONS.filter((x) => deny.includes(x)) })
  }
  const items: { value: OverrideState; label: string; icon: typeof Check }[] = [
    { value: 'inherit', label: t('admin.perms.inherit'), icon: Minus },
    { value: 'allow', label: t('admin.perms.allow'), icon: Check },
    { value: 'deny', label: t('admin.perms.deny'), icon: X },
  ]
  return (
    <>
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 h-11 bg-surface-2/60 border-b border-line text-[12px] uppercase tracking-[0.05em] text-ink-3">
        <span className="text-[13px] normal-case tracking-normal font-semibold text-ink">{moduleLabel(t, mod)}</span>
        <span aria-hidden />
        <span className="w-16 text-right">{t('admin.perms.effective')}</span>
      </div>
      <ul className="divide-y divide-line/70">
        {perms.map((p) => {
          const st = stateOf(p)
          const inRole = roleSet.has(p)
          const eff = effective.has(p)
          return (
            <li key={p} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2 min-h-11">
              <span className="flex flex-col min-w-0">
                <span className="text-[13.5px] leading-5 text-ink truncate">{permissionLabel(t, p)}</span>
                <span className="text-[11.5px] text-ink-3 truncate">
                  <span className="font-mono">{p}</span>
                  <span className="mx-1.5">·</span>
                  {t('admin.perms.fromRole')}: {inRole ? t('admin.perms.granted') : t('admin.perms.denied')}
                </span>
              </span>
              <div role="radiogroup" className={cn('inline-flex items-center rounded-[9px] bg-surface-2 p-0.5 gap-0.5', readOnly && 'opacity-60 pointer-events-none')}>
                {items.map((it) => {
                  const active = st === it.value
                  const Icon = it.icon
                  return (
                    <button key={it.value} type="button" role="radio" aria-checked={active} onClick={() => setState(p, it.value)} title={it.label}
                      className={cn('relative h-7 rounded-[7px] px-2 text-[12px] font-medium flex items-center gap-1 transition-colors whitespace-nowrap', active ? (it.value === 'deny' ? 'text-danger' : it.value === 'allow' ? 'text-ok' : 'text-ink') : 'text-ink-3 hover:text-ink-2')}>
                      {active && <motion.span layoutId={`ov-${p}`} className="absolute inset-0 rounded-[7px] bg-surface shadow-1 border border-line/70" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                      <span className="relative flex items-center gap-1"><Icon className="size-3.5" /><span className="max-sm:hidden">{it.label}</span></span>
                    </button>
                  )
                })}
              </div>
              <div className="w-16 flex justify-end">
                <Badge tone={eff ? 'ok' : 'neutral'} size="sm" dot>{eff ? t('admin.perms.granted') : t('admin.perms.denied')}</Badge>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
