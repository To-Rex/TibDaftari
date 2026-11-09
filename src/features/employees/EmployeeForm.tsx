import { useEffect, useMemo } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { Category, Employee, Id, Role, UnitLevel } from '@/domain'
import { INSTALLER_ROLE_KEY, isProtectedRole, unitsUnder } from '@/domain'
import { ApiError, repos } from '@/data'
import { useAuth, usePermissions } from '@/features/auth/store'
import { useUnitTree } from '@/features/org/queries'
import { UnitMultiPicker, UnitPicker } from '@/features/org/UnitPicker'
import { useRoles } from '@/features/roles/queries'
import { errorMessage } from '@/shared/lib/errors'
import { cn } from '@/shared/lib/cn'
import { Button, Checkbox, Field, Input, Select, Skeleton, Switch, toast } from '@/shared/ui'
import { ShieldPlus } from 'lucide-react'
import { formKeyDown } from '@/features/patients/formKeys'
import { useSaveEmployee } from './queries'

const schema = z
  .object({
    fullName: z.string().trim().min(2),
    login: z.string().trim().min(3).regex(/^[a-z0-9._-]+$/i),
    phone: z.string().trim().optional(),
    email: z.string().trim().email().optional().or(z.literal('')),
    roleId: z.string().min(1),
    /** home unit (any level under the scope); empty only for a superadmin */
    unitId: z.string().nullable(),
    /** extra units the employee also works in */
    unitIds: z.array(z.string()),
    categoryIds: z.array(z.string()),
    isSuperAdmin: z.boolean(),
    password: z.string(),
    passwordConfirm: z.string(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (!v.isSuperAdmin && !v.unitId) ctx.addIssue({ code: 'custom', path: ['unitId'], message: 'required' })
    if (v.password && v.password.length < 6) ctx.addIssue({ code: 'custom', path: ['password'], message: 'short' })
    if (v.password !== v.passwordConfirm) ctx.addIssue({ code: 'custom', path: ['passwordConfirm'], message: 'mismatch' })
  })
type Values = z.infer<typeof schema>

/** where an installer may be homed / which extra units they may get (the API enforces the same) */
const INSTALLER_HOME_LEVELS: UnitLevel[] = ['country', 'region']
const INSTALLER_EXTRA_LEVELS: UnitLevel[] = ['region']

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

/**
 * Create / edit an employee inside `scopeId` (the administered unit): home unit + extra units are picked from the
 * scope's subtree, the role from the roles visible to the scope (system roles + the lineage's own roles).
 */
export function EmployeeForm({ scopeId, employee, onSaved, onCancel, formId = 'employee-form' }: { scopeId: Id; employee?: Employee; onSaved: (e: Employee) => void; onCancel?: () => void; formId?: string }) {
  const { t } = useTranslation()
  const { isSuperAdmin } = usePermissions()
  const meId = useAuth((st) => st.staff?.employeeId)
  const isEdit = !!employee
  // editing oneself: name, contacts and password only — role, units, categories and status are a superadmin's call
  const selfLocked = isEdit && employee?.id === meId && !isSuperAdmin
  const roles = useRoles(scopeId)
  const tree = useUnitTree()
  const categories = useQuery({ queryKey: ['categories', scopeId], queryFn: () => repos.catalog.listCategories(scopeId) })
  const save = useSaveEmployee()

  const scopedUnits = useMemo(() => unitsUnder(tree.data ?? [], scopeId), [tree.data, scopeId])
  const unitName = (id: string | null) => (id ? tree.data?.find((u) => u.id === id)?.name : undefined)

  const defaults = useMemo<Values>(() => ({
    fullName: employee?.fullName ?? '', login: employee?.login ?? '', phone: employee?.phone ?? '', email: employee?.email ?? '',
    roleId: employee?.roleId ?? '', unitId: employee ? employee.unitId : scopeId, unitIds: employee?.unitIds ?? [], categoryIds: employee?.categoryIds ?? [],
    isSuperAdmin: !!employee?.isSuperAdmin,
    password: '', passwordConfirm: '', active: employee ? employee.status === 'active' : true,
  }), [employee, scopeId])

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults, mode: 'onBlur' })
  const { register, control, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = form
  useEffect(() => reset(defaults), [defaults, reset])
  const superDraft = useWatch({ control, name: 'isSuperAdmin' })
  const roleDraft = useWatch({ control, name: 'roleId' })

  const catTree = useMemo(() => flattenTree(categories.data ?? []), [categories.data])
  // superadmin and installer are handed out by superadmins only (shown read-only when the employee already has one)
  const visibleRoles = (roles.data ?? []).filter((r) => !(r.scopeUnitId === null && isProtectedRole(r.key)) || isSuperAdmin || employee?.roleId === r.id)
  const installerDraft = visibleRoles.some((r) => r.id === roleDraft && r.scopeUnitId === null && r.key === INSTALLER_ROLE_KEY)
  const systemRoles = visibleRoles.filter((r) => r.scopeUnitId === null)
  const unitRoles = visibleRoles.filter((r) => r.scopeUnitId !== null)
  const roleOption = (r: Role) => {
    const name = r.scopeUnitId ? unitName(r.scopeUnitId) : undefined
    return <option key={r.id} value={r.id}>{name ? `${r.name} — ${name}` : r.name}</option>
  }

  const submit = handleSubmit(async (v) => {
    if (!isEdit && !v.password) return setError('password', { message: 'short' })
    try {
      const saved = await save.mutateAsync({
        scopeId, id: employee?.id, fullName: v.fullName, login: v.login, phone: v.phone || undefined, email: v.email || undefined,
        password: v.password || undefined,
        // one's own role / units / categories / status are not sent (the API refuses them anyway)
        ...(selfLocked ? {} : {
          roleId: v.roleId, unitId: v.unitId, unitIds: v.unitIds.filter((id) => id !== v.unitId), categoryIds: v.categoryIds,
          status: v.active ? 'active' : 'inactive',
          // only a superadmin may grant / revoke the flag; everyone else leaves it untouched
          ...(isSuperAdmin ? { isSuperAdmin: v.isSuperAdmin } : {}),
        }),
      })
      toast.success(isEdit ? t('admin.employees.saved') : t('admin.employees.created'))
      onSaved(saved)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError('login', { message: 'taken' })
      else toast.error(errorMessage(e))
    }
  })

  const pwErr = (m?: string) => (m === 'short' ? t('admin.employees.passwordShort') : m === 'mismatch' ? t('admin.employees.passwordMismatch') : m ? t('common.required') : undefined)

  return (
    <form id={formId} onSubmit={submit} onKeyDown={formKeyDown} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('admin.employees.fullName')} required error={errors.fullName && t('common.required')} className="sm:col-span-2">
          {(id) => <Input id={id} autoFocus={!isEdit} {...register('fullName')} invalid={!!errors.fullName} />}
        </Field>
        <Field label={t('admin.employees.login')} required hint={t('admin.employees.loginHint')} error={errors.login && (errors.login.message === 'taken' ? t('admin.employees.loginTaken') : t('common.required'))}>
          {(id) => <Input id={id} mono autoComplete="off" {...register('login')} invalid={!!errors.login} />}
        </Field>
        <Field label={t('admin.employees.role')} required error={errors.roleId && t('common.required')} hint={selfLocked ? t('admin.employees.selfLockedHint') : !isSuperAdmin ? t('admin.employees.superadminOnly') : installerDraft ? t('admin.employees.installerRoleHint') : undefined}>
          {(id) => (
            <Select id={id} {...register('roleId')} invalid={!!errors.roleId} disabled={roles.isLoading || selfLocked}>
              <option value="">{t('common.select')}</option>
              {systemRoles.length > 0 && <optgroup label={t('admin.roles.systemRoles')}>{systemRoles.map(roleOption)}</optgroup>}
              {unitRoles.length > 0 && <optgroup label={t('admin.roles.unitRoles')}>{unitRoles.map(roleOption)}</optgroup>}
            </Select>
          )}
        </Field>
        <Field label={t('admin.employees.phone')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} placeholder="+998 90 000-00-00" {...register('phone')} />}
        </Field>
        <Field label={t('admin.employees.email')} optionalText={t('common.optional')} error={errors.email && t('admin.employees.invalidEmail')}>
          {(id) => <Input id={id} type="email" {...register('email')} invalid={!!errors.email} />}
        </Field>
      </div>

      {installerDraft && (
        <div className="flex gap-3 rounded-[var(--radius-sm)] border border-brand/30 bg-brand-soft/40 px-3.5 py-3 text-[13px] text-ink-2" data-installer-info>
          <ShieldPlus className="mt-0.5 size-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <div className="font-semibold text-ink">{t('admin.employees.installerTitle')}</div>
            <div className="mt-0.5">{t('admin.employees.installerInfo')}</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={installerDraft ? t('admin.employees.installerHome') : t('admin.employees.unit')} required={!superDraft} hint={installerDraft ? t('admin.employees.installerHomeHint') : t('admin.employees.unitHint')} error={errors.unitId && t('admin.employees.unitRequired')}>
          {() => (
            <Controller control={control} name="unitId" render={({ field }) => (
              tree.isLoading ? <Skeleton className="h-10" /> : (
                <UnitPicker units={scopedUnits} value={field.value} onChange={field.onChange} allowEmpty={superDraft} levels={installerDraft ? INSTALLER_HOME_LEVELS : undefined} placeholder={t('common.select')} disabled={tree.isLoading || selfLocked} />
              )
            )} />
          )}
        </Field>
        <Field label={installerDraft ? t('admin.employees.installerExtra') : t('admin.employees.extraUnits')} optionalText={t('common.optional')} hint={installerDraft ? t('admin.employees.installerExtraHint') : t('admin.employees.extraUnitsHint')}>
          {() => (
            <Controller control={control} name="unitIds" render={({ field }) => (
              tree.isLoading ? <Skeleton className="h-10" /> : (
                <UnitMultiPicker units={scopedUnits} value={field.value} onChange={field.onChange} levels={installerDraft ? INSTALLER_EXTRA_LEVELS : undefined} disabled={selfLocked} />
              )
            )} />
          )}
        </Field>
      </div>

      <Field label={t('admin.employees.categories')} hint={t('admin.employees.categoriesHint')}>
        {() => (
          <Controller control={control} name="categoryIds" render={({ field }) => (
            <div className="max-h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-line bg-surface p-2">
              {categories.isLoading && <Skeleton className="h-24" />}
              {catTree.map(({ cat, depth }) => (
                <div key={cat.id} className="flex items-center h-8 rounded-md hover:bg-surface-2 px-2" style={{ paddingLeft: 8 + depth * 18 }}>
                  <Checkbox className="text-[13.5px]" disabled={selfLocked} checked={field.value.includes(cat.id)} onChange={(e) => field.onChange(e.target.checked ? [...field.value, cat.id] : field.value.filter((x) => x !== cat.id))}
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
        <Switch checked={field.value} onChange={field.onChange} disabled={selfLocked} label={t('admin.employees.isActive')} description={selfLocked ? t('admin.employees.selfLockedHint') : t('admin.employees.isActiveHint')} />
      )} />

      {isSuperAdmin && (
        <Controller control={control} name="isSuperAdmin" render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label={t('admin.employees.superAdmin')} description={t('admin.employees.superAdminHint')} />
        )} />
      )}

      {onCancel && (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button type="submit" loading={isSubmitting || save.isPending}>{t('common.save')}</Button>
        </div>
      )}
    </form>
  )
}
