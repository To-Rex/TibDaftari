import { useQuery } from '@tanstack/react-query'
import type { RegionStatsQuery } from '@/domain'
import { repos } from '@/data'

/**
 * Activity of the organisation tree by territory — every country for the superadmin, the subtree of their own unit
 * for an administrator (`unitId`). The previous answer stays on screen while a new scope loads.
 */
export const useRegionStats = (q: RegionStatsQuery, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['platform', 'regions', q], queryFn: () => repos.platform.regions(q), placeholderData: (p) => p, staleTime: 30_000, enabled: opts?.enabled ?? true })
