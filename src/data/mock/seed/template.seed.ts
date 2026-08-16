import type { ResultTemplate, TemplateAsset, TemplateElement } from '@/domain'
import { defaultTextStyle } from '@/domain'
import { daysAgo } from '../util'

const stamp = (d = 100) => ({ createdAt: daysAgo(d), updatedAt: daysAgo(Math.floor(d / 3)) })

const logoSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="36" fill="#0f7a6b"/><path d="M80 34v92M34 80h92" stroke="#fff" stroke-width="18" stroke-linecap="round"/></svg>`,
)
const stampSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="none" stroke="#3b5bdb" stroke-width="4"/><circle cx="100" cy="100" r="66" fill="none" stroke="#3b5bdb" stroke-width="2"/><text x="100" y="106" text-anchor="middle" font-family="serif" font-size="16" fill="#3b5bdb">SHIFO MED</text></svg>`,
)
const signSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="80" viewBox="0 0 220 80"><path d="M10 55c30-40 40-30 50-10s20 20 40-10 30-30 40 0 25 25 70-15" fill="none" stroke="#1d3557" stroke-width="3" stroke-linecap="round"/></svg>`,
)

export const ASSETS: TemplateAsset[] = [
  { id: 'as_logo', companyId: 'c1', kind: 'logo', name: 'Shifo Med logotipi', url: `data:image/svg+xml,${logoSvg}`, width: 160, height: 160 },
  { id: 'as_stamp', companyId: 'c1', kind: 'stamp', name: 'Klinika muhri', url: `data:image/svg+xml,${stampSvg}`, width: 200, height: 200 },
  { id: 'as_sign_1', companyId: 'c1', kind: 'signature', name: 'A. Jumaniyazov imzosi', url: `data:image/svg+xml,${signSvg}`, width: 220, height: 80, employeeId: 'e_doc1' },
]

let n = 0
type NoId<T> = T extends unknown ? Omit<T, 'id'> : never
const el = (e: NoId<TemplateElement>): TemplateElement => ({ id: `el_${(n++).toString(36)}`, ...e }) as TemplateElement

const INK = '#14201d'
const MUTED = '#5c6b66'
const BRAND = '#0f7a6b'

/** Common letterhead: logo, organisation block, patient block, hairlines. */
export function letterhead(title: string): TemplateElement[] {
  return [
    el({ type: 'image', x: 40, y: 36, w: 56, h: 56, assetId: 'as_logo', fit: 'contain', name: 'Logo' }),
    el({ type: 'text', x: 108, y: 34, w: 420, h: 24, text: '{company.name}', style: defaultTextStyle({ fontSize: 18, fontWeight: 700, color: INK }), name: 'Tashkilot' }),
    el({ type: 'text', x: 108, y: 60, w: 460, h: 34, text: '{branch.name} · {branch.address}\n{company.phone}', style: defaultTextStyle({ fontSize: 10.5, color: MUTED }), name: 'Rekvizit' }),
    el({ type: 'text', x: 574, y: 36, w: 180, h: 44, text: 'Chek № {order.number}\n{order.date}', style: defaultTextStyle({ fontSize: 11, color: MUTED, align: 'right' }), name: 'Chek' }),
    el({ type: 'line', x: 40, y: 104, w: 714, h: 2, stroke: BRAND, strokeWidth: 2, orientation: 'horizontal' }),
    el({ type: 'text', x: 40, y: 122, w: 714, h: 30, text: title, style: defaultTextStyle({ fontSize: 17, fontWeight: 600, color: INK, align: 'center' }), name: 'Sarlavha' }),
    el({ type: 'text', x: 40, y: 166, w: 350, h: 18, text: 'Bemor: {patient.fullName}', style: defaultTextStyle({ fontSize: 12, fontWeight: 600 }) }),
    el({ type: 'text', x: 40, y: 186, w: 350, h: 16, text: 'Tug‘ilgan sana: {patient.birthDate}  ·  Yosh: {patient.age}', style: defaultTextStyle({ fontSize: 10.5, color: MUTED }) }),
    el({ type: 'text', x: 40, y: 204, w: 350, h: 16, text: 'Telefon: {patient.phone}', style: defaultTextStyle({ fontSize: 10.5, color: MUTED }) }),
    el({ type: 'text', x: 404, y: 166, w: 350, h: 18, text: 'Xizmat: {item.serviceName}', style: defaultTextStyle({ fontSize: 12, fontWeight: 600 }) }),
    el({ type: 'text', x: 404, y: 186, w: 350, h: 16, text: 'Natija sanasi: {item.approvedAt}', style: defaultTextStyle({ fontSize: 10.5, color: MUTED }) }),
    el({ type: 'text', x: 404, y: 204, w: 350, h: 16, text: 'Laborant: {item.technician}', style: defaultTextStyle({ fontSize: 10.5, color: MUTED }) }),
    el({ type: 'line', x: 40, y: 232, w: 714, h: 1, stroke: '#dbe3df', strokeWidth: 1, orientation: 'horizontal' }),
  ]
}

export function footer(): TemplateElement[] {
  return [
    el({ type: 'text', x: 40, y: 1000, w: 300, h: 18, text: 'Vrach: {item.doctor}', style: defaultTextStyle({ fontSize: 11 }) }),
    el({ type: 'image', x: 200, y: 972, w: 110, h: 40, assetId: 'as_sign_1', fit: 'contain', name: 'Imzo' }),
    el({ type: 'image', x: 610, y: 940, w: 110, h: 110, assetId: 'as_stamp', fit: 'contain', opacity: 0.85, name: 'Muhr' }),
    el({ type: 'text', x: 40, y: 1064, w: 714, h: 16, text: 'Sog‘ligingizni asrang!  ·  Natijalar portalda: {company.name}', style: defaultTextStyle({ fontSize: 9.5, color: MUTED, align: 'center' }) }),
  ]
}

export const cell = defaultTextStyle({ fontSize: 10.5 })
export const head = defaultTextStyle({ fontSize: 10, fontWeight: 600, color: MUTED })
export const mkEl = el

export const TEMPLATES: ResultTemplate[] = [
  { id: 'tpl_generic', companyId: 'c1', name: 'Umumiy blanka (qoralama)', status: 'draft', version: 1, serviceTypeIds: [], categoryIds: [], scope: 'item', language: 'uz', doc: { paper: 'A4', orientation: 'portrait', background: '#ffffff', margin: 40, elements: [...letterhead('TAHLIL NATIJASI'), ...footer()] }, usage: 0, ...stamp(3) },
]
