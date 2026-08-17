import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquareText, RotateCcw } from 'lucide-react'
import type { SmsTemplateKind, SmsTemplateOverrides } from '@/domain'
import { storage } from '@/shared/lib/storage'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, CardHeader, Textarea, toast } from '@/shared/ui'
import { useSaveCompany } from './queries'

export type { SmsTemplateKind }
export type SmsTemplates = Record<SmsTemplateKind, string>
const KINDS: SmsTemplateKind[] = ['payment_receipt', 'result_ready', 'reminder']
const PLACEHOLDERS = ['{patient}', '{order}', '{service}', '{company}'] as const
/** Pre-backend drafts lived in localStorage; they are offered once as the initial draft, then dropped. */
const LEGACY_STORAGE_KEY = (companyId: string) => `clinic.sms.templates.${companyId}`

const SAMPLE = { patient: 'Karimova Aziza', order: 'UR-001241', service: 'Umumiy qon tahlili', company: '' }

/** GSM-7 vs UCS-2 segment counter (approximate, mirrors what Xabarchi bills). */
export function smsSegments(text: string): { chars: number; segments: number; unicode: boolean } {
  const unicode = [...text].some((ch) => ch.charCodeAt(0) > 127)
  const chars = text.length
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  const segments = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi)
  return { chars, segments, unicode }
}

export function SmsTemplatesCard({ companyId, companyName, readOnly, templates }: { companyId: string; companyName: string; readOnly?: boolean; templates?: SmsTemplateOverrides }) {
  const { t } = useTranslation()
  const saveCompany = useSaveCompany()
  const defaults = useMemo<SmsTemplates>(() => ({ payment_receipt: t('admin.sms.defaultPayment'), result_ready: t('admin.sms.defaultResult'), reminder: t('admin.sms.defaultReminder') }), [t])
  /** what the backend currently has (empty override = platform default text) */
  const saved = useMemo<SmsTemplates>(() => ({ ...defaults, ...Object.fromEntries(Object.entries(templates ?? {}).filter(([, v]) => !!v)) }), [defaults, templates])
  const legacy = useMemo(() => storage.get<Partial<SmsTemplates> | null>(LEGACY_STORAGE_KEY(companyId), null), [companyId])
  const [draft, setDraft] = useState<SmsTemplates>(() => ({ ...saved, ...(legacy ?? {}) }))
  const touched = useRef(!!legacy)
  // follow the backend value until the user starts editing (or a legacy draft was restored)
  useEffect(() => { if (!touched.current) setDraft(saved) }, [saved])
  const edit = (next: (d: SmsTemplates) => SmsTemplates) => { touched.current = true; setDraft(next) }
  const [active, setActive] = useState<SmsTemplateKind>('payment_receipt')
  const dirty = KINDS.some((k) => draft[k] !== saved[k])

  const labels: Record<SmsTemplateKind, string> = { payment_receipt: t('admin.sms.tplPayment'), result_ready: t('admin.sms.tplResult'), reminder: t('admin.sms.tplReminder') }
  const preview = (text: string) => text.replace(/\{(patient|order|service|company)\}/g, (_, k: keyof typeof SAMPLE) => (k === 'company' ? companyName : SAMPLE[k]))
  const seg = smsSegments(preview(draft[active]))

  const save = async () => {
    // texts equal to the platform default are stored as empty overrides (backend falls back)
    const overrides: SmsTemplateOverrides = Object.fromEntries(KINDS.map((k) => [k, draft[k] !== defaults[k] ? draft[k] : ''])) as SmsTemplateOverrides
    try {
      await saveCompany.mutateAsync({ id: companyId, smsTemplates: overrides })
      storage.remove(LEGACY_STORAGE_KEY(companyId))
      touched.current = false
      toast.success(t('admin.sms.templatesSaved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const insert = (ph: string) => edit((d) => ({ ...d, [active]: `${d[active]}${d[active].endsWith(' ') || !d[active] ? '' : ' '}${ph}` }))

  return (
    <Card>
      <CardHeader className="max-sm:flex-col max-sm:items-start" title={t('admin.sms.templatesTitle')} description={t('admin.sms.templatesSub')}
        actions={!readOnly && (
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => edit(() => defaults)}>{t('admin.sms.resetDefaults')}</Button>
            <Button size="sm" disabled={!dirty} loading={saveCompany.isPending} onClick={() => void save()}>{t('common.save')}</Button>
          </div>
        )} />
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex flex-wrap md:flex-col gap-1">
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setActive(k)} className={cn('flex items-center gap-2 rounded-[10px] px-3 h-10 text-[13.5px] font-medium whitespace-nowrap transition-colors text-left', active === k ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2')}>
              <MessageSquareText className="size-4 shrink-0" />{labels[k]}
              {draft[k] !== saved[k] && <span className="ml-auto size-1.5 rounded-full bg-warn" />}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <Textarea value={draft[active]} disabled={readOnly} rows={3} onChange={(e) => edit((d) => ({ ...d, [active]: e.target.value }))} className="font-mono text-[13.5px]" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] text-ink-3 mr-1">{t('admin.sms.placeholders')}:</span>
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" disabled={readOnly} onClick={() => insert(p)} className="h-6 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-ink-2 hover:border-brand hover:text-brand-ink transition-colors disabled:opacity-50">{p}</button>
            ))}
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-surface-2/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.preview')}</span>
              <Badge tone={seg.segments > 2 ? 'warn' : 'neutral'} size="sm">{t('admin.sms.segments', { chars: seg.chars, segments: seg.segments })}{seg.unicode ? ' · UCS-2' : ' · GSM-7'}</Badge>
            </div>
            <div className="max-w-sm rounded-2xl rounded-tl-md bg-surface border border-line px-3.5 py-2.5 text-[14px] leading-relaxed shadow-1 break-words">{preview(draft[active]) || '…'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
