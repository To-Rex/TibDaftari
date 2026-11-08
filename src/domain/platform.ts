/**
 * Platform (superadmin) view across every clinic: activity folded by the location of the branch the work was done
 * at — country → region → district → clinic. Numbers only, nothing personal. Wire contract:
 * TibDaftari-Backend `app/modules/platform`.
 */
import type { Id, Money, PageQuery } from './common'

/** The level the rows are grouped at. */
export type RegionGroupBy = 'country' | 'region' | 'district' | 'company'

export interface TerritoryScope {
  countryId?: Id
  regionId?: Id
  districtId?: Id
}

export interface RegionStatsQuery extends TerritoryScope {
  dateFrom: string
  dateTo: string
  /** omitted = one level below the narrowest filter (nothing / country → region, region → district, district → company) */
  groupBy?: RegionGroupBy
}

/** Activity of one territory (or one clinic) in the period. */
export interface UnitMetrics {
  /** clinics with at least one live branch there (a clinic with branches in two districts counts in both) */
  companies: number
  branches: number
  /** non-cancelled cheques opened in the period */
  orders: number
  /** Σ non-refunded payments taken in the period */
  revenue: Money
  /** patients registered in the period at a branch there */
  patientsNew: number
  /** results approved in the period */
  resultsReady: number
  /** SMS sent in the period through a branch there */
  smsSent: number
}

export interface UnitRow extends UnitMetrics {
  id: Id
  kind: RegionGroupBy
  name: string
  /** the level above: a district's region, a region's country, a clinic's own location */
  parentName?: string | null
  /** clinics only */
  slug?: string | null
  isActive?: boolean | null
}

export interface RegionTrendPoint { date: string; orders: number; revenue: Money }

/** How many clinics / branches carry a district — the rest are invisible to the regional view. */
export interface Coverage { companies: number; companiesLocated: number; branches: number; branchesLocated: number }

export interface RegionStats {
  groupBy: RegionGroupBy
  dateFrom: string
  dateTo: string
  /** each clinic counted once, however many territories it spans */
  total: UnitMetrics
  rows: UnitRow[]
  /** the scope's branches with no value at this level (e.g. a region's branches without a district) */
  unassigned?: UnitMetrics | null
  trend: RegionTrendPoint[]
  coverage: Coverage
}

/** The platform clinic list: a territory matches a clinic located there itself or with a live branch there. */
export interface CompanyListQuery extends PageQuery, TerritoryScope {
  isActive?: boolean
  /** clinics that carry no district anywhere (invisible to the regional view) */
  unlocated?: boolean
}
