import { useEffect, useMemo, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Trash2 } from 'lucide-react'
import type { Locale } from '@/domain'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { useCompany, useSaveCompany } from '@/features/org/queries'
import { LOCALES } from '@/shared/i18n'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime } from '@/shared/lib/format'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Page, PageHeader, Select, Skeleton, Textarea, toast } from '@/shared/ui'

const schema = z.object({
  name: z.string().trim().min(2),
  legalName: z.string().trim(),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,40}$/),
  phone: z.string().trim(),
  email: z.string().trim().email().or(z.literal('')),
  address: z.string().trim(),
  locale: z.enum(['uz', 'ru', 'en']),
  logoUrl: z.string(),
})
type Values = z.infer<typeof schema>

export default function CompanyPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.company.write')
  const company = useCompany(companyId)
  const save = useSaveCompany()
  const fileRef = useRef<HTMLInputElement>(null)

  const defaults = useMemo<Values>(() => ({
    name: company.data?.name ?? '', legalName: company.data?.legalName ?? '', slug: company.data?.slug ?? '', phone: company.data?.phone ?? '',
    email: company.data?.email ?? '', address: company.data?.address ?? '', locale: company.data?.locale ?? 'uz', logoUrl: company.data?.logoUrl ?? '',
  }), [company.data])

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => reset(defaults), [defaults, reset])
  const name = watch('name')
  const logoUrl = watch('logoUrl')

  const onFile = (f: File | undefined) => {
    if (!f) return
    if (f.size > 1024 * 1024) return toast.error(t('admin.company.tooLarge'))
    const reader = new FileReader()
    reader.onload = () => setValue('logoUrl', String(reader.result), { shouldDirty: true })
    reader.readAsDataURL(f)
  }

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ id: companyId, ...v, legalName: v.legalName || undefined, phone: v.phone || undefined, email: v.email || undefined, address: v.address || undefined, logoUrl: v.logoUrl || undefined, locale: v.locale as Locale })
      toast.success(t('admin.company.saved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  const c = company.data

  return (
    <Page width="medium">
      <PageHeader title={t('admin.company.title')} description={t('admin.company.subtitle')}
        actions={canWrite && (
          <>
            <Button variant="ghost" disabled={!isDirty} onClick={() => reset(defaults)}>{t('admin.company.reset')}</Button>
            <Button form="company-form" type="submit" loading={save.isPending} disabled={!isDirty}>{t('common.save')}</Button>
          </>
        )} />

      {!c ? (
        <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /></div>
      ) : (
        <form id="company-form" onSubmit={submit} className="flex flex-col gap-5">
          {/* Header with logo */}
          <Card className="relative overflow-hidden">
            <div aria-hidden className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-brand/8 blur-3xl" />
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <div className="relative shrink-0 self-start">
                <Avatar name={name || c.name} src={logoUrl || undefined} size="xl" className="rounded-2xl size-20 text-[26px]" />
                {canWrite && (
                  <button type="button" onClick={() => fileRef.current?.click()} className="absolute -bottom-1.5 -right-1.5 grid size-8 place-items-center rounded-full border border-line bg-bg-elevated text-ink-2 shadow-2 hover:text-ink transition-colors" aria-label={t('admin.company.upload')}>
                    <ImagePlus className="size-4" />
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-semibold tracking-tight break-words min-w-0">{name || c.name}</h2>
                  <Badge tone={c.isActive ? 'ok' : 'neutral'} dot>{c.isActive ? t('common.active') : t('common.inactive')}</Badge>
                </div>
                <p className="text-[13px] text-ink-3 mt-1">{t('admin.company.logoHint')}</p>
                {canWrite && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" size="xs" variant="secondary" leftIcon={<ImagePlus className="size-3.5" />} onClick={() => fileRef.current?.click()}>{t('admin.company.upload')}</Button>
                    {logoUrl && <Button type="button" size="xs" variant="ghost" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setValue('logoUrl', '', { shouldDirty: true })}>{t('admin.company.removeLogo')}</Button>}
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('admin.company.profile')} />
            <fieldset disabled={!canWrite} className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.company.name')} required error={errors.name && t('common.required')}>
                {(id) => <Input id={id} {...register('name')} invalid={!!errors.name} />}
              </Field>
              <Field label={t('admin.company.legalName')} optionalText={t('common.optional')}>
                {(id) => <Input id={id} {...register('legalName')} />}
              </Field>
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
            </fieldset>
          </Card>

          <Card>
            <CardHeader title={t('admin.company.contacts')} />
            <fieldset disabled={!canWrite} className="grid gap-4 sm:grid-cols-2">
              <Field label={t('admin.company.phone')} optionalText={t('common.optional')}>
                {(id) => <Input id={id} placeholder="+998 __ ___-__-__" {...register('phone')} />}
              </Field>
              <Field label={t('admin.company.email')} optionalText={t('common.optional')} error={errors.email && t('admin.company.invalidEmail')}>
                {(id) => <Input id={id} type="email" {...register('email')} invalid={!!errors.email} />}
              </Field>
              <Field label={t('admin.company.address')} optionalText={t('common.optional')} className="sm:col-span-2">
                {(id) => <Textarea id={id} rows={2} {...register('address')} />}
              </Field>
            </fieldset>
          </Card>

          <Card className="bg-surface-2/40">
            <CardHeader title={t('admin.company.readonly')} />
            <dl className="grid gap-x-8 gap-y-3 grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] text-[13.5px]">
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.company.id')}</dt><dd className="font-mono mt-0.5 break-all">{c.id}</dd></div>
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.company.createdAt')}</dt><dd className="tabular mt-0.5">{fmtDateTime(c.createdAt)}</dd></div>
              <div><dt className="text-ink-3 text-[12.5px]">{t('admin.company.updatedAt')}</dt><dd className="tabular mt-0.5">{fmtDateTime(c.updatedAt)}</dd></div>
            </dl>
          </Card>
        </form>
      )}
    </Page>
  )
}
