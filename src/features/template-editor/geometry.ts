import type { TemplateElement } from '@/domain'

export interface Rect { x: number; y: number; w: number; h: number }
export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const HANDLES: HandleDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export const GRID = 8
export const SNAP_DIST = 6
export const MIN_SIZE = 4

export const round = (v: number) => Math.round(v * 100) / 100
export const snapToGrid = (v: number, grid = GRID) => Math.round(v / grid) * grid

export function boundingRect(els: Rect[]): Rect {
  if (els.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  const x1 = Math.min(...els.map((e) => e.x))
  const y1 = Math.min(...els.map((e) => e.y))
  const x2 = Math.max(...els.map((e) => e.x + e.w))
  const y2 = Math.max(...els.map((e) => e.y + e.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

/** Resize a rect by dragging a handle; keeps min size. */
export function resizeRect(r: Rect, dir: HandleDir, dx: number, dy: number, keepRatio = false): Rect {
  let { x, y, w, h } = r
  if (dir.includes('e')) w = Math.max(MIN_SIZE, r.w + dx)
  if (dir.includes('s')) h = Math.max(MIN_SIZE, r.h + dy)
  if (dir.includes('w')) { const nw = Math.max(MIN_SIZE, r.w - dx); x = r.x + (r.w - nw); w = nw }
  if (dir.includes('n')) { const nh = Math.max(MIN_SIZE, r.h - dy); y = r.y + (r.h - nh); h = nh }
  if (keepRatio && r.w > 0 && r.h > 0 && dir.length === 2) {
    const ratio = r.w / r.h
    if (Math.abs(dx) > Math.abs(dy)) { h = w / ratio; if (dir.includes('n')) y = r.y + r.h - h } else { w = h * ratio; if (dir.includes('w')) x = r.x + r.w - w }
  }
  return { x, y, w, h }
}

export interface Guide { axis: 'x' | 'y'; pos: number; from: number; to: number }

/**
 * Snap a moving rect against other elements' edges/centres and page edges/centre.
 * Returns adjusted delta and the guides to draw.
 */
export function snapRect(moving: Rect, others: Rect[], page: { w: number; h: number }, opts: { grid?: boolean; dist?: number } = {}): { dx: number; dy: number; guides: Guide[] } {
  const dist = opts.dist ?? SNAP_DIST
  const xs: { v: number; from: number; to: number }[] = []
  const ys: { v: number; from: number; to: number }[] = []
  const push = (r: Rect) => {
    xs.push({ v: r.x, from: r.y, to: r.y + r.h }, { v: r.x + r.w / 2, from: r.y, to: r.y + r.h }, { v: r.x + r.w, from: r.y, to: r.y + r.h })
    ys.push({ v: r.y, from: r.x, to: r.x + r.w }, { v: r.y + r.h / 2, from: r.x, to: r.x + r.w }, { v: r.y + r.h, from: r.x, to: r.x + r.w })
  }
  others.forEach(push)
  push({ x: 0, y: 0, w: page.w, h: page.h })
  const mx = [moving.x, moving.x + moving.w / 2, moving.x + moving.w]
  const my = [moving.y, moving.y + moving.h / 2, moving.y + moving.h]
  let bestX: { d: number; g: Guide } | null = null
  let bestY: { d: number; g: Guide } | null = null
  for (const m of mx) for (const c of xs) { const d = c.v - m; if (Math.abs(d) <= dist && (!bestX || Math.abs(d) < Math.abs(bestX.d))) bestX = { d, g: { axis: 'x', pos: c.v, from: Math.min(c.from, moving.y), to: Math.max(c.to, moving.y + moving.h) } } }
  for (const m of my) for (const c of ys) { const d = c.v - m; if (Math.abs(d) <= dist && (!bestY || Math.abs(d) < Math.abs(bestY.d))) bestY = { d, g: { axis: 'y', pos: c.v, from: Math.min(c.from, moving.x), to: Math.max(c.to, moving.x + moving.w) } } }
  let dx = bestX?.d ?? 0
  let dy = bestY?.d ?? 0
  const guides: Guide[] = []
  if (bestX) guides.push(bestX.g)
  if (bestY) guides.push(bestY.g)
  if (opts.grid) {
    if (!bestX) dx = snapToGrid(moving.x) - moving.x
    if (!bestY) dy = snapToGrid(moving.y) - moving.y
  }
  return { dx, dy, guides }
}

export const rectOf = (e: TemplateElement): Rect => ({ x: e.x, y: e.y, w: e.w, h: e.h })
