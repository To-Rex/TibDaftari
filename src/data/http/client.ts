/**
 * Thin fetch client for the TibDaftari FastAPI backend.
 *  - base URL from VITE_API_URL (…/api/v1); API origin derived from it for absolute file/PDF links
 *  - bearer token per actor (staff | patient) read from localStorage (same keys as the auth store)
 *  - JSON in/out, camelCase wire format, unified error envelope → ApiError
 *  - 401 for an actor clears its token and broadcasts `auth:unauthorized` so guards redirect to login
 */
import { storage } from '@/shared/lib/storage'

export const STAFF_TOKEN_KEY = 'clinic.staff.token'
export const PATIENT_TOKEN_KEY = 'clinic.patient.token'

const rawBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1'
/** e.g. https://api.example.com/api/v1 (no trailing slash) */
export const API_BASE = rawBase.replace(/\/+$/, '')
/** e.g. https://api.example.com — used to absolutise relative file/PDF urls returned by the API */
export const API_ORIGIN = (() => {
  if (/^https?:\/\//i.test(API_BASE)) return new URL(API_BASE).origin
  return typeof window !== 'undefined' ? window.location.origin : ''
})()

export type Actor = 'staff' | 'patient' | 'none'

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/** Absolute URL for a relative API path (`/api/v1/files/..`, `/api/v1/documents/../pdf`). */
export const absoluteUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return API_ORIGIN + (url.startsWith('/') ? url : `/${url}`)
}

export const tokenFor = (actor: Actor): string | null =>
  actor === 'staff' ? storage.get<string | null>(STAFF_TOKEN_KEY, null) : actor === 'patient' ? storage.get<string | null>(PATIENT_TOKEN_KEY, null) : null

type Primitive = string | number | boolean | null | undefined
export type Query = Record<string, Primitive | Primitive[]>

/** Serialise query params; arrays repeat the key (`status=a&status=b`); empty values are skipped. */
export const toQuery = (q?: Query): string => {
  if (!q) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '') continue
    if (Array.isArray(v)) v.forEach((x) => x !== undefined && x !== null && x !== '' && sp.append(k, String(x)))
    else sp.append(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export interface RequestOptions {
  actor?: Actor
  /** explicit bearer token (auth.staffMe/patientMe/logout pass the token they were given) */
  token?: string | null
  query?: Query
  body?: unknown
  signal?: AbortSignal
  /** expect a binary response */
  blob?: boolean
}

let unauthorizedHandler: ((actor: Actor) => void) | null = null
/** The auth store registers a handler to drop the in-memory session when the API says 401. */
export const onUnauthorized = (fn: (actor: Actor) => void) => {
  unauthorizedHandler = fn
}

async function parseError(res: Response): Promise<ApiError> {
  let code = `http_${res.status}`
  let message = res.statusText || `HTTP ${res.status}`
  let details: unknown
  try {
    const data = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown }; detail?: unknown }
    if (data?.error) {
      code = data.error.code ?? code
      message = data.error.message ?? message
      details = data.error.details
    } else if (typeof data?.detail === 'string') message = data.detail
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, code, message, details)
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const actor: Actor = opts.actor ?? 'staff'
  const token = opts.token !== undefined ? opts.token : tokenFor(actor)
  const headers: Record<string, string> = { Accept: opts.blob ? '*/*' : 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}${toQuery(opts.query)}`, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: 'omit',
    })
  } catch (e) {
    throw new ApiError(0, 'network_error', 'Server bilan aloqa yo‘q. Internetni tekshiring.', e)
  }
  if (!res.ok) {
    const err = await parseError(res)
    if (res.status === 401 && actor !== 'none' && opts.token === undefined) {
      storage.remove(actor === 'staff' ? STAFF_TOKEN_KEY : PATIENT_TOKEN_KEY)
      unauthorizedHandler?.(actor)
    }
    throw err
  }
  if (res.status === 204) return undefined as T
  if (opts.blob) return (await res.blob()) as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>('DELETE', path, opts),
}

/** Strip undefined keys so partial updates only send what the caller set. */
export const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
