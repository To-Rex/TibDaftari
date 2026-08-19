import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { Button, Field, Input, Badge, toast } from '@/shared/ui'
import { useAuth } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { ApiError } from '@/data'

const schema = z.object({ login: z.string().min(2), password: z.string().min(4) })
type Form = z.infer<typeof schema>

const DEMO = [
  { login: 'super', role: 'Superadmin' },
  { login: 'admin', role: 'Administrator' },
  { login: 'umida', role: 'Registrator' },
  { login: 'dilnoza', role: 'Laborant' },
  { login: 'ahmed', role: 'Vrach' },
]

export default function StaffLoginPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const loc = useLocation() as { state?: { from?: string } }
  const staffLogin = useAuth((s) => s.staffLogin)
  const [show, setShow] = useState(false)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { login: '', password: '' } })

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
    <AuthLayout
      aside={
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line-strong p-4 xs:p-5 sm:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('auth.demoAccounts')}</p>
          <p className="mt-1 text-[13px] text-ink-3">{t('auth.demoPassword')}</p>
          <ul className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2 2xl:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
            {DEMO.map((d) => (
              <li key={d.login}>
                <button type="button" onClick={() => { setValue('login', d.login); setValue('password', '123456') }} className="flex min-h-[44px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-brand hover:bg-brand-soft/40">
                  <span className="font-mono text-[13px]">{d.login}</span>
                  <Badge size="sm">{d.role}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <h1 className="text-[22px] font-semibold tracking-tight">{t('auth.staffTitle')}</h1>
      <p className="mt-1 text-[14px] text-ink-3">{t('auth.staffSubtitle')}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 flex flex-col gap-4" noValidate>
        <Field label={t('auth.login')} error={errors.login && t('common.required')}>
          {(id) => <Input id={id} autoComplete="username" autoFocus leftIcon={<UserRound />} invalid={!!errors.login} {...register('login')} />}
        </Field>
        <Field label={t('auth.password')} error={errors.password && t('common.required')}>
          {(id) => (
            <Input id={id} type={show ? 'text' : 'password'} autoComplete="current-password" leftIcon={<LockKeyhole />} invalid={!!errors.password}
              rightSlot={<button type="button" onClick={() => setShow((s) => !s)} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
              {...register('password')} />
          )}
        </Field>
        <Button type="submit" size="lg" block loading={isSubmitting} className="mt-2">{isSubmitting ? t('auth.signingIn') : t('auth.signIn')}</Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-ink-3">
        {t('auth.forPatients')} <Link to={routes.patientLogin} className="font-medium text-brand-ink hover:underline">{t('auth.patientLink')}</Link>
      </p>
    </AuthLayout>
  )
}
