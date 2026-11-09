/**
 * Territory statistics: activity of the organisation tree folded by country → region → district → facility.
 * Numbers only, nothing personal. The superadmin sees every country; an administrator sees the subtree of their
 * own unit (`unitId`). Wire contract: TibDaftari-Backend `app/modules/platform`.
 */
import type { Id, Money } from './common'

/** The level the rows are grouped at. */
export type RegionGroupBy = 'country' | 'region' | 'district' | 'unit'

export interface TerritoryScope {
  countryId?: Id
  regionId?: Id
  districtId?: Id
}

export interface RegionStatsQuery extends TerritoryScope {
  dateFrom: string
  dateTo: string
  /** fold under this unit only (an administrator's own subtree); superadmin may omit it */
  unitId?: Id
  /** omitted = one level below the narrowest filter (nothing / country → region, region → district, district → unit) */
  groupBy?: RegionGroupBy
}

/** Activity of one territory (or one facility) in the period. */
export interface UnitMetrics {
  /** live facilities there */
  units: number
  /** non-cancelled cheques opened in the period */
  orders: number
  /** Σ non-refunded payments taken in the period */
  revenue: Money
  /** patients registered in the period at a facility there */
  patientsNew: number
  /** results approved in the period */
  resultsReady: number
  /** SMS sent in the period from a facility there */
  smsSent: number
}

export interface UnitRow extends UnitMetrics {
  id: Id
  kind: RegionGroupBy
  name: string
  /** the level above: a district's region, a region's country, a facility's district */
  parentName?: string | null
  /** the live organisation node behind this territory (its country / region / district unit), or the facility itself */
  unitId?: Id | null
  /** facilities only */
  code?: string | null
  isActive?: boolean | null
}

export interface RegionTrendPoint { date: string; orders: number; revenue: Money }

export interface RegionStats {
  groupBy: RegionGroupBy
  dateFrom: string
  dateTo: string
  total: UnitMetrics
  rows: UnitRow[]
  trend: RegionTrendPoint[]
}
