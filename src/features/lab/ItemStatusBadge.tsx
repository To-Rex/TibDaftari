import { useTranslation } from 'react-i18next'
import type { ItemStatus } from '@/domain'
import { Badge } from '@/shared/ui'
import { itemStatusTone } from './status'

export function ItemStatusBadge({ status, size = 'md' }: { status: ItemStatus; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  return <Badge tone={itemStatusTone[status]} dot size={size}>{t(`clinical.status.${status}`)}</Badge>
}
