/** HTTP PlatformRepository — territory statistics over the organisation tree (`app/modules/platform`). */
import type { RegionStats } from '@/domain'
import type { PlatformRepository } from '@/data/repositories'
import { api } from './client'

export const platformHttp: PlatformRepository = {
  regions: (q) => api.get<RegionStats>('/platform/regions', { query: { ...q } }),
}
