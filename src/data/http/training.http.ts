/** HTTP TrainingRepository — the employee's own mandatory training (`app/modules/training`). */
import type { TrainingStatus } from '@/domain'
import type { TrainingRepository } from '../repositories'
import { api } from './client'

export const trainingHttp: TrainingRepository = {
  status: (unitId) => api.get<TrainingStatus>('/training/status', { query: { unitId: unitId ?? undefined } }),

  complete: (unitId) => api.post<TrainingStatus>('/training/complete', undefined, { query: { unitId: unitId ?? undefined } }),
}
