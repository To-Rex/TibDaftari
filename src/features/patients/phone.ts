/** Phone helpers for the +998 mask used by registration forms. */
export const formatLocalPhone = (raw: string) => {
  const d = raw.replace(/\D/g, '').replace(/^998(?=\d{9})/, '').slice(0, 9)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ')
}
export const localDigits = (masked: string) => masked.replace(/\D/g, '').slice(0, 9)
/** "90 123 45 67" -> "998901234567" */
export const toE164 = (masked: string) => `998${localDigits(masked)}`
/** "998901234567" -> "90 123 45 67" */
export const fromE164 = (phone?: string) => (phone ? formatLocalPhone(phone.replace(/^998/, '')) : '')
