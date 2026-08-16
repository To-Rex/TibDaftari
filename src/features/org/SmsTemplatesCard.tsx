import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquareText, RotateCcw } from 'lucide-react'
import { storage } from '@/shared/lib/storage'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, Card, CardHeader, Textarea, toast } from '@/shared/ui'

export type SmsTemplateKind = 'payment_receipt' | 'result_ready' | 'reminder'
export type SmsTemplates = Record<SmsTemplateKind, string>
const KINDS: SmsTemplateKind[] = ['payment_receipt', 'result_ready', 'reminder']
const PLACEHOLDERS = ['{patient}', '{order}', '{service}', '{company}'] as const
const STORAGE_KEY = (companyId: string) => `clinic.sms.templates.${companyId}`

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

export function SmsTemplatesCard({ companyId, companyName, readOnly }: { companyId: string; companyName: string; readOnly?: boolean }) {
  const { t } = useTranslation()
  const defaults = useMemo<SmsTemplates>(() => ({ payment_receipt: t('admin.sms.defaultPayment'), result_ready: t('admin.sms.defaultResult'), reminder: t('admin.sms.defaultReminder') }), [t])
  const [saved, setSaved] = useState<SmsTemplates>(() => ({ ...defaults, ...storage.get<Partial<SmsTemplates>>(STORAGE_KEY(companyId), {}) }))
  const [draft, setDraft] = useState<SmsTemplates>(saved)
  const [active, setActive] = useState<SmsTemplateKind>('payment_receipt')
  const dirty = KINDS.some((k) => draft[k] !== saved[k])

  const labels: Record<SmsTemplateKind, string> = { payment_receipt: t('admin.sms.tplPayment'), result_ready: t('admin.sms.tplResult'), reminder: t('admin.sms.tplReminder') }
  const preview = (text: string) => text.replace(/\{(patient|order|service|company)\}/g, (_, k: keyof typeof SAMPLE) => (k === 'company' ? companyName : SAMPLE[k]))
  const seg = smsSegments(preview(draft[active]))

  const save = () => {
    storage.set(STORAGE_KEY(companyId), draft)
    setSaved(draft)
    toast.success(t('admin.sms.templatesSaved'))
  }
  const insert = (ph: string) => setDraft((d) => ({ ...d, [active]: `${d[active]}${d[active].endsWith(' ') || !d[active] ? '' : ' '}${ph}` }))

  return (
    <Card>
      <CardHeader title={t('admin.sms.templatesTitle')} description={t('admin.sms.templatesSub')}
        actions={!readOnly && (
          <>
            <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="size-3.5" />} onClick={() => setDraft(defaults)}>{t('admin.sms.resetDefaults')}</Button>
            <Button size="sm" disabled={!dirty} onClick={save}>{t('common.save')}</Button>
          </>
        )} />
      <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
        <div className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
          {KINDS.map((k) => (
            <button key={k} type="button" onClick={() => setActive(k)} className={cn('flex items-center gap-2 rounded-[10px] px-3 h-10 text-[13.5px] font-medium whitespace-nowrap transition-colors text-left', active === k ? 'bg-brand-soft text-brand-ink' : 'text-ink-2 hover:bg-surface-2')}>
              <MessageSquareText className="size-4 shrink-0" />{labels[k]}
              {draft[k] !== saved[k] && <span className="ml-auto size-1.5 rounded-full bg-warn" />}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 min-w-0">
          <Textarea value={draft[active]} disabled={readOnly} rows={3} onChange={(e) => setDraft((d) => ({ ...d, [active]: e.target.value }))} className="font-mono text-[13.5px]" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12.5px] text-ink-3 mr-1">{t('admin.sms.placeholders')}:</span>
            {PLACEHOLDERS.map((p) => (
              <button key={p} type="button" disabled={readOnly} onClick={() => insert(p)} className="h-6 rounded-md border border-line bg-surface px-2 font-mono text-[12px] text-ink-2 hover:border-brand hover:text-brand-ink transition-colors disabled:opacity-50">{p}</button>
            ))}
          </div>
          <div className="rounded-[var(--radius)] border border-line bg-surface-2/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{t('admin.sms.preview')}</span>
              <Badge tone={seg.segments > 2 ? 'warn' : 'neutral'} size="sm">{t('admin.sms.segments', { chars: seg.chars, segments: seg.segments })}{seg.unicode ? ' · UCS-2' : ' · GSM-7'}</Badge>
            </div>
            <div className="max-w-sm rounded-2xl rounded-tl-md bg-surface border border-line px-3.5 py-2.5 text-[14px] leading-relaxed shadow-1">{preview(draft[active]) || '…'}</div>
          </div>
        </div>
      </div>
    </Card>
  )
}
