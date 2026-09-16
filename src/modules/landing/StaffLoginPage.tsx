import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
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
    <AuthLayout>
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
