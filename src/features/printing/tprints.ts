/**
 * TPrints — the receipt print service that runs on the cashier's computer (C:\…\TPrints, default
 * http://127.0.0.1:9100). The browser talks to it directly (CORS + private-network headers are open on
 * the service), so the settings are per device and live in localStorage, not on the server.
 */
import { storage } from '@/shared/lib/storage'

export type PrintMode = 'auto' | 'service' | 'browser'

export interface PrintSettings {
  /** 'auto' = TPrints when reachable, else the browser print dialog */
  mode: PrintMode
  url: string
  apiKey: string
  /** '' = the service's default printer */
  printer: string
  /** 0 = printer profile's paper width */
  paper: 0 | 58 | 80
  copies: number
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = { mode: 'auto', url: 'http://127.0.0.1:9100', apiKey: '', printer: '', paper: 0, copies: 1 }
const KEY = 'clinic.print.settings'

export const loadPrintSettings = (): PrintSettings => ({ ...DEFAULT_PRINT_SETTINGS, ...(storage.get<Partial<PrintSettings>>(KEY, {}) ?? {}) })
export const savePrintSettings = (s: PrintSettings): void => storage.set(KEY, s)

/* ---------- receipt elements (subset of the TPrints element schema) ---------- */
export type PrintElement =
  | { type: 'title'; value: string; size?: 1 | 2 | 3 | 4 }
  | { type: 'text'; value: string; align?: 'left' | 'center' | 'right'; bold?: boolean; size?: 1 | 2 | 3 | 4; font_size?: number }
  | { type: 'line'; char?: string; style?: 'solid' | 'dashed' }
  | { type: 'row'; left: string; right: string; bold?: boolean; size?: 1 | 2 | 3 | 4 }
  | { type: 'table'; headers: string[]; widths: number[]; aligns: ('left' | 'center' | 'right')[]; rows: string[][] }
  | { type: 'qr'; value: string; size?: number }
  | { type: 'feed'; lines: number }

export class TPrintsError extends Error {
  /** true when the service could not be reached at all (not running / wrong port), as opposed to a print failure */
  readonly unreachable: boolean
  constructor(message: string, unreachable = false) {
    super(message)
    this.unreachable = unreachable
  }
}

const request = async <T>(s: PrintSettings, path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 4000)
  let res: Response
  try {
    res = await fetch(s.url.replace(/\/+$/, '') + path, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(s.apiKey ? { 'X-API-Key': s.apiKey } : {}), ...(init.headers ?? {}) },
    })
  } catch (e) {
    throw new TPrintsError(e instanceof Error ? e.message : String(e), true)
  } finally {
    clearTimeout(timer)
  }
  // a failed job answers 502 with {ok:false, job:{status:'xato', error}}
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; job?: { error?: string; status?: string } } & T
  if (!res.ok || body.ok === false) throw new TPrintsError(body.error || body.job?.error || `HTTP ${res.status}`)
  return body
}

/** Service status + printer names (throws TPrintsError with `unreachable` when the service is not running). */
export async function tprintsStatus(s: PrintSettings): Promise<{ printers: string[]; defaultPrinter?: string }> {
  await request(s, '/', { timeoutMs: 2500 })
  const list = await request<{ printers?: { name: string }[]; app_default?: string }>(s, '/printers', { timeoutMs: 4000 })
  return { printers: (list.printers ?? []).map((p) => p.name), defaultPrinter: list.app_default || undefined }
}

const jobBody = (s: PrintSettings, elements: PrintElement[]) => ({
  ...(s.printer ? { printer: s.printer } : {}),
  ...(s.paper ? { paper: s.paper } : {}),
  copies: Math.min(20, Math.max(1, s.copies || 1)),
  wait: true,
  elements,
})

/** Print a receipt; resolves when the service has printed it (`wait: true`). */
export async function tprintsPrint(s: PrintSettings, elements: PrintElement[]): Promise<{ job_id?: string }> {
  return request(s, '/print', { method: 'POST', body: JSON.stringify(jobBody(s, elements)), timeoutMs: 90_000 })
}

/** Service's own test receipt (checks the printer end to end). */
export async function tprintsTest(s: PrintSettings): Promise<void> {
  await request(s, '/test', { method: 'POST', body: JSON.stringify({ ...(s.printer ? { printer: s.printer } : {}) }), timeoutMs: 90_000 })
}
