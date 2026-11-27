/**
 * A notice the system itself wrote names what it is about (`code`) and carries the values (`params`): it is said in
 * the reader's language here. A notice without a code — or with one this build does not know — is shown as the
 * server worded it (`title` / `body`).
 */
import type { TFunction } from 'i18next'
import type { Notification } from '@/domain'

/** code → where its sentences live in the dictionaries */
const KNOWN: Record<string, string> = {
  'training.passed': 'training.notice.passed',
  'training.stalled': 'training.notice.stalled',
  'training.stalled_many': 'training.notice.stalledMany',
}

export function notificationText(t: TFunction, n: Pick<Notification, 'title' | 'body' | 'code' | 'params'>): { title: string; body: string } {
  const key = n.code ? KNOWN[n.code] : undefined
  if (!key) return { title: n.title, body: n.body }
  const p = n.params ?? {}
  // `place`: the unit in brackets, or nothing — so a sentence reads right with and without it
  const values = { ...p, n: p.count ?? p.days ?? 0, place: p.unit ? ` (${p.unit})` : '' }
  return {
    title: t(`${key}.title`, { ...values, defaultValue: n.title }),
    body: t(`${key}.body`, { ...values, defaultValue: n.body }),
  }
}
