import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { Company } from '@/domain'
import { LOCALES } from '@/shared/i18n'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Drawer, Field, Input, Select, Switch, Textarea, toast } from '@/shared/ui'
import { useSaveCompany } from './queries'

const schema = z.object({
  name: z.string().trim().min(2),
  legalName: z.string().trim(),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/),
  phone: z.string().trim(),
  email: z.string().trim().email().or(z.literal('')),
  address: z.string().trim(),
  locale: z.enum(['uz', 'ru', 'en']),
  isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

export function CompanyDrawer({ open, onClose, company }: { open: boolean; onClose: () => void; company?: Company | null }) {
  const { t } = useTranslation()
  const save = useSaveCompany()
  const defaults = useMemo<Values>(() => ({
    name: company?.name ?? '', legalName: company?.legalName ?? '', slug: company?.slug ?? '', phone: company?.phone ?? '', email: company?.email ?? '',
    address: company?.address ?? '', locale: company?.locale ?? 'uz', isActive: company?.isActive ?? true,
  }), [company])
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => { if (open) reset(defaults) }, [open, defaults, reset])

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ id: company?.id, ...v, legalName: v.legalName || undefined, phone: v.phone || undefined, email: v.email || undefined, address: v.address || undefined })
      toast.success(t('admin.platform.saved'))
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  return (
    <Drawer open={open} onClose={onClose} title={company ? t('admin.platform.edit') : t('admin.platform.add')} width="max-w-lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button form="company-drawer-form" type="submit" loading={save.isPending}>{t('common.save')}</Button></>}>
      <form id="company-drawer-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t('admin.company.name')} required error={errors.name && t('common.required')}>
          {(id) => <Input id={id} autoFocus {...register('name')} invalid={!!errors.name} />}
        </Field>
        <Field label={t('admin.company.legalName')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} {...register('legalName')} />}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.company.slug')} required hint={t('admin.company.slugHint')} error={errors.slug && t('admin.company.invalidSlug')}>
            {(id) => <Input id={id} mono {...register('slug')} invalid={!!errors.slug} />}
          </Field>
          <Field label={t('admin.company.locale')}>
            {(id) => (
              <Controller control={control} name="locale" render={({ field }) => (
                <Select id={id} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                  {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                </Select>
              )} />
            )}
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('admin.company.phone')} optionalText={t('common.optional')}>
            {(id) => <Input id={id} {...register('phone')} />}
          </Field>
          <Field label={t('admin.company.email')} optionalText={t('common.optional')} error={errors.email && t('admin.company.invalidEmail')}>
            {(id) => <Input id={id} type="email" {...register('email')} invalid={!!errors.email} />}
          </Field>
        </div>
        <Field label={t('admin.company.address')} optionalText={t('common.optional')}>
          {(id) => <Textarea id={id} rows={2} {...register('address')} />}
        </Field>
        <Controller control={control} name="isActive" render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label={t('admin.platform.active')} />
        )} />
      </form>
    </Drawer>
  )
}
