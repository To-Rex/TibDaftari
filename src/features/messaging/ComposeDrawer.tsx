/** "New message" drawer: recipients, quick templates, text with segment counter, optional schedule. */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarClock, Send, Users } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Drawer, Field, Input, Switch, Textarea, toast } from '@/shared/ui'
import { useSendSms } from './queries'
import { parseRecipients, smsInfo } from './sms'

const QUICK_TEMPLATES = [
  { key: 'ready', text: 'Hurmatli bemor! Tahlil natijalaringiz tayyor. Portalda ko‘rishingiz mumkin. Shifo Med' },
  { key: 'reminder', text: 'Eslatma: ertaga soat 09:00 da qabulga yozilgansiz. Iltimos, kechikmang. Shifo Med' },
  { key: 'promo', text: 'Shu hafta barcha laboratoriya tahlillariga 15% chegirma! Batafsil: +998 62 228-82-81. Shifo Med' },
]

export function ComposeDrawer({ open, onClose, companyId, canBroadcast }: { open: boolean; onClose: () => void; companyId: string; canBroadcast: boolean }) {
  const { t } = useTranslation()
  const [to, setTo] = useState('')
  const [text, setText] = useState('')
  const [schedule, setSchedule] = useState(false)
  const [when, setWhen] = useState('')
  const send = useSendSms(companyId)

  const rec = useMemo(() => parseRecipients(to), [to])
  const info = useMemo(() => smsInfo(text), [text])
  const tooMany = !canBroadcast && rec.valid.length > 1
  const canSend = rec.valid.length > 0 && text.trim().length > 0 && !tooMany && (!schedule || !!when)

  const reset = () => { setTo(''); setText(''); setSchedule(false); setWhen('') }
  const doSend = async () => {
    try {
      const out = await send.mutateAsync({ to: rec.valid, text: text.trim(), kind: rec.valid.length > 1 ? 'broadcast' : 'reminder', scheduledAt: schedule && when ? new Date(when).toISOString() : undefined })
      toast.success(t('clinical.messages.sentToast', { n: out.length }))
      reset(); onClose()
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('clinical.messages.newMessage')} description={t('clinical.messages.newMessageHint')}
      footer={<>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button leftIcon={schedule ? <CalendarClock className="size-4" /> : <Send className="size-4" />} onClick={() => void doSend()} loading={send.isPending} disabled={!canSend}>
          {schedule ? t('clinical.messages.schedule') : t('clinical.messages.send')}{rec.valid.length > 1 ? ` (${rec.valid.length})` : ''}
        </Button>
      </>}>
      <div className="flex flex-col gap-5">
        <Field label={t('clinical.messages.recipients')} required hint={t('clinical.messages.recipientsHint')} error={tooMany ? t('clinical.messages.noBroadcastPerm') : rec.invalid.length ? t('clinical.messages.invalidPhones', { list: rec.invalid.slice(0, 3).join(', ') }) : undefined}>
          {(id) => (
            <div className="relative">
              <Textarea id={id} value={to} onChange={(e) => setTo(e.target.value)} placeholder="+998 90 123-45-67, 998911234567" rows={3} className="min-h-[76px] pr-16 font-mono text-[13px]" />
              <span className={cn('pointer-events-none absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular', rec.valid.length ? 'bg-brand-soft text-brand-ink' : 'bg-surface-2 text-ink-3')}>
                <Users className="size-3" />{rec.valid.length}
              </span>
            </div>
          )}
        </Field>

        <div>
          <div className="mb-1.5 text-[12.5px] font-medium text-ink-3">{t('clinical.messages.quickTemplates')}</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TEMPLATES.map((q) => (
              <button key={q.key} type="button" onClick={() => setText(q.text)} className={cn('h-7 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors', text === q.text ? 'border-brand/40 bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink')}>
                {t(`clinical.messages.tpl_${q.key}`)}
              </button>
            ))}
          </div>
        </div>

        <Field label={t('clinical.messages.text')} required>
          {(id) => (
            <div>
              <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={t('clinical.messages.textPlaceholder')} className="min-h-[120px]" />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] tabular text-ink-3">
                <span className={cn('inline-flex items-center gap-1.5', info.encoding === 'ucs2' && 'text-warn')}>
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2">{info.encoding === 'gsm' ? 'GSM-7' : 'UCS-2'}</span>
                  {t('clinical.messages.perSegment', { n: info.perSegment })}
                </span>
                <span>{info.length} / {info.segments <= 1 ? info.perSegment : info.segments * info.perSegment} · {t('clinical.messages.segments', { n: info.segments })}</span>
              </div>
            </div>
          )}
        </Field>

        <div className="rounded-[var(--radius)] border border-line bg-surface-2/40 p-4">
          <Switch checked={schedule} onChange={setSchedule} label={t('clinical.messages.scheduleLater')} description={t('clinical.messages.scheduleHint')} />
          <AnimatePresence initial={false}>
            {schedule && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <Input type="datetime-local" value={when} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setWhen(e.target.value)} className="mt-3 w-64 max-w-full tabular" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Drawer>
  )
}
