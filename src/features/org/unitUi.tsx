/**
 * Shared visual vocabulary of the organisation tree: one icon per level (Davlat → Viloyat → Tuman → Muassasa),
 * one per facility kind, and the translated level / kind labels. Every unit list, picker and card draws from here
 * so a region looks the same in the switcher, the tree and the breadcrumb.
 */
import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Earth, FlaskConical, Hospital, Map as MapIcon, MapPin, Pill, ShieldPlus, Stethoscope, BedDouble } from 'lucide-react'
import type { FacilityKind, OrgUnit, UnitLevel } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, type Tone } from '@/shared/ui'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

export const LEVEL_ICONS: Record<UnitLevel, Icon> = { country: Earth, region: MapIcon, district: MapPin, facility: Hospital }
export const KIND_ICONS: Record<FacilityKind, Icon> = {
  ses: ShieldPlus,
  clinic: Stethoscope,
  laboratory: FlaskConical,
  polyclinic: Hospital,
  hospital: BedDouble,
  pharmacy: Pill,
  other: Building2,
}
export const LEVEL_TONES: Record<UnitLevel, Tone> = { country: 'accent', region: 'brand', district: 'info', facility: 'ok' }

/** The icon of a unit: its facility kind when it is one, else its level. */
export function UnitIcon({ unit, className }: { unit: Pick<OrgUnit, 'level' | 'kind'>; className?: string }) {
  const Cmp = unit.level === 'facility' && unit.kind ? KIND_ICONS[unit.kind] : LEVEL_ICONS[unit.level]
  return <Cmp className={cn('size-4 shrink-0', className)} aria-hidden />
}

export function UnitLevelIcon({ level, className }: { level: UnitLevel; className?: string }) {
  const Cmp = LEVEL_ICONS[level]
  return <Cmp className={cn('size-4 shrink-0', className)} aria-hidden />
}

/** Translated names of levels and facility kinds. */
export function useUnitLabels() {
  const { t } = useTranslation()
  const level = (l: UnitLevel) => t(`org.level.${l}`)
  const kind = (k: FacilityKind) => t(`org.kind.${k}`)
  /** "Muassasa · Klinika" for a facility with a kind, else the level */
  const of = (u: Pick<OrgUnit, 'level' | 'kind'>) => (u.level === 'facility' && u.kind ? `${level(u.level)} · ${kind(u.kind)}` : level(u.level))
  return { level, kind, of }
}

/** Small badge with the level name; facilities with a kind show the kind. */
export function UnitLevelBadge({ unit, size = 'sm', className }: { unit: Pick<OrgUnit, 'level' | 'kind'>; size?: 'sm' | 'md'; className?: string }) {
  const { level, kind } = useUnitLabels()
  return <Badge tone={LEVEL_TONES[unit.level]} size={size} className={className}>{unit.level === 'facility' && unit.kind ? kind(unit.kind) : level(unit.level)}</Badge>
}

/** Secondary line of a unit row: level, code, inactive. */
export function unitMeta(u: OrgUnit, labels: ReturnType<typeof useUnitLabels>, inactiveText: string): string {
  return [labels.of(u), u.code ?? '', u.isActive ? '' : inactiveText].filter(Boolean).join(' · ')
}
