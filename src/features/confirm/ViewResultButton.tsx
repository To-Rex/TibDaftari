/** Opens an approved result on the results page (`/app/confirm?item=`) — for anyone who may view results. */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import type { Id } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { routes } from '@/shared/config/routes'
import { IconButton } from '@/shared/ui'

export function ViewResultButton({ itemId, size = 'sm' }: { itemId: Id; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const navigate = useNavigate()
  if (!can(['confirm.result.read', 'confirm.result.view'])) return null
  return (
    <IconButton label={t('clinical.confirm.openResult')} size={size} onClick={() => navigate(`${routes.app.confirm}?item=${encodeURIComponent(itemId)}`)} data-view-result>
      <Eye />
    </IconButton>
  )
}
