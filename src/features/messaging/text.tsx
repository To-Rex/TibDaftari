/** What a message says, who it went to and why it did not arrive — in a form a person can read. */
import { useMemo } from 'react'
import type { TFunction } from 'i18next'
import type { OutboxMessage } from '@/domain'
import { ApiError } from '@/data'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'

// a full address, or a bare one that leads somewhere (`tibdaftar.uz/d/abc` — texts drop the scheme to save characters)
const LINK = /https?:\/\/[^\s<>"']+|(?<![\w@/.-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}\/[^\s<>"']*/gi
/** punctuation that ends the sentence, not the address */
const TAIL = /[.,;:!?)\]»”'"]+$/

export interface TextPart { text: string; href?: string }

/** The text cut into plain runs and addresses (an address keeps none of the sentence's closing punctuation). */
export function linkify(text: string): TextPart[] {
  const out: TextPart[] = []
  let at = 0
  for (const m of text.matchAll(LINK)) {
    const raw = m[0].replace(TAIL, '')
    if (!raw) continue
    const start = m.index ?? 0
    if (start > at) out.push({ text: text.slice(at, start) })
    out.push({ text: raw, href: /^https?:\/\//i.test(raw) ? raw : `https://${raw}` })
    at = start + raw.length
  }
  if (at < text.length) out.push({ text: text.slice(at) })
  return out
}

/** The whole text as it was written: line breaks kept, long words and addresses wrapped, addresses clickable. */
export function MessageText({ text, links = true, className }: { text: string; links?: boolean; className?: string }) {
  const parts = useMemo(() => (links ? linkify(text) : [{ text }]), [text, links])
  return (
    <p className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere]', className)}>
      {parts.map((p, i) => p.href
        ? <a key={i} href={p.href} target="_blank" rel="noreferrer noopener" onClick={(e) => e.stopPropagation()} className="font-medium text-info underline decoration-info/40 underline-offset-2 hover:decoration-info">{p.text}</a>
        : p.text)}
    </p>
  )
}

/** Who it went to: a phone as people write it (a number abroad is stored as bare digits — shown with the plus it is
 *  dialled with), a Telegram chat as what it is. */
export const phoneLabel = (m: Pick<OutboxMessage, 'to' | 'channel' | 'countryCode'>) => {
  if (m.channel === 'telegram') return `Telegram · ${m.to}`
  const shown = fmtPhone(m.to)
  return shown === m.to && /^\d{10,15}$/.test(m.to) ? `+${m.to}` : shown
}

/** The moment the list sorts and shows a message by: when it goes out (scheduled), went out, or was written. */
export const messageMoment = (m: Pick<OutboxMessage, 'status' | 'scheduledAt' | 'sentAt' | 'createdAt'>) =>
  m.status === 'scheduled' && m.scheduledAt ? m.scheduledAt : m.sentAt ?? m.createdAt

const WHY: Record<string, string> = {
  sms_not_configured: 'why_sms_not_configured',
  internal_error: 'why_internal',
  telegram_not_configured: 'why_telegram',
  'eskiz:EXPIRED': 'why_expired',
  'eskiz:UNDELIV': 'why_undelivered',
  'eskiz:UNDELIVERABLE': 'why_undelivered',
  'eskiz:REJECTD': 'why_rejected',
  'eskiz:REJECTED': 'why_rejected',
  'eskiz:DELETED': 'why_deleted',
}

/**
 * Why a message failed (or is being tried again), in the reader's language. The codes the system itself writes are
 * explained; anything else is the provider's own sentence and is shown as it came (`raw`).
 */
export function failureReason(t: TFunction, error?: string | null): { text: string; raw?: string } | null {
  const e = error?.trim()
  if (!e) return null
  const key = WHY[e] ?? (e.startsWith('telegram_not_ready') ? 'why_telegram' : e.startsWith('eskiz:') ? 'why_provider_state' : null)
  if (!key) return { text: e }
  return key === 'why_provider_state' ? { text: t('clinical.messages.why_provider_state', { state: e.slice(6) }) } : { text: t(`clinical.messages.${key}`), raw: e }
}

const ACTION_ERRORS = new Set(['message_not_cancellable', 'message_in_flight', 'message_already_resent', 'message_secret', 'message_not_resendable'])

/** A refused action on a message, in the reader's language (the server words it in Uzbek only). */
export const actionError = (t: TFunction, e: unknown): string =>
  e instanceof ApiError && ACTION_ERRORS.has(e.code) ? t(`clinical.messages.err_${e.code}`) : e instanceof ApiError && e.status === 404 ? t('clinical.messages.notFound') : errorMessage(e)
