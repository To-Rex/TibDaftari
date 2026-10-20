import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { StaffLoginAside } from './StaffLoginAside'
import { Button, Field, Input, toast } from '@/shared/ui'
import { useAuth } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { ApiError } from '@/data'

const schema = z.object({ login: z.string().min(2), password: z.string().min(4) })
type Form = z.infer<typeof schema>

export default function StaffLoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const staffLogin = useAuth((s) => s.staffLogin)
  const [show, setShow] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { login: '', password: '' } })

  const onSubmit = async (v: Form) => {
    try {
      const s = await staffLogin(v.login, v.password)
      // land in the module that fits THIS account; a remembered `from` of another user/module is ignored
      const home = s.roleKey === 'admin' || s.isSuperAdmin ? routes.admin.root : routes.app.root
      const from = loc.state?.from
      const dest = from && from.startsWith(home) ? from : home
      nav(dest, { replace: true })
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('common.error'))
    }
  }

  return (
    <AuthLayout variant="staff" aside={<StaffLoginAside />}>
      <div className="flex flex-col">
        <h1 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[30px]">{t('auth.staffTitle')}</h1>
        <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-2 sm:text-[14px]">{t('auth.staffSubtitle')}</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4" noValidate>
          <Field label={t('auth.login')} error={errors.login && t('common.required')}>
            {(id) => <Input id={id} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus leftIcon={<UserRound />} invalid={!!errors.login} className="h-12 text-[15px]" {...register('login')} />}
          </Field>
          <Field label={t('auth.password')} error={errors.password && t('common.required')}>
            {(id) => (
              <Input id={id} type={show ? 'text' : 'password'} autoComplete="current-password" leftIcon={<LockKeyhole />} invalid={!!errors.password} className="h-12 text-[15px]"
                rightSlot={<button type="button" aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} aria-pressed={show} onClick={() => setShow((s) => !s)} className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
                {...register('password')} />
            )}
          </Field>
          <Button type="submit" size="lg" block loading={isSubmitting} rightIcon={<ArrowRight className="size-4" />} className="mt-1 h-12 dark:text-bg">
            {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>

        <div className="mt-6 border-t border-line pt-5">
          <Link to={routes.patientLogin} className="group flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface-2/50 px-3.5 py-3 transition-colors hover:border-brand/40 hover:bg-brand-soft/30">
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-line"><UserRound className="size-4" /></span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink">{t('auth.forPatients')}</span>
                <span className="block text-[12px] text-ink-2">{t('auth.patientLink')}</span>
              </span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-ink" />
          </Link>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-ink-2">
          <ShieldCheck className="size-3.5 text-brand" />{t('auth.staffSecure')}
        </p>
      </div>
    </AuthLayout>
  )
}
