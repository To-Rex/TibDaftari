import { useTranslation } from 'react-i18next'
import { CalendarClock, Check, CheckCheck, Clock, XCircle } from 'lucide-react'
import type { MessageStatus } from '@/domain'
import { Badge, type Tone } from '@/shared/ui'

export const messageStatusTone: Record<MessageStatus, Tone> = { scheduled: 'info', queued: 'warn', sent: 'brand', delivered: 'ok', failed: 'danger' }
export const MESSAGE_STATUSES: MessageStatus[] = ['scheduled', 'queued', 'sent', 'delivered', 'failed']

const icons: Record<MessageStatus, React.ReactNode> = {
  scheduled: <CalendarClock className="size-3" />,
  queued: <Clock className="size-3" />,
  sent: <Check className="size-3" />,
  delivered: <CheckCheck className="size-3" />,
  failed: <XCircle className="size-3" />,
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const { t } = useTranslation()
  return <Badge tone={messageStatusTone[status]}>{icons[status]}{t(`clinical.messages.status_${status}`)}</Badge>
}
