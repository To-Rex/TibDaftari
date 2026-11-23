/**
 * The cards of the top of the tree on the platform page: a company, a country (of one company, or of every company
 * together), the dashed card that adds one more, and the doorway to the all-companies view. A card is entered with
 * a click (or Enter); «Boshqarish» opens the admin panel for that unit instead.
 */
import type { KeyboardEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowRight, BriefcaseBusiness, Globe2, Layers3, Plus, Settings2 } from 'lucide-react'
import type { OrgUnit, UnitRow } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { fmtMoney, fmtNumber } from '@/shared/lib/format'
import { Avatar, Badge, Button, Skeleton } from '@/shared/ui'

/** what is known about the activity numbers right now */
export type StatsState = 'loading' | 'ready' | 'failed'

const enterKeys = (go: () => void) => (e: KeyboardEvent<HTMLElement>) => {
  if (e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go() }
}

/** The common frame: the whole card leads one level down. */
function CardShell({ onOpen, children, className, ...data }: { onOpen: () => void; children: ReactNode; className?: string } & Record<`data-${string}`, string | undefined>) {
  return (
    <article role="button" tabIndex={0} onClick={onOpen} onKeyDown={enterKeys(onOpen)} {...data}
      className={cn('app-card group relative flex min-w-0 cursor-pointer flex-col rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-1 outline-offset-2 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-2 sm:p-5', className)}>
      {children}
    </article>
  )
}

/** Three or four small counters in one band. */
function Counters({ items }: { items: { label: string; value: number }[] }) {
  return (
    <dl className={cn('mt-4 grid gap-1 rounded-xl bg-surface-2/60 px-2 py-2.5 text-center', items.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
      {items.map((x) => (
        <div key={x.label} className="min-w-0">
          <dd className="text-[17px] font-semibold leading-tight tabular">{fmtNumber(x.value)}</dd>
          <dt className="truncate text-[11.5px] text-ink-3">{x.label}</dt>
        </div>
      ))}
    </dl>
  )
}

/** The money of the period, the cheques, and the part of the whole level it makes. */
function Activity({ row, share, stats }: { row?: UnitRow; share?: number; stats: StatsState }) {
  const { t } = useTranslation()
  if (stats === 'loading' && !row) return <div className="mt-4 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-6 w-40" /><Skeleton className="h-1.5 w-full" /></div>
  if (stats === 'failed') return <p className="mt-4 text-[12.5px] text-ink-3">{t('admin.platform.statsFailed')}</p>
  const revenue = row?.revenue ?? 0
  return (
    <div className="mt-4" data-card-activity>
      <div className="flex items-baseline justify-between gap-2 text-[12px] text-ink-3">
        <span>{t('admin.platform.metrics.revenue')}</span>
        {share !== undefined && <span className="tabular">{t('admin.platform.share', { pct: share })}</span>}
      </div>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-[21px] font-semibold leading-tight tracking-tight tabular">{fmtMoney(revenue, false)}</span>
        <span className="text-[13px] text-ink-3">{t('common.sum')}</span>
        <span className="ml-auto text-[12.5px] text-ink-3 tabular">{t('admin.platform.ordersCount', { count: row?.orders ?? 0 })}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-strong transition-[width] duration-500" style={{ width: `${Math.max(revenue > 0 ? 3 : 0, share ?? 0)}%` }} />
      </div>
    </div>
  )
}

/** "Davlatlarini ko'rish →" and, when the unit can be managed, «Boshqarish». */
function Footer({ drill, onManage, manageTitle }: { drill: string; onManage?: () => void; manageTitle?: string }) {
  const { t } = useTranslation()
  return (
    <>
    {/* the footer sits at the bottom of a card stretched by its row, never closer than 1rem to what is above */}
    <span className="min-h-4 flex-1" aria-hidden />
    <footer className="flex items-center gap-2 border-t border-line pt-3.5">
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[13.5px] font-medium text-brand-ink">
        <span className="truncate">{drill}</span>
        <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </span>
      {onManage && (
        <Button size="xs" variant="ghost" className="ml-auto shrink-0" leftIcon={<Settings2 className="size-3.5" />} title={manageTitle ?? t('admin.platform.manageHint')}
          onClick={(e) => { e.stopPropagation(); onManage() }} data-platform-manage>
          {t('admin.platform.manage')}
        </Button>
      )}
    </footer>
    </>
  )
}

export function CompanyCard({ unit, countries, row, share, stats, onOpen, onManage }: {
  unit: OrgUnit
  /** its country nodes, in tree order */
  countries: OrgUnit[]
  row?: UnitRow
  share?: number
  stats: StatsState
  onOpen: () => void
  onManage?: () => void
}) {
  const { t } = useTranslation()
  return (
    <CardShell onOpen={onOpen} data-platform-card="company" data-id={unit.id}>
      <header className="flex items-start gap-3">
        <Avatar name={unit.name} src={unit.logoUrl ?? undefined} size="lg" className="rounded-2xl" />
        <div className="min-w-0 flex-1">
          <h3 className="flex min-w-0 items-center gap-2 text-[16px] font-semibold leading-snug">
            <span className="truncate">{unit.name}</span>
            {unit.code && <span className="shrink-0 font-mono text-[11px] font-normal text-ink-3">{unit.code}</span>}
          </h3>
          <p className="truncate text-[12.5px] text-ink-3">{unit.shortName || unit.legalName || t('admin.platform.level.company')}</p>
        </div>
        {!unit.isActive && <Badge tone="neutral" size="sm">{t('admin.platform.inactive')}</Badge>}
      </header>
      <div className="mt-3.5 flex min-h-6 flex-wrap gap-1.5" data-card-countries>
        {countries.length ? countries.slice(0, 4).map((c) => (
          <span key={c.id} className="inline-flex h-6 items-center gap-1 rounded-full bg-accent/12 px-2 text-[12px] font-medium text-accent"><Globe2 className="size-3" />{c.shortName || c.name}</span>
        )) : <span className="text-[12.5px] text-ink-3">{t('admin.platform.noCountries')}</span>}
        {countries.length > 4 && <Badge tone="neutral" size="sm">+{countries.length - 4}</Badge>}
      </div>
      <Counters items={[
        { label: t('admin.platform.counts.facilities'), value: unit.counts.facilities },
        { label: t('admin.platform.counts.employees'), value: unit.counts.employees },
        { label: t('admin.platform.counts.countries'), value: countries.length },
      ]} />
      <Activity row={row} share={share} stats={stats} />
      <Footer drill={t('admin.platform.drill.company')} onManage={onManage} />
    </CardShell>
  )
}

export function CountryCard({ title, subtitle, code, inactive, counts, row, share, stats, onOpen, onManage, companies }: {
  title: string
  subtitle?: string
  /** the country's code (UZ) — its badge */
  code?: string | null
  inactive?: boolean
  counts: { regions: number; districts: number; facilities: number; employees: number }
  row?: UnitRow
  share?: number
  stats: StatsState
  onOpen: () => void
  onManage?: () => void
  /** the all-companies view: the companies that work here, each a way into its own part of this country */
  companies?: { id: string; name: string; onOpen: () => void }[]
}) {
  const { t } = useTranslation()
  return (
    <CardShell onOpen={onOpen} data-platform-card="country" data-id={code ?? title}>
      <header className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent/20 to-brand/15 font-mono text-[14px] font-bold text-ink ring-1 ring-line">{code || <Globe2 className="size-5 text-accent" />}</span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[16px] font-semibold leading-snug">{title}</h3>
          {subtitle && <p className="truncate text-[12.5px] text-ink-3">{subtitle}</p>}
        </div>
        {inactive && <Badge tone="neutral" size="sm">{t('admin.platform.inactive')}</Badge>}
      </header>
      {companies && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5" data-card-companies>
          <span className="text-[12px] text-ink-3">{t('admin.platform.companiesHere')}</span>
          {companies.map((c) => (
            <button key={c.id} type="button" onClick={(e) => { e.stopPropagation(); c.onOpen() }} title={t('admin.platform.openCompanyHere', { name: c.name })}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-line bg-surface-2/60 px-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-brand/50 hover:text-ink" data-card-company={c.id}>
              <BriefcaseBusiness className="size-3 text-brand" />{c.name}
            </button>
          ))}
        </div>
      )}
      <Counters items={[
        { label: t('admin.platform.counts.regions'), value: counts.regions },
        { label: t('admin.platform.counts.districts'), value: counts.districts },
        { label: t('admin.platform.counts.facilities'), value: counts.facilities },
        { label: t('admin.platform.counts.employees'), value: counts.employees },
      ]} />
      <Activity row={row} share={share} stats={stats} />
      <Footer drill={t('admin.platform.drill.country')} onManage={onManage} />
    </CardShell>
  )
}

/** The dashed card at the end of a list: one more company / country. */
export function AddCard({ title, hint, onClick, ...data }: { title: string; hint: string; onClick: () => void } & Record<`data-${string}`, string | undefined>) {
  return (
    <button type="button" onClick={onClick} {...data}
      className="group flex min-h-[13rem] flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-line-strong/60 bg-transparent p-5 text-center transition-colors hover:border-brand/60 hover:bg-brand-soft/25">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand transition-transform group-hover:scale-105"><Plus className="size-6" /></span>
      <span className="text-[14.5px] font-semibold">{title}</span>
      <span className="max-w-[16rem] text-[12.5px] leading-relaxed text-ink-3">{hint}</span>
    </button>
  )
}

/** The doorway from the companies to every company together, folded by territory. */
export function AllCompaniesLink({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button type="button" onClick={onClick} data-platform-all
      className="group flex w-full items-center gap-3.5 rounded-[var(--radius-lg)] border border-line bg-gradient-to-r from-surface to-brand-soft/30 px-4 py-3.5 text-left transition-colors hover:border-brand/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand"><Layers3 className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{t('admin.platform.allCompaniesLens.title')}</span>
        <span className="block text-[12.5px] text-ink-3">{t('admin.platform.allCompaniesLens.body')}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
    </button>
  )
}
