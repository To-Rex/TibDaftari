import i18n from '@/shared/i18n'
import { ApiError } from '@/data'

/** Human-readable message for any thrown error (backend messages are already localised). */
export const errorMessage = (e: unknown): string => {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error && e.message) return e.message
  return i18n.t('common.error')
}
