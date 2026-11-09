/**
 * The card of one organisation unit: the administered unit itself (`/admin/unit`) or a unit under it
 * (`/admin/units/:unitId`). Path, level, profile, counts, the effective settings and the channels (SMS account,
 * SMS texts, Telegram). Editing the profile needs `admin.unit.write` (a sub-unit: `admin.unit.manage` too),
 * the settings cards `admin.settings.write`; a superadmin can reset the unit and everything under it.
 */
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, Eraser, Hospital, ImagePlus, Landmark, Mail, Map as MapIcon, MapPin, Pencil, Phone, Trash2, UserCog } from 'lucide-react'
import type { Locale, OrgUnit } from '@/domain'
import { unitsUnder } from '@/domain'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnit, useUnitTree, useUpdateUnit } from '@/features/org/queries'
import { UnitBreadcrumb } from '@/features/org/UnitBreadcrumb'
import { UnitDrawer } from '@/features/org/UnitDrawer'
import { UnitSmsAccountCard } from '@/features/org/UnitSmsAccountCard'
import { SmsTemplatesCard } from '@/features/org/SmsTemplatesCard'
import { DocumentLinkCard } from '@/features/org/DocumentLinkCard'
import { TelegramCard } from '@/features/org/TelegramCard'
import { ResetDialog } from '@/features/org/ResetDialog'
import { locationText } from '@/features/org/LocationFields'
import { UnitLevelBadge, useUnitLabels } from '@/features/org/unitUi'
import { routes } from '@/shared/config/routes'
import { LOCALES } from '@/shared/i18n'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime, fmtNumber } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, Field, MotionItem, MotionList, Page, PageHeader, Select, Skeleton, Stat, fadeUp, stagger, toast } from '@/shared/ui'

export default function UnitPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { unitId: paramId } = useParams()
  const { scopeId } = useAdminScope()
  const { can, canReset } = usePermissions()
  const id = paramId ?? scopeId
  const isScopeUnit = id === scopeId
  const tree = useUnitTree()
  const under = useMemo(() => (tree.data ? unitsUnder(tree.data, scopeId) : []), [tree.data, scopeId])
  const inScope = !tree.data || under.some((u) => u.id === id)
  const unit = useUnit(inScope ? id : null)
  const labels = useUnitLabels()
  const canEdit = can('admin.unit.write') || (!isScopeUnit && can('admin.unit.manage'))
  const canSettings = can('admin.settings.write')
  const [edit, setEdit] = useState(false)
  const [reset, setReset] = useState(false)
  const u = unit.data

  if (tree.data && !inScope) {
    return (
      <Page width="medium">
        <Card><EmptyState icon={<Landmark />} title={t('admin.unit.notFound')} description={t('admin.unit.notInScope')} action={<Button variant="secondary" onClick={() => nav(routes.admin.units)}>{t('admin.unit.backToList')}</Button>} /></Card>
      </Page>
    )
  }

  return (
    <Page width="medium">
      {tree.data && u && <UnitBreadcrumb units={tree.data} unitId={u.id} className="mb-2" linkTo={(a) => (under.some((x) => x.id === a.id) ? (a.id === scopeId ? routes.admin.unit : routes.admin.unitDetail(a.id)) : undefined)} />}
      <PageHeader title={u?.name ?? <Skeleton className="h-8 w-56" />} description={u ? labels.of(u) : undefined}
        actions={u && (
          <>
            {canReset && <Button variant="ghost" className="text-danger hover:bg-danger-soft" leftIcon={<Eraser className="size-4" />} onClick={() => setReset(true)} data-unit-reset>{t(u.level === 'facility' ? 'admin.reset.facilityAction' : 'admin.reset.unitAction')}</Button>}
            {canEdit && <Button leftIcon={<Pencil className="size-4" />} onClick={() => setEdit(true)} data-unit-edit>{t('common.edit')}</Button>}
          </>
        )} />

      {!u ? (
        <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>
      ) : (
        <div className="flex flex-col gap-5">
          <HeaderCard unit={u} canEdit={canEdit} />

          {/* what is under it */}
          <MotionList variants={stagger} initial="hidden" animate="show" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,150px),1fr))] gap-3 sm:gap-4">
            {[
              u.level === 'country' && { key: 'regions', label: t('admin.unit.counts.regions'), value: u.counts.regions, icon: <MapIcon />, tone: 'brand' as const },
              (u.level === 'country' || u.level === 'region') && { key: 'districts', label: t('admin.unit.counts.districts'), value: u.counts.districts, icon: <MapPin />, tone: 'info' as const },
              u.level !== 'facility' && { key: 'facilities', label: t('admin.unit.counts.facilities'), value: u.counts.facilities, icon: <Hospital />, tone: 'ok' as const },
              { key: 'employees', label: t('admin.unit.counts.employees'), value: u.counts.employees, icon: <UserCog />, tone: 'accent' as const },
            ].filter((x): x is Exclude<typeof x, false> => !!x).map((s) => (
              <MotionItem key={s.key} variants={fadeUp}>
                <Link to={s.key === 'employees' ? routes.admin.employees : routes.admin.units} className="block rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                  <Stat label={s.label} value={fmtNumber(s.value)} icon={s.icon} tone={s.tone} />
                </Link>
              </MotionItem>
            ))}
          </MotionList>

          <ProfileCard unit={u} />
          <SettingsCard unit={u} readOnly={!canSettings} />
          <DocumentLinkCard unit={u} readOnly={!canSettings} />
          <UnitSmsAccountCard unit={u} readOnly={!canSettings} />
          <SmsTemplatesCard unit={u} subtreeCount={Math.max(0, unitsUnder(tree.data ?? [], u.id).length - 1)} readOnly={!canSettings} />
          <TelegramCard unit={u} readOnly={!canSettings} />

          <Card className="bg-surface-2/40">
            <CardHeader title={t('admin.unit.readonly')} />
            <dl className="grid gap-x-8 gap-y-3 grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] text-[13.5px]">
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.unit.id')}</dt><dd className="font-mono mt-0.5 break-all">{u.id}</dd></div>
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.unit.createdAt')}</dt><dd className="tabular mt-0.5">{fmtDateTime(u.createdAt)}</dd></div>
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.unit.updatedAt')}</dt><dd className="tabular mt-0.5">{fmtDateTime(u.updatedAt)}</dd></div>
            </dl>
          </Card>
        </div>
      )}

      <UnitDrawer open={edit} onClose={() => setEdit(false)} unit={u} units={tree.data} />
      <ResetDialog unitId={u?.id ?? null} open={reset} onClose={() => setReset(false)} />
    </Page>
  )
}

/** Logo, name, badges, contacts — the logo is editable in place (a data URL, 1 MB at most). */
function HeaderCard({ unit: u, canEdit }: { unit: OrgUnit; canEdit: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateUnit()
  const fileRef = useRef<HTMLInputElement>(null)
  const setLogo = async (logoUrl: string | null) => {
    try {
      await update.mutateAsync({ id: u.id, logoUrl })
      toast.success(t('admin.unit.saved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > 1024 * 1024) return toast.error(t('admin.unit.tooLarge'))
    const reader = new FileReader()
    reader.onload = () => void setLogo(String(reader.result))
    reader.readAsDataURL(f)
  }
  return (
    <Card className="relative overflow-hidden" data-unit-header>
      <div aria-hidden className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-brand/8 blur-3xl" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
        <div className="relative shrink-0 self-start">
          <Avatar name={u.name} src={u.logoUrl ?? undefined} size="xl" className="size-20 rounded-2xl text-[26px]" />
          {canEdit && (
            <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1.5 -right-1.5 grid size-8 place-items-center rounded-full border border-line bg-bg-elevated text-ink-2 shadow-2 transition-colors hover:text-ink" aria-label={t('admin.unit.upload')}>
              <ImagePlus className="size-4" />
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-[20px] font-semibold tracking-tight">{u.name}</h2>
            <UnitLevelBadge unit={u} size="md" />
            {u.code && <Badge tone="neutral" className="font-mono">{u.code}</Badge>}
            <Badge tone={u.isActive ? 'ok' : 'neutral'} dot>{u.isActive ? t('common.active') : t('common.inactive')}</Badge>
          </div>
          {(u.legalName || u.shortName) && <p className="mt-0.5 text-[13.5px] text-ink-3">{[u.shortName, u.legalName].filter(Boolean).join(' · ')}</p>}
          <div className="mt-2 flex min-w-0 flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-2">
            {u.address && <span className="inline-flex min-w-0 items-center gap-1.5 break-words"><MapPin className="size-3.5 shrink-0 text-ink-3" />{u.address}</span>}
            {u.phone && <span className="inline-flex items-center gap-1.5 tabular"><Phone className="size-3.5 text-ink-3" />{u.phone}</span>}
            {u.email && <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5 text-ink-3" />{u.email}</span>}
            <span className="inline-flex items-center gap-1.5 text-ink-3"><Clock className="size-3.5" />{u.timezone}</span>
          </div>
          {canEdit && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="xs" variant="secondary" leftIcon={<ImagePlus className="size-3.5" />} loading={update.isPending} onClick={() => fileRef.current?.click()}>{t('admin.unit.upload')}</Button>
              {u.logoUrl && <Button type="button" size="xs" variant="ghost" leftIcon={<Trash2 className="size-3.5" />} onClick={() => void setLogo(null)}>{t('admin.unit.removeLogo')}</Button>}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProfileCard({ unit: u }: { unit: OrgUnit }) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const row = (label: string, value: string | null | undefined, mono?: boolean) => (
    <div className="min-w-0"><dt className="text-[12.5px] text-ink-3">{label}</dt><dd className={mono ? 'mt-0.5 break-all font-mono' : 'mt-0.5 break-words'}>{value || t('common.notSet')}</dd></div>
  )
  return (
    <Card data-unit-profile>
      <CardHeader title={t('admin.unit.profile')} />
      <dl className="grid gap-x-8 gap-y-3 grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] text-[13.5px]">
        {row(t('admin.unit.name'), u.name)}
        {row(t('admin.unit.shortName'), u.shortName)}
        {row(t('admin.unit.legalName'), u.legalName)}
        {row(t('admin.unit.level'), labels.level(u.level))}
        {u.level === 'facility' && row(t('admin.unit.kind'), u.kind ? labels.kind(u.kind) : null)}
        {u.level === 'facility' && row(t('admin.unit.code'), u.code, true)}
        {row(t('admin.unit.location'), locationText(u))}
        {row(t('admin.unit.address'), u.address)}
        {row(t('admin.unit.phone'), u.phone)}
        {row(t('admin.unit.email'), u.email)}
        {row(t('admin.unit.timezone'), u.timezone)}
        {row(t('admin.unit.path'), u.path)}
      </dl>
    </Card>
  )
}

/** Effective settings (inherited + own); the UI language of the unit's documents and SMS is editable here. */
function SettingsCard({ unit: u, readOnly }: { unit: OrgUnit; readOnly: boolean }) {
  const { t } = useTranslation()
  const update = useUpdateUnit()
  const own = u.settings?.own ?? {}
  const ownLocale = 'locale' in own
  const setLocale = async (v: string) => {
    try {
      await update.mutateAsync({ id: u.id, locale: (v || null) as Locale | null })
      toast.success(t('admin.unit.localeSaved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const days = u.settings?.documentFreeViewDays ?? 0
  return (
    <Card data-unit-settings>
      <CardHeader title={t('admin.unit.settings')} description={t('admin.unit.settingsSub')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.unit.locale')} hint={ownLocale ? t('admin.unit.ownValue') : t('admin.unit.inheritedValue')}>
          {(id) => (
            <Select id={id} value={(u.settings?.locale as string | null) ?? ''} disabled={readOnly || update.isPending} onChange={(e) => void setLocale(e.target.value)} data-unit-locale>
              <option value="">{t('admin.unit.localeInherit')}</option>
              {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('admin.unit.docFreeView')} hint={'documentFreeViewDays' in own ? t('admin.unit.ownValue') : t('admin.unit.inheritedValue')}>
          {() => (
            <div className="flex h-10 items-center gap-2 rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 text-[14px]">
              {days > 0 ? <Badge tone="warn" dot>{t('admin.docLink.badgeOn', { n: days })}</Badge> : <Badge tone="ok" dot>{t('admin.docLink.badgeOff')}</Badge>}
            </div>
          )}
        </Field>
      </div>
    </Card>
  )
}
