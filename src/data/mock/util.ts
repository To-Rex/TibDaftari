import type { Page, PageQuery } from '@/domain'

/** Deterministic PRNG (mulberry32) so mock data is stable between reloads. */
export function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)] as T,
    chance: (p: number) => next() < p,
    shuffle: <T>(arr: T[]) => {
      const c = [...arr]
      for (let i = c.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[c[i], c[j]] = [c[j] as T, c[i] as T]
      }
      return c
    },
  }
}

let counter = 1000
export const uid = (prefix = 'id') => `${prefix}_${(counter++).toString(36)}`

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY_MS ?? 250)
export const latency = (ms = LATENCY) =>
  new Promise<void>((r) => setTimeout(r, ms * (0.6 + Math.random() * 0.8)))

export class MockError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function paginate<T>(items: T[], q: PageQuery): Page<T> {
  const pageSize = q.pageSize ?? 20
  const page = Math.max(1, q.page ?? 1)
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, totalPages }
}

export function sortBy<T>(items: T[], key?: string, dir: 'asc' | 'desc' = 'desc'): T[] {
  if (!key) return items
  const m = dir === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key]
    const bv = (b as Record<string, unknown>)[key]
    if (av == null) return 1
    if (bv == null) return -1
    return av < bv ? -m : av > bv ? m : 0
  })
}

/** Latin/Cyrillic-tolerant fold for search (mirrors NavbatApp's translit search). */
export function fold(s: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k',
    л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
  }
  return s
    .toLowerCase()
    .replace(/[а-яёўқғҳ]/g, (c) => map[c] ?? c)
    .replace(/[‘’'`ʻ]/g, '')
    .replace(/h/g, 'x')
    .replace(/\s+/g, ' ')
    .trim()
}

export const matches = (hay: string | undefined, needle: string) =>
  !needle || (hay ? fold(hay).includes(fold(needle)) : false)

export const nowIso = () => new Date().toISOString()
export const daysAgo = (d: number, hour = 9) => {
  const t = new Date()
  t.setDate(t.getDate() - d)
  t.setHours(hour, 0, 0, 0)
  return t.toISOString()
}
export const clone = <T>(v: T): T => structuredClone(v)
