import i18n from '@/shared/i18n'
import { MockError } from '@/data'

/** Human-readable message for any thrown error (mock or future http). */
export const errorMessage = (e: unknown): string => {
  if (e instanceof MockError) return e.message
  if (e instanceof Error && e.message) return e.message
  return i18n.t('common.error')
}
