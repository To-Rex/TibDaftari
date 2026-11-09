import { useTranslation } from 'react-i18next'
import type { UnitLevel } from '@/domain'
import { Badge, type Tone } from '@/shared/ui'

const LEVEL_TONE: Record<UnitLevel, Tone> = { country: 'accent', region: 'brand', district: 'info', facility: 'ok' }

/** "Viloyat" / "Tuman / shahar" / "Muassasa" — the level of a unit, as a small badge next to its name. */
export function UnitLevelBadge({ level, size = 'sm', className }: { level: UnitLevel; size?: 'sm' | 'md'; className?: string }) {
  const { t } = useTranslation()
  return <Badge tone={LEVEL_TONE[level]} size={size} className={className}>{t(`org.level.${level}`)}</Badge>
}
