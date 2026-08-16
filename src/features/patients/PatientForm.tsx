/**
 * Patient create/edit form — react-hook-form + zod. Big, forgiving inputs for
 * front-desk speed: phone auto-mask, Enter submits, sectioned layout.
 * Submit from outside via <button form={formId} type="submit">.
 */
import { useEffect, useMemo, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Phone, User } from 'lucide-react'
import type { Patient, PatientUpsertInput } from '@/domain'
import { Field, Input, Select, Textarea, Segmented } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { formatLocalPhone, fromE164, localDigits, toE164 } from './phone'
import { useDistricts, useRegions } from './queries'

const makeSchema = (t: (k: string) => string) =>
  z.object({
    fullName: z.string().trim().min(3, t('staff.patients.form.errName')),
    phone: z.string().refine((v) => localDigits(v).length === 9, t('staff.patients.form.errPhone')),
    gender: z.enum(['male', 'female', '']),
    birthDate: z.string(),
    passportNumber: z.string().trim(),
    pinfl: z.string().refine((v) => v === '' || /^\d{14}$/.test(v), t('staff.patients.form.errPinfl')),
    regionId: z.string(),
    districtId: z.string(),
    street: z.string().trim(),
    workplace: z.string().trim(),
    discountPercent: z.number().min(0, t('staff.patients.form.errDiscount')).max(100, t('staff.patients.form.errDiscount')),
    contractNumber: z.string().trim(),
    note: z.string().trim(),
  })
type FormValues = z.infer<ReturnType<typeof makeSchema>>

const toDefaults = (p?: Patient | null): FormValues => ({
  fullName: p?.fullName ?? '',
  phone: fromE164(p?.phone),
  gender: p?.gender ?? '',
  birthDate: p?.birthDate ?? '',
  passportNumber: p?.passportNumber ?? '',
  pinfl: p?.pinfl ?? '',
  regionId: p?.address?.regionId ?? '',
  districtId: p?.address?.districtId ?? '',
  street: p?.address?.street ?? '',
  workplace: p?.workplace ?? '',
  discountPercent: p?.discountPercent ?? 0,
  contractNumber: p?.contractNumber ?? '',
  note: p?.note ?? '',
})

const toInput = (v: FormValues): PatientUpsertInput => ({
  fullName: v.fullName,
  phone: toE164(v.phone),
  gender: v.gender || undefined,
  birthDate: v.birthDate || undefined,
  passportNumber: v.passportNumber ? v.passportNumber.toUpperCase() : undefined,
  pinfl: v.pinfl || undefined,
  address: v.regionId || v.districtId || v.street ? { regionId: v.regionId || undefined, districtId: v.districtId || undefined, street: v.street || undefined } : undefined,
  workplace: v.workplace || undefined,
  discountPercent: v.discountPercent,
  contractNumber: v.contractNumber || undefined,
  note: v.note || undefined,
})

export interface PatientFormProps {
  formId: string
  patient?: Patient | null
  onSubmit: (input: PatientUpsertInput) => void
  /** live snapshot for duplicate checks (phone/passport/pinfl) */
  onDraftChange?: (draft: Pick<PatientUpsertInput, 'phone' | 'passportNumber' | 'pinfl'>) => void
}

const big = 'h-11 text-[15px]'

export function PatientForm({ formId, patient, onSubmit, onDraftChange }: PatientFormProps) {
  const { t } = useTranslation()
  const schema = useMemo(() => makeSchema(t), [t])
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toDefaults(patient),
    mode: 'onBlur',
  })
  const regionId = watch('regionId')
  const regions = useRegions()
  const districts = useDistricts(regionId || undefined)

  const phone = watch('phone')
  const passportNumber = watch('passportNumber')
  const pinfl = watch('pinfl')
  useEffect(() => {
    onDraftChange?.({ phone: localDigits(phone).length === 9 ? toE164(phone) : '', passportNumber, pinfl })
  }, [phone, passportNumber, pinfl, onDraftChange])

  return (
    <form id={formId} onSubmit={handleSubmit((v) => onSubmit(toInput(v)))} className="flex flex-col gap-7" autoComplete="off">
      <Section title={t('staff.patients.form.secMain')}>
        <Field label={t('common.fullName')} required error={errors.fullName?.message}>
          {(id) => <Input id={id} {...register('fullName')} autoFocus placeholder={t('staff.patients.form.namePh')} className={big} leftIcon={<User />} invalid={!!errors.fullName} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('common.phone')} required error={errors.phone?.message}>
            {(id) => (
              <div className="flex items-stretch gap-2">
                <span className="grid h-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 font-mono text-[14px] text-ink-2">+998</span>
                <Controller name="phone" control={control} render={({ field }) => (
                  <Input id={id} value={field.value} onChange={(e) => field.onChange(formatLocalPhone(e.target.value))} onBlur={field.onBlur} inputMode="numeric" placeholder="90 123 45 67" mono className={big} leftIcon={<Phone />} invalid={!!errors.phone} />
                )} />
              </div>
            )}
          </Field>
          <Field label={t('common.birthDate')}>
            {(id) => <Input id={id} type="date" {...register('birthDate')} className={big} max={new Date().toISOString().slice(0, 10)} />}
          </Field>
        </div>
        <Field label={t('common.gender')}>
          {() => (
            <Controller name="gender" control={control} render={({ field }) => (
              <Segmented<'male' | 'female' | ''> value={field.value} onChange={field.onChange} items={[{ value: 'male', label: t('common.male') }, { value: 'female', label: t('common.female') }]} />
            )} />
          )}
        </Field>
      </Section>

      <Section title={t('staff.patients.form.secDocs')} hint={t('staff.patients.form.secDocsHint')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('staff.patients.form.passport')} error={errors.passportNumber?.message}>
            {(id) => <Input id={id} {...register('passportNumber')} placeholder="AA 1234567" mono className={cn(big, 'uppercase')} maxLength={12} />}
          </Field>
          <Field label={t('staff.patients.form.pinfl')} error={errors.pinfl?.message}>
            {(id) => <Input id={id} value={pinfl} onChange={(e) => setValue('pinfl', e.target.value.replace(/\D/g, '').slice(0, 14), { shouldValidate: true })} inputMode="numeric" placeholder="14 raqam" mono className={big} invalid={!!errors.pinfl} />}
          </Field>
        </div>
      </Section>

      <Section title={t('common.address')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('staff.patients.form.region')}>
            {(id) => (
              <Select id={id} {...register('regionId', { onChange: () => setValue('districtId', '') })} className={big}>
                <option value="">{t('common.select')}</option>
                {regions.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Select>
            )}
          </Field>
          <Field label={t('staff.patients.form.district')}>
            {(id) => (
              <Select id={id} {...register('districtId')} disabled={!regionId} className={big}>
                <option value="">{t('common.select')}</option>
                {districts.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('staff.patients.form.street')}>
          {(id) => <Input id={id} {...register('street')} placeholder={t('staff.patients.form.streetPh')} className={big} />}
        </Field>
      </Section>

      <Section title={t('staff.patients.form.secExtra')}>
        <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
          <Field label={t('staff.patients.form.workplace')}>
            {(id) => <Input id={id} {...register('workplace')} className={big} />}
          </Field>
          <Field label={t('staff.patients.form.discount')} error={errors.discountPercent?.message}>
            {(id) => <Input id={id} type="number" min={0} max={100} {...register('discountPercent', { valueAsNumber: true })} className={big} rightSlot={<span className="pr-1 text-[13px] text-ink-3">%</span>} invalid={!!errors.discountPercent} />}
          </Field>
        </div>
        <Field label={t('staff.patients.form.contract')}>
          {(id) => <Input id={id} {...register('contractNumber')} className={big} mono />}
        </Field>
        <Field label={t('staff.patients.form.note')}>
          {(id) => <Textarea id={id} {...register('note')} rows={3} />}
        </Field>
      </Section>
    </form>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2 border-b border-line pb-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{title}</h3>
        {hint && <span className="text-[12px] text-ink-3">· {hint}</span>}
      </div>
      {children}
    </section>
  )
}
