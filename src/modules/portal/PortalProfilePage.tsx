import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Info, Languages, LogOut, Monitor, Moon, ShieldCheck, Smartphone, Sun } from 'lucide-react'
import { repos } from '@/data'
import { useAuth } from '@/features/auth/store'
import { usePatientSession } from '@/features/session/useSession'
import { fadeUp, stagger } from '@/features/portal/motion'
import { usePortalOverview } from '@/features/portal/queries'
import { routes } from '@/shared/config/routes'
import { LOCALES } from '@/shared/i18n'
import { useTheme, type ThemeMode } from '@/shared/theme/ThemeProvider'
import { fmtDate, fmtPhone } from '@/shared/lib/format'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  MotionItem,
  MotionList,
  Page,
  PageHeader,
  Segmented,
  Skeleton,
} from '@/shared/ui'

function InfoRow({ label, value }: { label: ReactNode; value?: ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-[13.5px]">
      <dt className="text-ink-3 shrink-0">{label}</dt>
      <dd className="text-ink min-w-0 break-words text-right font-medium">{value}</dd>
    </div>
  )
}

export default function PortalProfilePage() {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const session = usePatientSession()
  const logoutPatient = useAuth((s) => s.logoutPatient)
  const { mode, setMode } = useTheme()
  const [confirm, setConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const overviewQ = usePortalOverview(session.patientId)
  const p = overviewQ.data?.patient
  const districtsQ = useQuery({
    queryKey: ['portal', 'districts', p?.address?.regionId] as const,
    queryFn: () => repos.patients.districts(p?.address?.regionId),
    enabled: !!p?.address?.districtId,
    staleTime: Infinity,
  })
  const districtName = districtsQ.data?.find((d) => d.id === p?.address?.districtId)?.name
  const address = [districtName, p?.address?.street].filter(Boolean).join(', ')
  const cur = i18n.language?.slice(0, 2) ?? 'uz'

  const logout = async () => {
    setLeaving(true)
    await logoutPatient()
    nav(routes.home)
  }

  return (
    <Page width="narrow" className="2xl:max-w-4xl">
      <PageHeader title={t('portal.profile.title')} description={t('portal.profile.subtitle')} />
      <MotionList
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        <MotionItem variants={fadeUp}>
          <Card className="flex items-center gap-4 max-xs:flex-col max-xs:items-start max-xs:gap-3">
            <Avatar name={session.fullName} size="xl" />
            <div className="min-w-0 flex-1">
              <p className="break-words text-[18px] font-semibold tracking-tight">
                {session.fullName}
              </p>
              <p className="tabular text-ink-3 mt-0.5 text-[13.5px]">{fmtPhone(session.phone)}</p>
              {overviewQ.data && (
                <p className="text-ink-3 mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                  <span>
                    {t('portal.profile.statsOrders')}:{' '}
                    <span className="tabular text-ink-2 font-medium">
                      {overviewQ.data.orders.length}
                    </span>
                  </span>
                  <span>
                    {t('portal.profile.statsResults')}:{' '}
                    <span className="tabular text-ink-2 font-medium">
                      {overviewQ.data.documents.length}
                    </span>
                  </span>
                  {p?.createdAt && (
                    <span>
                      {t('portal.profile.statsSince', { date: fmtDate(p.createdAt, 'LLLL yyyy') })}
                    </span>
                  )}
                </p>
              )}
            </div>
          </Card>
        </MotionItem>

        <MotionItem variants={fadeUp}>
          <Card padded={false} className="px-4 py-3 xs:px-5">
            <h2 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
              {t('portal.profile.info')}
            </h2>
            {p ? (
              <dl className="divide-line divide-y">
                <InfoRow label={t('common.fullName')} value={p.fullName} />
                <InfoRow label={t('common.phone')} value={fmtPhone(p.phone)} />
                <InfoRow
                  label={t('common.birthDate')}
                  value={p.birthDate ? fmtDate(p.birthDate) : undefined}
                />
                <InfoRow
                  label={t('common.gender')}
                  value={p.gender ? t(`common.${p.gender}`) : undefined}
                />
                <InfoRow label={t('common.address')} value={address} />
                <InfoRow label={t('portal.profile.passport')} value={p.passportNumber} />
                <InfoRow label={t('portal.profile.pinfl')} value={p.pinfl} />
                <InfoRow label={t('portal.profile.workplace')} value={p.workplace} />
                <InfoRow label={t('portal.profile.contract')} value={p.contractNumber} />
              </dl>
            ) : (
              <div className="space-y-3 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-3.5" />
                ))}
              </div>
            )}
            <p className="bg-surface-2 text-ink-2 mt-3 mb-1 flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px] leading-relaxed">
              <Info className="text-ink-3 mt-0.5 size-3.5 shrink-0" />
              {t('portal.profile.editNote')}
            </p>
          </Card>
        </MotionItem>

        <MotionItem variants={fadeUp}>
          <Card padded={false} className="px-4 py-3 xs:px-5">
            <h2 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
              {t('portal.profile.login')}
            </h2>
            <div className="flex flex-wrap items-center gap-3 py-2">
              <span className="bg-brand-soft text-brand-ink grid size-10 place-items-center rounded-xl">
                <Smartphone className="size-[18px]" />
              </span>
              <div className="min-w-[150px] flex-1">
                <p className="text-[14px] font-medium">{t('portal.profile.loginPhone')}</p>
                <p className="tabular text-ink-3 text-[12.5px]">{fmtPhone(session.phone)}</p>
              </div>
              <Badge tone="ok" size="sm">
                <ShieldCheck className="size-3" /> {t('portal.profile.loginLinked')}
              </Badge>
            </div>
          </Card>
        </MotionItem>

        <MotionItem variants={fadeUp}>
          <Card padded={false} className="px-4 py-3 xs:px-5">
            <h2 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">
              {t('portal.profile.preferences')}
            </h2>
            <div className="divide-line divide-y">
              <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="inline-flex items-center gap-2 text-[14px] font-medium">
                  <Languages className="text-ink-3 size-4" /> {t('portal.profile.language')}
                </span>
                <Segmented
                  size="sm"
                  className="max-w-full"
                  value={cur}
                  onChange={(v) => void i18n.changeLanguage(v)}
                  items={LOCALES.map((l) => ({ value: l.code, label: l.short }))}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="inline-flex items-center gap-2 text-[14px] font-medium">
                  <Sun className="text-ink-3 size-4" /> {t('portal.profile.theme')}
                </span>
                <Segmented<ThemeMode>
                  size="sm"
                  className="max-w-full max-xs:w-full max-xs:[&>button]:flex-1 max-xs:[&>button]:justify-center max-xs:[&>button]:px-1.5"
                  value={mode}
                  onChange={(v) => setMode(v)}
                  items={[
                    { value: 'light', label: t('portal.profile.themeLight'), icon: <Sun /> },
                    { value: 'dark', label: t('portal.profile.themeDark'), icon: <Moon /> },
                    { value: 'system', label: t('portal.profile.themeSystem'), icon: <Monitor /> },
                  ]}
                />
              </div>
            </div>
          </Card>
        </MotionItem>

        <motion.div variants={fadeUp} className="pt-2">
          <Button
            variant="secondary"
            block
            leftIcon={<LogOut className="size-4" />}
            onClick={() => setConfirm(true)}
            className="text-danger hover:bg-danger-soft/60"
          >
            {t('portal.profile.logout')}
          </Button>
        </motion.div>
      </MotionList>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => void logout()}
        title={t('portal.profile.logoutTitle')}
        description={t('portal.profile.logoutText')}
        confirmText={t('portal.profile.logout')}
        cancelText={t('common.cancel')}
        loading={leaving}
      />
    </Page>
  )
}
