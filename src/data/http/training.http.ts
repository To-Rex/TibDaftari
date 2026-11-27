/** HTTP TrainingRepository — the mandatory training (`app/modules/training`): the employee's own, and the overview. */
import type { TrainingOverview, TrainingStatus } from '@/domain'
import type { TrainingRepository } from '../repositories'
import { api } from './client'

export const trainingHttp: TrainingRepository = {
  status: (unitId) => api.get<TrainingStatus>('/training/status', { query: { unitId: unitId ?? undefined } }),

  complete: (unitId) => api.post<TrainingStatus>('/training/complete', undefined, { query: { unitId: unitId ?? undefined } }),

  restart: (unitId, tasks) => api.post<TrainingStatus>('/training/restart', tasks?.length ? { tasks } : undefined, { query: { unitId: unitId ?? undefined } }),

  leave: () => api.post<TrainingStatus>('/training/leave'),

  overview: (q = {}) => api.get<TrainingOverview>('/training/overview', { query: { ...q, unitId: q.unitId ?? undefined, search: q.search || undefined } }),
}
