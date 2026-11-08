import { useQuery } from '@tanstack/react-query'
import type { RegionStatsQuery } from '@/domain'
import { repos } from '@/data'

/** Activity across every clinic by territory (superadmin). The previous answer stays on screen while a new scope loads. */
export const useRegionStats = (q: RegionStatsQuery, opts?: { enabled?: boolean }) =>
  useQuery({ queryKey: ['platform', 'regions', q], queryFn: () => repos.platform.regions(q), placeholderData: (p) => p, staleTime: 30_000, enabled: opts?.enabled ?? true })
