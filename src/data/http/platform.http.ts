/** HTTP PlatformRepository — activity across every clinic by territory (`app/modules/platform`). Superadmin only. */
import type { RegionStats } from '@/domain'
import type { PlatformRepository } from '@/data/repositories'
import { api } from './client'

export const platformHttp: PlatformRepository = {
  regions: (q) => api.get<RegionStats>('/platform/regions', { query: { ...q } }),
}
