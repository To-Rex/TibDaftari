/**
 * The quick-start wizard's draft: where the facility opens, its profile, the default accounts, the sample whose
 * working set is copied. Pure helpers — the dialog owns the state.
 */
import type { FacilityKind, Id, QuickStartInput, QuickStartOwner, QuickStartPreview, QuickStartRole, QuickStartStaffInput } from '@/domain'

export const QUICK_START_ROLES: QuickStartRole[] = ['registrator', 'vrach', 'laborant', 'rahbar', 'admin']
export type Step = 'location' | 'facility' | 'staff' | 'catalog' | 'review'
export const STEPS: Step[] = ['location', 'facility', 'staff', 'catalog', 'review']

export interface StaffDraft { on: boolean; fullName: string; login: string; /** typed by the user — stop proposing */ touched: boolean }

export interface Draft {
  parentId: Id | null
  /** geo ids (only the levels the parent does not fix) */
  regionId: string
  districtId: string
  name: string
  kind: FacilityKind
  code: string
  shortName: string
  legalName: string
  phone: string
  address: string
  staff: Record<QuickStartRole, StaffDraft>
  password: string
  /** null = no sample ('' = not decided yet: the preview proposes the first one) */
  sampleId: Id | null | ''
  owner: QuickStartOwner
  activateReceipt: boolean
}

export const CODE_RE = /^[A-Z][A-Z0-9]{0,11}$/

export function emptyDraft(parentId: Id | null): Draft {
  const staff = Object.fromEntries(QUICK_START_ROLES.map((r) => [r, { on: r !== 'admin', fullName: '', login: '', touched: false }])) as Record<QuickStartRole, StaffDraft>
  return { parentId, regionId: '', districtId: '', name: '', kind: 'ses', code: '', shortName: '', legalName: '', phone: '', address: '', staff, password: '123456', sampleId: '', owner: 'region', activateReceipt: true }
}

/** "Bog‘ot tumani" → "BGT": the first letters of the words, else the first consonants, upper-case Latin. */
export function proposeCode(name: string): string {
  const latin = name.normalize('NFD').replace(/[̀-ͯ‘’'ʻ`]/g, '').replace(/[^A-Za-z0-9 ]/g, ' ').trim()
  const words = latin.split(/\s+/).filter((w) => w && !/^(tumani|shahri|viloyati|ses|klinika|markaz|markazi|respublikasi)$/i.test(w))
  if (!words.length) return ''
  if (words.length >= 2) return words.slice(0, 3).map((w) => w[0]!).join('').toUpperCase()
  const w = words[0]!
  const cons = w.replace(/[aeiouAEIOU]/g, '')
  return (w[0]! + cons.slice(1, 3)).toUpperCase().slice(0, 3)
}

/** The default login of a role: `<code>-<suffix>` in lower case. */
export const proposeLogin = (code: string, suffix: string) => (code ? `${code.toLowerCase()}-${suffix}` : '')

/** The default display name of an account: "Kassir — BGT". */
export const proposeName = (roleName: string, code: string, shortName: string) => `${roleName.split('/')[0]!.trim()} — ${shortName || code || '…'}`

/** Fill logins / names the user has not touched from the current code and the roles of the preview. */
export function withProposals(d: Draft, preview: QuickStartPreview | undefined): Draft {
  if (!preview) return d
  const staff = { ...d.staff }
  for (const r of preview.roles) {
    const cur = staff[r.key]
    if (!cur || cur.touched) continue
    staff[r.key] = { ...cur, login: proposeLogin(d.code, r.suffix), fullName: proposeName(r.name, d.code, d.shortName) }
  }
  return { ...d, staff }
}

export function toInput(d: Draft, preview: QuickStartPreview | undefined, parentLevel: 'country' | 'region' | 'district'): QuickStartInput {
  const roles = preview?.roles ?? []
  const staff: QuickStartStaffInput[] = roles.filter((r) => d.staff[r.key]?.on).map((r) => ({ role: r.key, fullName: d.staff[r.key]!.fullName.trim(), login: d.staff[r.key]!.login.trim() }))
  return {
    regionId: parentLevel === 'country' ? d.regionId || undefined : undefined,
    districtId: parentLevel !== 'district' ? d.districtId || undefined : undefined,
    facility: {
      name: d.name.trim(), kind: d.kind, code: d.code.trim().toUpperCase(),
      shortName: d.shortName.trim() || undefined, legalName: d.legalName.trim() || undefined, phone: d.phone.trim() || undefined, address: d.address.trim() || undefined,
    },
    staff,
    password: d.password,
    sample: d.sampleId ? { facilityId: d.sampleId, owner: d.owner } : null,
    activateReceipt: d.activateReceipt,
  }
}

/** What stops the wizard from going further at each step. */
export function stepProblem(step: Step, d: Draft, parentLevel: 'country' | 'region' | 'district' | null, roles: QuickStartPreview['roles'] | undefined): 'parent' | 'region' | 'district' | 'name' | 'code' | 'staff' | 'password' | null {
  if (step === 'location') {
    if (!parentLevel) return 'parent'
    if (parentLevel === 'country' && !d.regionId) return 'region'
    if (parentLevel !== 'district' && !d.districtId) return 'district'
  }
  if (step === 'facility') {
    if (d.name.trim().length < 2) return 'name'
    if (!CODE_RE.test(d.code.trim().toUpperCase())) return 'code'
  }
  if (step === 'staff') {
    const on = (roles ?? []).filter((r) => d.staff[r.key]?.on)
    if (on.some((r) => d.staff[r.key]!.fullName.trim().length < 2 || d.staff[r.key]!.login.trim().length < 3)) return 'staff'
    if (d.password.length < 4) return 'password'
  }
  return null
}

export const countsSummary = (c: { categories: number; serviceTypes: number; schemas: number; templates: number; receipts: number }, label: (k: 'categories' | 'serviceTypes' | 'schemas' | 'templates' | 'receipts') => string) =>
  (['categories', 'serviceTypes', 'schemas', 'templates', 'receipts'] as const).filter((k) => c[k] > 0).map((k) => `${c[k]} ${label(k)}`).join(' · ')
