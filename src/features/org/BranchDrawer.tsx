import { useEffect, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import type { Branch, Id } from '@/domain'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Drawer, Field, Input, Select, Switch, Textarea, toast } from '@/shared/ui'
import { useSaveBranch } from './queries'

export const TIMEZONES = ['Asia/Tashkent', 'Asia/Samarkand'] as const
type Tz = (typeof TIMEZONES)[number]

const schema = z.object({
  name: z.string().trim().min(2),
  code: z.string().trim().regex(/^[A-Z]{2,4}$/),
  address: z.string().trim(),
  phone: z.string().trim(),
  timezone: z.enum(TIMEZONES),
  isActive: z.boolean(),
})
type Values = z.infer<typeof schema>

export const orderNumberExample = (code: string, seq: number) => `${code || 'XX'}-${String(seq + 1).padStart(6, '0')}`

export function BranchDrawer({ open, onClose, companyId, branch }: { open: boolean; onClose: () => void; companyId: Id; branch?: Branch | null }) {
  const { t } = useTranslation()
  const save = useSaveBranch()
  const defaults = useMemo<Values>(() => ({
    name: branch?.name ?? '', code: branch?.code ?? '', address: branch?.address ?? '', phone: branch?.phone ?? '',
    timezone: TIMEZONES.includes(branch?.timezone as Tz) ? (branch!.timezone as Tz) : 'Asia/Tashkent',
    isActive: branch?.isActive ?? true,
  }), [branch])
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => { if (open) reset(defaults) }, [open, defaults, reset])
  const code = watch('code')

  const submit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync({ companyId, id: branch?.id, ...v, address: v.address || undefined, phone: v.phone || undefined })
      toast.success(t('admin.branches.saved'))
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  return (
    <Drawer open={open} onClose={onClose} title={branch ? t('admin.branches.edit') : t('admin.branches.add')} width="max-w-lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button form="branch-form" type="submit" loading={save.isPending}>{t('common.save')}</Button></>}>
      <form id="branch-form" onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t('admin.branches.name')} required error={errors.name && t('common.required')}>
          {(id) => <Input id={id} autoFocus {...register('name')} invalid={!!errors.name} />}
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
          <Field label={t('admin.branches.code')} required hint={t('admin.branches.codeHint')} error={errors.code && t('admin.branches.invalidCode')}>
            {(id) => <Input id={id} mono maxLength={4} placeholder="UR" {...register('code', { onChange: (e) => setValue('code', String(e.target.value).toUpperCase().replace(/[^A-Z]/g, '')) })} invalid={!!errors.code} />}
          </Field>
          <Field label={t('admin.branches.codeExample')}>
            {() => (
              <div className="h-10 flex items-center rounded-[var(--radius-sm)] border border-dashed border-line bg-surface-2/60 px-3 font-mono text-[14px] tabular text-ink-2">
                {orderNumberExample(code, branch?.orderSeq ?? 0)}
              </div>
            )}
          </Field>
        </div>
        <Field label={t('admin.branches.address')} optionalText={t('common.optional')}>
          {(id) => <Textarea id={id} rows={2} {...register('address')} />}
        </Field>
        <Field label={t('admin.branches.phone')} optionalText={t('common.optional')}>
          {(id) => <Input id={id} placeholder="+998 __ ___-__-__" {...register('phone')} />}
        </Field>
        <Field label={t('admin.branches.timezone')}>
          {(id) => (
            <Controller control={control} name="timezone" render={({ field }) => (
              <Select id={id} value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
              </Select>
            )} />
          )}
        </Field>
        <Controller control={control} name="isActive" render={({ field }) => (
          <Switch checked={field.value} onChange={field.onChange} label={t('admin.branches.isActive')} description={t('admin.branches.isActiveHint')} />
        )} />
      </form>
    </Drawer>
  )
}
