/**
 * "Re-send SMS" for an approved result: the same "result ready" text the approval sent (with the result link),
 * to the patient's phone or another number. The dialog shows the exact text (dry run from the API), its SMS
 * length and the last delivery status; the API refuses a second send within a minute.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquareShare, TriangleAlert } from 'lucide-react'
import type { DocumentDelivery, Id } from '@/domain'
import { repos } from '@/data'
import { smsSegments } from '@/features/org/SmsTemplatesCard'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDateTime } from '@/shared/lib/format'
import { Badge, Button, Field, IconButton, Input, Modal, Skeleton, toast } from '@/shared/ui'

const R = 'clinical.confirm.resend'
const TONE = { queued: 'info', sent: 'ok', delivered: 'ok', failed: 'danger' } as const

/** 9 local digits or the full 998XXXXXXXXX number → the full number; anything else → null */
const normalize = (raw: string): string | null => {
  const d = raw.replace(/\D/g, '')
  if (d.length === 9) return `998${d}`
  if (d.length === 12 && d.startsWith('998')) return d
  return null
}

export function ResendSmsButton({ documentId, deliveries, size = 'md', variant = 'button' }: { documentId: Id; deliveries?: DocumentDelivery[]; size?: 'sm' | 'md'; /** 'icon': a compact icon button (tables) */ variant?: 'button' | 'icon' }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const preview = useQuery({ queryKey: ['result-sms', documentId], queryFn: () => repos.orders.resendResultSms(documentId, { dryRun: true }), enabled: open, staleTime: 0, gcTime: 0 })
  useEffect(() => { if (open && preview.data) setPhone(preview.data.to) }, [open, preview.data])
  const to = normalize(phone)
  const send = useMutation({
    mutationFn: () => repos.orders.resendResultSms(documentId, { to: to ?? undefined }),
    onSuccess: async (r) => {
      if (r.queued) toast.success(t(`${R}.sent`), r.to)
      else toast.warning(t(`${R}.notSent`))
      setOpen(false)
      await Promise.all([qc.invalidateQueries({ queryKey: ['document', documentId] }), qc.invalidateQueries({ queryKey: ['outbox'] }), qc.invalidateQueries({ queryKey: ['outbox-counts'] })])
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  const last = deliveries?.find((d) => d.channel === 'sms')
  const seg = preview.data ? smsSegments(preview.data.text) : null

  return (
    <>
      {variant === 'icon'
        ? <IconButton label={t(`${R}.button`)} size={size} onClick={() => setOpen(true)} data-resend-sms><MessageSquareShare /></IconButton>
        : <Button variant="secondary" size={size} leftIcon={<MessageSquareShare className="size-4" />} onClick={() => setOpen(true)} data-hotkey="m" data-resend-sms>{t(`${R}.button`)}</Button>}
      <Modal open={open} onClose={() => !send.isPending && setOpen(false)} title={t(`${R}.title`)} description={t(`${R}.hint`)}
        footer={<>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={send.isPending}>{t('common.cancel')}</Button>
          <Button leftIcon={<MessageSquareShare className="size-4" />} loading={send.isPending} disabled={!preview.data || !to} onClick={() => send.mutate()} data-resend-send>{t(`${R}.send`)}</Button>
        </>}>
        <div className="flex flex-col gap-4" data-resend-dialog>
          <p className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
            <span className="text-ink-3">{t(`${R}.last`)}:</span>
            {last
              ? <><Badge tone={TONE[last.status]} dot size="sm">{t(`${R}.status.${last.status}`)}</Badge><span className="tabular text-ink-3">{fmtDateTime(last.at)}</span>{last.detail && <span className="text-ink-3">· {last.detail === 'sms_not_configured' ? t(`${R}.notConfiguredShort`) : last.detail}</span>}</>
              : <span className="text-ink-3">{t(`${R}.never`)}</span>}
          </p>
          {preview.isLoading ? <div className="flex flex-col gap-2"><Skeleton className="h-10" /><Skeleton className="h-20" /></div>
            : preview.isError ? <p className="text-[13px] text-danger">{errorMessage(preview.error)}</p>
            : preview.data && (
              <>
                {!preview.data.configured && (
                  <p className="flex items-start gap-2 rounded-[var(--radius)] border border-warn/40 bg-warn-soft/40 px-3 py-2 text-[12.5px] text-ink-2" data-resend-not-configured>
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />{t(`${R}.notConfigured`)}
                  </p>
                )}
                <Field label={t(`${R}.phone`)} hint={t(`${R}.phoneHint`)} error={phone && !to ? t(`${R}.invalidPhone`) : undefined}>
                  {(id) => <Input id={id} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" mono invalid={!!phone && !to} placeholder="998901234567" data-resend-phone />}
                </Field>
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[12.5px] font-medium text-ink-2">{t(`${R}.text`)}</span>
                    {seg && <Badge size="sm" tone={seg.segments > 2 ? 'warn' : 'neutral'}>{t(`${R}.segments`, { chars: seg.chars, segments: seg.segments })}</Badge>}
                  </div>
                  <div className="rounded-2xl rounded-tl-md border border-line bg-surface-2/50 px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words" data-resend-text>{preview.data.text}</div>
                </div>
              </>
            )}
        </div>
      </Modal>
    </>
  )
}
