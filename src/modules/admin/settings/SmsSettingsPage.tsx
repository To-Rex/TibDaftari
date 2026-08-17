import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Eye, EyeOff, KeyRound, PlugZap, Send, ShieldCheck } from 'lucide-react'
import type { Company } from '@/domain'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { useCompany, useSaveCompany } from '@/features/org/queries'
import { SmsTemplatesCard } from '@/features/org/SmsTemplatesCard'
import { repos } from '@/data'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, Field, Input, Page, PageHeader, Segmented, Skeleton, Textarea, toast } from '@/shared/ui'

const schema = z.object({
  provider: z.enum(['none', 'xabarchi']),
  apiKey: z.string().trim(),
  defaultPriority: z.enum(['urgent', 'transactional', 'bulk']),
  senderNote: z.string().trim(),
})
type Values = z.infer<typeof schema>
type Priority = Values['defaultPriority']

/** 'xab_live_abcdef7f2a' → 'xab_live_••••7f2a' — computed client-side, the API never returns the plaintext key. */
export const maskApiKey = (key: string) => {
  const m = /^([a-z]+_[a-z]+_)?(.*)$/i.exec(key)
  const prefix = m?.[1] ?? ''
  const body = m?.[2] ?? key
  return `${prefix}••••${body.slice(-4)}`
}

const CURL = `curl -X POST https://manager-xabarchi-backend-bula2s-f6aaa1-13-140-185-49.sslip.io/api/v1/public/messages \\
  -H "X-API-Key: xab_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "to": ["998901234567"], "text": "Natija tayyor", "priority": "transactional" }'`

export default function SmsSettingsPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.settings.write')
  const company = useCompany(companyId)
  const save = useSaveCompany()
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)

  const c = company.data
  const defaults = useMemo<Values>(() => ({ provider: c?.sms.provider ?? 'none', apiKey: '', defaultPriority: c?.sms.defaultPriority ?? 'transactional', senderNote: c?.sms.senderNote ?? '' }), [c])
  const { register, control, handleSubmit, reset, watch, formState: { isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => reset(defaults), [defaults, reset])
  const provider = watch('provider')
  const connected = c?.sms.provider === 'xabarchi' && !!c.sms.apiKeyMasked

  const submit = handleSubmit(async (v) => {
    try {
      const sms: Company['sms'] = {
        provider: v.provider,
        defaultPriority: v.defaultPriority,
        senderNote: v.senderNote || undefined,
        apiKeyMasked: v.provider === 'none' ? undefined : v.apiKey ? maskApiKey(v.apiKey) : c?.sms.apiKeyMasked,
        apiKey: v.provider !== 'none' && v.apiKey ? v.apiKey : undefined,
      }
      await save.mutateAsync({ id: companyId, sms })
      toast.success(t('admin.sms.saved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  })

  /** Sends ONE real SMS through the company's Xabarchi account (to the company phone).
   *  A freshly typed key is saved first so the backend can use it. */
  const testConnection = async () => {
    const typedKey = watch('apiKey')
    if (!connected && !typedKey) return toast.warning(t('admin.sms.testNoKey'))
    setTesting(true)
    try {
      if (isDirty) {
        const v = watch()
        await save.mutateAsync({ id: companyId, sms: { provider: v.provider, defaultPriority: v.defaultPriority, senderNote: v.senderNote || undefined, apiKey: v.provider !== 'none' && v.apiKey ? v.apiKey : undefined, apiKeyMasked: c?.sms.apiKeyMasked } })
      }
      const r = await repos.tenant.testSms(companyId)
      toast.success(t('admin.sms.testOk'), t('admin.sms.testSent', { to: r.to ? fmtPhone(r.to) : '—', id: r.providerMessageId ?? '—' }))
    } catch (e) {
      toast.error(t('admin.sms.testFailed'), errorMessage(e))
    } finally {
      setTesting(false)
    }
  }
  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL).catch(() => undefined)
    setCopied(true)
    toast.success(t('admin.sms.copied'))
    setTimeout(() => setCopied(false), 1500)
  }

  const priorities: { value: Priority; label: string }[] = [
    { value: 'urgent', label: t('admin.sms.priorityUrgent') },
    { value: 'transactional', label: t('admin.sms.priorityTransactional') },
    { value: 'bulk', label: t('admin.sms.priorityBulk') },
  ]

  return (
    <Page width="medium">
      <PageHeader title={t('admin.sms.title')} description={t('admin.sms.subtitle')}
        actions={canWrite && <Button form="sms-form" type="submit" loading={save.isPending} disabled={!isDirty}>{t('common.save')}</Button>} />

      {!c ? <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div> : (
        <div className="flex flex-col gap-5">
          <form id="sms-form" onSubmit={submit}>
            <Card>
              <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.providerTitle')} description={t('admin.sms.providerText')}
                actions={<Badge tone={connected ? 'ok' : 'neutral'} dot>{connected ? t('admin.sms.connected') : t('admin.sms.notConnected')}</Badge>} />
              <fieldset disabled={!canWrite} className="flex flex-col gap-5 min-w-0">
                <Field label={t('admin.sms.provider')}>
                  {() => (
                    <Controller control={control} name="provider" render={({ field }) => (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(['none', 'xabarchi'] as const).map((p) => {
                          const on = field.value === p
                          return (
                            <button key={p} type="button" onClick={() => field.onChange(p)} className={`flex items-center gap-3 rounded-[var(--radius)] border p-3.5 text-left transition-all min-w-0 ${on ? 'border-brand bg-brand-soft/60 shadow-1' : 'border-line bg-surface hover:border-line-strong'}`}>
                              <span className={`grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4 ${on ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3'}`}>{p === 'none' ? <ShieldCheck /> : <Send />}</span>
                              <span className="flex flex-col min-w-0">
                                <span className="text-[14px] font-medium break-words">{p === 'none' ? t('admin.sms.providerNone') : t('admin.sms.providerXabarchi')}</span>
                                {p === 'xabarchi' && <span className="text-[12px] text-ink-3 font-mono break-all">api/v1/public/messages</span>}
                              </span>
                              {on && <Check className="ml-auto size-4 shrink-0 text-brand" />}
                            </button>
                          )
                        })}
                      </div>
                    )} />
                  )}
                </Field>

                {provider === 'xabarchi' && (
                  <>
                    <Field label={t('admin.sms.apiKey')} hint={c.sms.apiKeyMasked ? `${t('admin.sms.apiKeyCurrent')}: ${c.sms.apiKeyMasked} · ${t('admin.sms.apiKeyKeep')}` : t('admin.sms.apiKeyHint')}>
                      {(id) => (
                        <Input id={id} type={showKey ? 'text' : 'password'} mono autoComplete="off" placeholder={t('admin.sms.apiKeyPlaceholder')} leftIcon={<KeyRound />} {...register('apiKey')}
                          rightSlot={<button type="button" onClick={() => setShowKey((s) => !s)} className="grid size-7 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">{showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} />
                      )}
                    </Field>
                    <Field label={t('admin.sms.priority')} hint={t('admin.sms.priorityHint')}>
                      {() => <Controller control={control} name="defaultPriority" render={({ field }) => <Segmented items={priorities} value={field.value} onChange={field.onChange} className="max-w-full flex-wrap" />} />}
                    </Field>
                    <Field label={t('admin.sms.senderNote')} hint={t('admin.sms.senderNoteHint')} optionalText={t('common.optional')}>
                      {(id) => <Input id={id} maxLength={40} {...register('senderNote')} />}
                    </Field>
                    <div className="flex justify-end">
                      <Button type="button" variant="secondary" className="max-sm:w-full" leftIcon={<PlugZap className="size-4" />} loading={testing} onClick={testConnection}>{t('admin.sms.test')}</Button>
                    </div>
                  </>
                )}
              </fieldset>
            </Card>
          </form>

          <SmsTemplatesCard companyId={companyId} companyName={c.name} readOnly={!canWrite} templates={c.smsTemplates} />

          <Card>
            <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.docsTitle')} description={t('admin.sms.docsText')}
              actions={<Button size="sm" variant="ghost" leftIcon={copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />} onClick={copyCurl}>{t('admin.sms.copyCurl')}</Button>} />
            <div className="w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border border-line bg-surface-2/60">
              <Textarea readOnly wrap="off" value={CURL} rows={4} className="font-mono text-[12.5px] leading-relaxed bg-transparent border-0 resize-none whitespace-pre overflow-x-auto min-w-[34rem]" />
            </div>
          </Card>
        </div>
      )}
    </Page>
  )
}
