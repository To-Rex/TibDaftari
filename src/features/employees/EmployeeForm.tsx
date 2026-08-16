import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { Category, Employee, Id } from '@/domain'
import { MockError, repos } from '@/data'
import { usePermissions } from '@/features/auth/store'
import { useBranches } from '@/features/org/queries'
import { useRoles } from '@/features/roles/queries'
import { errorMessage } from '@/shared/lib/errors'
import { cn } from '@/shared/lib/cn'
import { Button, Checkbox, Field, Input, Select, Skeleton, Switch, toast } from '@/shared/ui'
import { useSaveEmployee } from './queries'

const schema = z
  .object({
    fullName: z.string().trim().min(2),
    login: z.string().trim().min(3).regex(/^[a-z0-9._-]+$/i),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    roleId: z.string().min(1),
    branchIds: z.array(z.string()),
    categoryIds: z.array(z.string()),
    password: z.string(),
    passwordConfirm: z.string(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.password && v.password.length < 6) ctx.addIssue({ code: 'custom', path: ['password'], message: 'short' })
    if (v.password !== v.passwordConfirm) ctx.addIssue({ code: 'custom', path: ['passwordConfirm'], message: 'mismatch' })
  })
type Values = z.infer<typeof schema>

/** Flatten a category tree into depth-annotated rows (parents first). */
function flattenTree(cats: Category[]): { cat: Category; depth: number }[] {
  const byParent = new Map<Id | null, Category[]>()
  cats.forEach((c) => byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]))
  const out: { cat: Category; depth: number }[] = []
  const walk = (parentId: Id | null, depth: number) => {
    ;(byParent.get(parentId) ?? []).sort((a, b) => a.order - b.order).forEach((c) => {
      out.push({ cat: c, depth })
      walk(c.id, depth + 1)
    })
  }
  walk(null, 0)
  return out
}

export function EmployeeForm({ companyId, employee, onSaved, onCancel, formId = 'employee-form' }: { companyId: Id; employee?: Employee; onSaved: (e: Employee) => void; onCancel?: () => void; formId?: string }) {
  const { t } = useTranslation()
  const { isSuperAdmin } = usePermissions()
  const isEdit = !!employee
  const roles = useRoles(companyId)
  const branches = useBranches(companyId)
  const categories = useQuery({ queryKey: ['categories', companyId], queryFn: () => repos.catalog.listCategories(companyId) })
  const save = useSaveEmployee()

  const defaults = useMemo<Values>(() => ({
    fullName: employee?.fullName ?? '', login: employee?.login ?? '', phone: employee?.phone ?? '', email: employee?.email ?? '',
    roleId: employee?.roleId ?? '', branchIds: employee?.branchIds ?? [], categoryIds: employee?.categoryIds ?? [],
    password: '', passwordConfirm: '', active: employee ? employee.status === 'active' : true,
  }), [employee])

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults, mode: 'onBlur' })
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = form
  useEffect(() => reset(defaults), [defaults, reset])

  const tree = useMemo(() => flattenTree(categories.data ?? []), [categories.data])
  const visibleRoles = (roles.data ?? []).filter((r) => r.key !== 'superadmin' || isSuperAdmin || employee?.roleId === r.id)

  const submit = handleSubmit(async (v) => {
    if (!isEdit && !v.password) return setError('password', { message: 'short' })
    try {
      const saved = await save.mutateAsync({
        companyId, id: employee?.id, fullName: v.fullName, login: v.login, phone: v.phone || undefined, email: v.email || undefined,
        roleId: v.roleId, branchIds: v.branchIds, categoryIds: v.categoryIds, status: v.active ? 'active' : 'inactive',
        password: v.password || undefined,
      })
      toast.success(isEdit ? t('admin.employees.saved') : t('admin.employees.created'))
      onSaved(saved)
    } catch (e) {
      if (e instanceof MockError && e.status === 409) setError('login', { message: 'taken' })
      else toast.error(errorMessage(e))
    }
  })

  const pwErr = (m?: string) => (m === 'short' ? t('admin.employees.passwordShort') : m === 'mismatch' ? t('admin.employees.passwordMismatch') : m ? t('common.required') : undefined)

  return (
    <form id={formId} onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.employees.fullName')} required error={errors.fullName && t('common.required')} className="sm:col-span-2">
          {(id) => <Input id={id} autoFocus={!isEdit} {...register('fullName')} invalid={!!errors.fullName} />}
        </Field>
        <Field label={t('admin.employees.login')} required hint={t('admin.employees.loginHint')} error={errors.login && (errors.login.message === 'taken' ? t('admin.employees.loginTaken') : t('common.required'))}>
          {(id) => <Input id={id} mono autoComplete="off" {...register('login')} invalid={!!errors.login} />}
        </Field>
        <Field label={t('admin.employees.role')} required error={errors.roleId && t('common.required')} hint={!isSuperAdmin ? t('admin.employees.superadminOnly') : undefined}>
          {(id) => (
            <Select id={id} {...register('roleId')} invalid={!!errors.roleId} disabled={roles.isLoading}>
              <option value="">{t('common.select')}</option>
              {visibleRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('admin.employees.phone')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} placeholder="+998 90 000-00-00" {...register('phone')} />}
        </Field>
        <Field label={t('admin.employees.email')} optionalText={t('common.optional')} error={errors.email && t('admin.company.invalidEmail')}>
          {(id) => <Input id={id} type="email" {...register('email')} invalid={!!errors.email} />}
        </Field>
      </div>

      <Field label={t('admin.employees.branches')} hint={t('admin.employees.branchesHint')}>
        {() => (
          <Controller control={control} name="branchIds" render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {branches.isLoading && <Skeleton className="h-9 w-40" />}
              {(branches.data ?? []).map((b) => {
                const on = field.value.includes(b.id)
                return (
                  <button type="button" key={b.id} onClick={() => field.onChange(on ? field.value.filter((x) => x !== b.id) : [...field.value, b.id])}
                    className={cn('min-h-10 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all text-left break-words max-w-full', on ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong')}>
                    <span className="font-mono text-[11.5px] mr-1.5 opacity-70">{b.code}</span>{b.name}
                  </button>
                )
              })}
            </div>
          )} />
        )}
      </Field>

      <Field label={t('admin.employees.categories')} hint={t('admin.employees.categoriesHint')}>
        {() => (
          <Controller control={control} name="categoryIds" render={({ field }) => (
            <div className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-surface p-2">
              {categories.isLoading && <Skeleton className="h-24" />}
              {tree.map(({ cat, depth }) => (
                <div key={cat.id} className="flex items-center h-8 rounded-md hover:bg-surface-2 px-2" style={{ paddingLeft: 8 + depth * 18 }}>
                  <Checkbox className="text-[13.5px]" checked={field.value.includes(cat.id)} onChange={(e) => field.onChange(e.target.checked ? [...field.value, cat.id] : field.value.filter((x) => x !== cat.id))}
                    label={<span className={cn(depth === 0 && 'font-medium')}>{cat.name}</span>} />
                </div>
              ))}
            </div>
          )} />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={isEdit ? t('admin.employees.passwordNew') : t('admin.employees.password')} required={!isEdit} hint={isEdit ? t('admin.employees.passwordKeep') : t('admin.employees.passwordHint')} error={pwErr(errors.password?.message)}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...register('password')} invalid={!!errors.password} />}
        </Field>
        <Field label={t('admin.employees.passwordConfirm')} required={!isEdit} error={pwErr(errors.passwordConfirm?.message)}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" {...register('passwordConfirm')} invalid={!!errors.passwordConfirm} />}
        </Field>
      </div>

      <Controller control={control} name="active" render={({ field }) => (
        <Switch checked={field.value} onChange={field.onChange} label={t('admin.employees.isActive')} description={t('admin.employees.isActiveHint')} />
      )} />

      {onCancel && (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" loading={isSubmitting || save.isPending}>{t('common.save')}</Button>
        </div>
      )}
    </form>
  )
}
