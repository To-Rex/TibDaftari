/** Pure SMS helpers: phone normalisation and GSM/UCS-2 segment counting. */

/** Normalise to 998XXXXXXXXX; returns null when not a valid UZ mobile number. */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/\D/g, '')
  if (d.length === 9) d = '998' + d
  if (d.length === 12 && d.startsWith('998')) return d
  return null
}

/** Parse a free-text list (comma / newline / space separated) into unique valid + invalid tokens. */
export function parseRecipients(text: string): { valid: string[]; invalid: string[] } {
  const tokens = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)
  const valid = new Set<string>()
  const invalid: string[] = []
  for (const tk of tokens) {
    const n = normalizePhone(tk)
    if (n) valid.add(n)
    else invalid.push(tk)
  }
  return { valid: [...valid], invalid }
}

// GSM 03.38 basic character set (+ extension chars counted as 2)
const GSM_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM_EXT = '^{}\\[~]|€'

export interface SmsInfo { encoding: 'gsm' | 'ucs2'; length: number; segments: number; perSegment: number; remaining: number }

export function smsInfo(text: string): SmsInfo {
  let gsm = true
  let len = 0
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) len += 1
    else if (GSM_EXT.includes(ch)) len += 2
    else { gsm = false; break }
  }
  if (!gsm) len = [...text].length
  const single = gsm ? 160 : 70
  const multi = gsm ? 153 : 67
  const segments = len === 0 ? 0 : len <= single ? 1 : Math.ceil(len / multi)
  const perSegment = segments <= 1 ? single : multi
  const capacity = segments <= 1 ? single : segments * multi
  return { encoding: gsm ? 'gsm' : 'ucs2', length: len, segments, perSegment, remaining: capacity - len }
}
