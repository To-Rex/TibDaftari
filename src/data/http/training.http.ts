/** HTTP TrainingRepository — the mandatory training (`app/modules/training`): the employee's own, and the overview. */
import type { TrainingOverview, TrainingStatus } from '@/domain'
import type { TrainingRepository } from '../repositories'
import { api } from './client'

export const trainingHttp: TrainingRepository = {
  status: (unitId) => api.get<TrainingStatus>('/training/status', { query: { unitId: unitId ?? undefined } }),

  complete: (unitId) => api.post<TrainingStatus>('/training/complete', undefined, { query: { unitId: unitId ?? undefined } }),

  overview: (q = {}) => api.get<TrainingOverview>('/training/overview', { query: { ...q, unitId: q.unitId ?? undefined, search: q.search || undefined } }),
}
