/**
 * Legacy catalog imported (read-only) from the running NavbatApp database
 * (`online_navbat`: category / product / natija / ustun) and mapped onto the
 * new dynamic model:
 *   category → existing lab sub-categories (1→Parazitologiya, 2→Bakteriologiya, 3→Virusologiya)
 *   product  → ServiceType  (`st_lg_<id>`)
 *   natija + ustun → AttributeSchema with a table field (`sch_lg_<id>`), preset rows = natija rows
 *   product.shablon / category → ResultTemplate (`tpl_lg_<id>`) generated from the same table columns
 * Products named "-" (inactive placeholders in the legacy DB) are skipped.
 */
import type { AttributeSchema, FieldDef, ResultTemplate, SelectOption, ServiceType, TableColumn, TableField, TemplateAsset, TemplateDoc, TemplateElement } from '@/domain'
import { defaultTextStyle } from '@/domain'
import { daysAgo } from '../util'
import { letterhead, footer, cell, head, mkEl } from './template.seed'
import raw from './legacy.data.json'
import rawTemplates from './legacy.templates.json'

interface LgCategory { id: number; name: string; tel_lab: string }
interface LgProduct { id: number; name: string; category_id: number; price: number | null; kun: number | null; lastday: number | null; shablon: string | null; nn: number | null; activ: boolean | null }
interface LgNatija { id: number; product_id: number | null; nn: number | null; name: string; norma: string | null; name1: string | null; norma1: string | null; tr1: string | null; tr2: string | null }
interface LgUstun { id: number; product_id: number; nn: number | null; name: string; field: string; show: boolean | null; dlina: number | null }
const data = raw as { category: LgCategory[]; product: LgProduct[]; natija: LgNatija[]; ustun: LgUstun[] }
const importedTemplates = rawTemplates as { assets: Omit<TemplateAsset, 'companyId'>[]; docs: Record<string, { name: string; doc: TemplateDoc }> }

/** Legacy andoza (NavbatApp app/shablon/andoza) → which services use it (mirrors legacy andoza_store.key_for_bundle). */
const ANDOZA_BINDINGS: Record<string, { serviceIds: number[]; categoryIds?: string[]; scope: 'item' | 'order'; status: 'active' | 'draft'; note: string }> = {
  parazitologiya: { serviceIds: [66], scope: 'item', status: 'active', note: 'natija_par*.fr3' },
  bakteriologiya: { serviceIds: [48, 50, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 64, 93], scope: 'item', status: 'active', note: 'natija_bak_jami.fr3' },
  gemokultura: { serviceIds: [51], scope: 'item', status: 'active', note: 'product 51' },
  mikroflora: { serviceIds: [62], scope: 'item', status: 'active', note: 'natija_bak_ma.fr3' },
  virus_bio: { serviceIds: [97, 98, 99, 100, 101, 102, 103], scope: 'item', status: 'active', note: 'natija_virus.json (biokimyo)' },
  virusologiya: { serviceIds: [], categoryIds: ['cat_vir'], scope: 'order', status: 'draft', note: 'gepatit paneli — chek darajasidagi hujjat (keyingi bosqich)' },
}

const stamp = (d = 320) => ({ createdAt: daysAgo(d), updatedAt: daysAgo(10) })
const CAT_MAP: Record<number, string> = { 1: 'cat_paraz', 2: 'cat_bak', 3: 'cat_vir' }
const DEFAULT_LABELS = new Set(['Taxlil nomi', 'Natija', 'Norma'])
const FIELD_LABEL: Record<string, string> = { name: 'Tahlil nomi', natija: 'Natija', norma: 'Me’yor', natija1: 'Natija 2', natija2: 'Natija 3', natija3: 'Natija 4' }

const YESNO: SelectOption[] = [
  { value: 'not_detected', label: 'Аниқланмади', flag: 'normal', color: '#2f8a4c' },
  { value: 'detected', label: 'Аниқланди', flag: 'abnormal', color: '#c2413f' },
]
// legacy hardcoded rules (lab.py:38-41): qualitative vs quantitative virology
const QUALITATIVE = new Set([83, 84, 86, 87, 92, 80, 85, 95, 96, 104])
const QUANTITATIVE = new Set([88, 89, 90])
const GENOTYPE = new Set([91])
const BIOCHEM = new Set([97, 98, 99, 100, 101, 102, 103])

/** Columns for a product from `ustun` (falls back to product 0 defaults). Dedupes by field, preferring specific labels. */
function columnsFor(pid: number): { key: string; label: string; width: number }[] {
  const own = data.ustun.filter((u) => u.product_id === pid && u.show !== false)
  const src = own.length ? own : data.ustun.filter((u) => u.product_id === 0)
  const byField = new Map<string, LgUstun>()
  for (const u of [...src].sort((a, b) => (a.nn ?? 0) - (b.nn ?? 0))) {
    const prev = byField.get(u.field)
    if (!prev || (DEFAULT_LABELS.has(prev.name) && !DEFAULT_LABELS.has(u.name))) byField.set(u.field, u)
  }
  const order = ['name', 'natija', 'natija1', 'natija2', 'natija3', 'norma']
  if (!byField.has('natija')) byField.set('natija', { id: 0, product_id: pid, nn: 2, name: 'Natija', field: 'natija', show: true, dlina: 300 })
  return order.filter((f) => byField.has(f)).map((f) => ({ key: f, label: byField.get(f)!.name || FIELD_LABEL[f] || f, width: f === 'name' ? 300 : 120 }))
}

function tableSchema(p: LgProduct, rows: LgNatija[]): AttributeSchema {
  const isAntibiogram = rows.some((r) => r.name1)
  const cols = isAntibiogram
    ? [{ key: 'name', label: 'Антибиотик', width: 300 }, { key: 'natija', label: 'Сезувчанлиги', width: 120 }, { key: 'natija1', label: 'Антибиотик (2)', width: 300 }, { key: 'natija2', label: 'Сезувчанлиги (2)', width: 120 }]
    : columnsFor(p.id)
  const columns: Exclude<FieldDef, TableField>[] = cols.map((c, i) => ({
    key: c.key, label: c.label, type: 'text' as const, required: c.key === 'name', order: i + 1,
    ...(c.key.startsWith('natija') && !isAntibiogram ? { placeholder: '—' } : {}),
  }))
  const preset = rows
    .filter((r) => r.name && r.name !== '-')
    .map((r) => {
      const o: Record<string, unknown> = {}
      for (const c of cols) o[c.key] = c.key === 'name' ? r.name : c.key === 'norma' ? (r.norma ?? '') : c.key === 'natija1' && isAntibiogram ? (r.name1 ?? '') : ''
      return o
    })
  const table: TableField = {
    key: 'rows', label: 'Tahlil natijalari', type: 'table', required: true, order: 1, columns, presetRows: preset,
    allowAddRows: true, allowRemoveRows: true, hint: `Legacy: ${p.shablon ?? 'natija.json'}`,
  }
  return {
    id: `sch_lg_${p.id}`, companyId: 'c1', name: p.name, version: 1, status: 'published', usedBy: 1, ...stamp(),
    description: 'NavbatApp bazasidan import qilingan natija shabloni',
    fields: [table, { key: 'comment', label: 'Laborant izohi', type: 'longtext', required: false, order: 2, maxLength: 500 }],
  }
}

function simpleSchema(p: LgProduct): AttributeSchema | null {
  if (QUALITATIVE.has(p.id)) return { id: `sch_lg_${p.id}`, companyId: 'c1', name: p.name, version: 1, status: 'published', usedBy: 1, ...stamp(), fields: [
    { key: 'result', label: 'Natija', type: 'select', options: YESNO, required: true, order: 1 },
    { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 2 } ] }
  if (QUANTITATIVE.has(p.id)) return { id: `sch_lg_${p.id}`, companyId: 'c1', name: p.name, version: 1, status: 'published', usedBy: 1, ...stamp(), fields: [
    { key: 'result', label: 'Natija', type: 'select', options: YESNO, required: true, order: 1 },
    { key: 'load', label: 'Miqdor', type: 'number', unit: 'ME/ml', required: false, order: 2, decimals: 0, references: [{ text: 'бўлмаслиги керак' }], visibleIf: { key: 'result', equals: 'detected' } },
    { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 3 } ] }
  if (GENOTYPE.has(p.id)) return { id: `sch_lg_${p.id}`, companyId: 'c1', name: p.name, version: 1, status: 'published', usedBy: 1, ...stamp(), fields: [
    { key: 'genotype', label: 'Genotip', type: 'select', required: true, order: 1, options: ['1а', '1б', '2', '3а', '4'].map((v) => ({ value: v, label: v })) },
    { key: 'comment', label: 'Izoh', type: 'longtext', required: false, order: 2 } ] }
  return null
}

function tableTemplate(st: ServiceType, schema: AttributeSchema): ResultTemplate {
  const table = schema.fields[0] as TableField
  const totalW = 714
  const nameW = 300
  const others = table.columns.length - 1
  const otherW = others > 0 ? Math.floor((totalW - nameW) / others) : 0
  const columns: TableColumn[] = table.columns.map((c, i) => ({ id: `c${i}`, header: c.label, bind: c.key, width: c.key === 'name' ? nameW : otherW, align: c.key === 'name' ? 'left' : 'center' }))
  const rowsN = Math.max(4, table.presetRows.length)
  const doc: TemplateDoc = {
    paper: 'A4', orientation: 'portrait', background: '#ffffff', margin: 40,
    elements: [
      ...letterhead(st.name.toUpperCase()).map((e) => (e.name === 'Sarlavha' && e.type === 'text' && st.name.length > 40 ? { ...e, h: 40, style: { ...e.style, fontSize: 12.5 } } : e)),
      mkEl({ type: 'table', x: 40, y: 250, w: totalW, h: Math.min(600, 26 + rowsN * 22), fieldKey: 'rows', showHeader: true, showRowNumber: true, highlightAbnormal: false, columns, headerStyle: head, cellStyle: cell, rowHeight: 22, borderColor: '#dbe3df', borderWidth: 1, zebra: '#f5f7f6' }) as TemplateElement,
      mkEl({ type: 'field', x: 40, y: 880, w: 714, h: 50, fieldKey: 'comment', showLabel: true, showUnit: false, showReference: false, highlightAbnormal: false, style: defaultTextStyle({ fontSize: 11 }) }) as TemplateElement,
      ...footer(),
    ],
  }
  return { id: `tpl_lg_${st.id.replace('st_lg_', '')}`, companyId: 'c1', name: `${st.name} — blanka`, status: 'active', version: 1, serviceTypeIds: [st.id], categoryIds: [], scope: 'item', language: 'uz', doc, usage: 0, ...stamp() }
}

function fieldsTemplate(id: string, name: string, serviceTypeIds: string[], schema: AttributeSchema): ResultTemplate {
  const doc: TemplateDoc = {
    paper: 'A4', orientation: 'portrait', background: '#ffffff', margin: 40,
    elements: [
      ...letterhead('TAHLIL NATIJASI'),
      ...schema.fields.map((f, i) => mkEl({ type: 'field', x: 40, y: 260 + i * 34, w: 714, h: f.type === 'longtext' ? 60 : 22, fieldKey: f.key, showLabel: true, showUnit: true, showReference: true, highlightAbnormal: true, style: defaultTextStyle({ fontSize: 12 }) }) as TemplateElement),
      ...footer(),
    ],
  }
  return { id, companyId: 'c1', name, status: 'active', version: 1, serviceTypeIds, categoryIds: [], scope: 'item', language: 'uz', doc, usage: 0, ...stamp() }
}

export function buildLegacyCatalog(): { serviceTypes: ServiceType[]; schemas: AttributeSchema[]; templates: ResultTemplate[]; assets: TemplateAsset[] } {
  const serviceTypes: ServiceType[] = []
  const schemas: AttributeSchema[] = []
  const templates: ResultTemplate[] = []
  const qualIds: string[] = [], quantIds: string[] = [], genoIds: string[] = []
  const natijaBy = new Map<number, LgNatija[]>()
  for (const n of data.natija) if (n.product_id != null) (natijaBy.get(n.product_id) ?? natijaBy.set(n.product_id, []).get(n.product_id)!).push(n)

  for (const p of data.product) {
    if (!p.name || p.name === '-') continue
    const rows = (natijaBy.get(p.id) ?? []).filter((r) => r.name && r.name !== '-')
    let schemaId: string | null = null
    let defaultTemplateId: string | null = null
    const st: ServiceType = {
      id: `st_lg_${p.id}`, companyId: 'c1', categoryId: CAT_MAP[p.category_id] ?? 'cat_lab', name: p.name, code: `LG-${p.id}`,
      description: p.shablon ? `Legacy blanka: ${p.shablon}` : undefined, price: p.price ?? 0, branchPrices: {}, turnaroundDays: p.kun ?? 1,
      order: 100 + (p.nn ?? p.id), isActive: p.activ !== false, schemaId: null, documentScope: 'item', defaultTemplateId: null, ...stamp(),
    }
    if (rows.length >= 2 || (p.category_id === 2 && !simpleSchema(p))) {
      const sch = tableSchema(p, rows)
      schemas.push(sch); schemaId = sch.id
      const tpl = tableTemplate(st, sch); templates.push(tpl); defaultTemplateId = tpl.id
    } else {
      const sch = simpleSchema(p)
      if (sch) {
        schemas.push(sch); schemaId = sch.id
        if (QUALITATIVE.has(p.id)) { qualIds.push(st.id); defaultTemplateId = 'tpl_lg_qual' }
        else if (QUANTITATIVE.has(p.id)) { quantIds.push(st.id); defaultTemplateId = 'tpl_lg_quant' }
        else { genoIds.push(st.id); defaultTemplateId = 'tpl_lg_geno' }
      } else if (BIOCHEM.has(p.id)) { schemaId = 'sch_bio'; defaultTemplateId = 'tpl_bio' }
      else schemaId = null // e.g. "Забор кров" — no result document
    }
    st.schemaId = schemaId
    st.defaultTemplateId = defaultTemplateId
    serviceTypes.push(st)
  }
  const first = (ids: string[]) => schemas.find((s) => s.id === `sch_lg_${ids[0]?.replace('st_lg_', '')}`)
  const q = first(qualIds); if (q) templates.push(fieldsTemplate('tpl_lg_qual', 'Virusologiya — sifat (IFA/PCR)', qualIds, q))
  const qq = first(quantIds); if (qq) templates.push(fieldsTemplate('tpl_lg_quant', 'Virusologiya — miqdor (PCR)', quantIds, qq))
  const g = first(genoIds); if (g) templates.push(fieldsTemplate('tpl_lg_geno', 'Virusologiya — genotip', genoIds, g))

  // Imported legacy andoza documents (pixel-faithful) — become the DEFAULT template of their services.
  for (const [key, b] of Object.entries(ANDOZA_BINDINGS)) {
    const src = importedTemplates.docs[key]
    if (!src) continue
    const ids = b.serviceIds.map((n) => `st_lg_${n}`).filter((id) => serviceTypes.some((s) => s.id === id))
    if (key === 'virus_bio') ids.push('st_bio')
    const tpl: ResultTemplate = {
      id: `tpl_andoza_${key}`, companyId: 'c1', name: `${src.name} (SES andoza)`, description: `NavbatApp andoza: ${b.note}`,
      status: b.status, version: 1, serviceTypeIds: ids, categoryIds: b.categoryIds ?? [], scope: b.scope, language: 'uz', doc: src.doc, usage: 0, ...stamp(400),
    }
    templates.push(tpl)
    if (b.status === 'active') for (const st of serviceTypes) if (ids.includes(st.id)) st.defaultTemplateId = tpl.id
  }
  const assets: TemplateAsset[] = importedTemplates.assets.map((a) => ({ ...a, companyId: 'c1', kind: a.kind as TemplateAsset['kind'] }))
  return { serviceTypes, schemas, templates, assets }
}

export const LEGACY_CATEGORY_PHONES: Record<string, string> = Object.fromEntries(data.category.map((c) => [CAT_MAP[c.id] ?? String(c.id), c.tel_lab]))
