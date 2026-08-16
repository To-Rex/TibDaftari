/**
 * Dev tool: converts NavbatApp andoza JSON documents (app/shablon/andoza/*.json)
 * into the Clinic-Web TemplateDoc format.
 *   node scripts/import-legacy-andoza.mjs [path/to/NavbatApp]
 * Outputs:
 *   src/data/mock/seed/legacy.templates.json  — docs + asset registry (no base64)
 *   public/legacy/<hash>.<ext>                 — extracted images
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const NAVBAT = resolve(process.argv[2] ?? '../NavbatApp')
const SRC = join(NAVBAT, 'app', 'shablon', 'andoza')
const OUT_JSON = resolve('src/data/mock/seed/legacy.templates.json')
const OUT_DIR = resolve('public/legacy')
mkdirSync(OUT_DIR, { recursive: true })

/** legacy `[alias."field"]` → new `{path}` */
const TOKEN_MAP = {
  'frequest.bemor': 'patient.fullName', 'frequest.full_name': 'patient.fullName', 'frequest.fio': 'patient.fullName',
  'user.full_name': 'patient.fullName', 'users.full_name': 'patient.fullName', 'fusers.full_name': 'patient.fullName',
  'frequest.tel': 'patient.phone', 'frequest.phone': 'patient.phone', 'user.phone': 'patient.phone', 'fusers.phone': 'patient.phone',
  'user.birthday': 'patient.birthDate', 'users.birthday': 'patient.birthDate', 'fusers.birthday': 'patient.birthDate', 'frequest.birthday': 'patient.birthDate',
  'faddress.street_home': 'patient.address', 'address.street_home': 'patient.address', 'user.manzil': 'patient.address',
  'user.passport_number': 'patient.passportNumber',
  'frequest.chek_nn': 'order.number', 'frequest.id': 'order.number',
  'frequest.chek_sana': 'order.date', 'frequest.chek_sana_full': 'order.date',
  'frequest.tasdiq_sana': 'item.approvedAt', 'frequest.tasdiq_sana_full': 'item.approvedAt', 'frequest.t_sana': 'item.approvedAt',
  'frequest.labrez': 'item.labNote', 'xizmat.labrez': 'item.labNote',
  'product.name': 'item.serviceName', 'xizmat.analiz': 'item.serviceName',
  'laborant.name': 'item.technician', 'lab.name': 'item.technician', 'employee.name': 'item.technician',
  'vrach.name': 'item.doctor', 'tasdiq.name': 'item.doctor',
  'category.name': 'item.serviceName',
  'setup.name': 'company.name',
}
/**
 * virusologiya (hepatitis panel) script variables → order-scoped placeholders by SERVICE CODE
 * (legacy compute_vars: a=natija, b=miqdor/OD, c=qualitative PCR, d=quantitative PCR / genotype).
 * Codes are catalog ServiceType.code (LG-<legacy product id>) — admins can rebind in the editor.
 */
const HEP_VARS = {
  a1: 'svc.LG-85.result', b1: 'svc.LG-85.od', a2: 'svc.LG-83.result', b2: 'svc.LG-83.od',
  a3: 'svc.LG-84.result', b3: 'svc.LG-84.od', a4: 'svc.LG-92.result', b4: 'svc.LG-92.od',
  c1: 'svc.LG-86.result', c2: 'svc.LG-87.result',
  d1: 'svc.LG-88.load', d2: 'svc.LG-89.load', d3: 'svc.LG-90.load', d4: 'svc.LG-91.genotype',
}
/** virus_bio script variables → biochemistry schema keys (sch_bio) */
const BIO_VARS = { a10: 'values.bilirubin_total', a11: 'values.bilirubin_direct', a12: '', a13: 'values.alt', a14: 'values.ast', a15: 'values.protein', a16: 'values.albumin', a17: 'values.glucose', b2: '', b7: '' }

function mapText(text, docKey) {
  let t = String(text ?? '')
  t = t.replace(/<\/?b>/g, '').replace(/<\/?i>/g, '').replace(/<br\s*\/?>/g, '\n')
  t = t.replace(/\[([a-zA-Z_]+)\."([^"]+)"\]/g, (_, alias, field) => {
    if (['tahlil', 'ftaxlil', 'master', 'data'].includes(alias)) return `{row.${field}}`
    const k = `${alias}.${field}`
    return TOKEN_MAP[k] != null ? `{${TOKEN_MAP[k]}}` : `{${k}}`
  })
  t = t.replace(/\[i\]|\[line\]/g, '{i}').replace(/\[date\]/g, '{today}')
  t = t.replace(/\[([a-d]\d{1,2})\]/g, (_, v) => {
    if (docKey === 'virus_bio' && v in BIO_VARS) return BIO_VARS[v] ? `{${BIO_VARS[v]}}` : ''
    if (docKey === 'virusologiya' && v in HEP_VARS) return `{${HEP_VARS[v]}}`
    return `{values.${v}}`
  })
  return t
}
const mapExpr = (e) => (e ? mapText(e) : undefined)

const assets = []
const assetByHash = new Map()
function assetFor(src, w, h, docKey) {
  const m = /^data:image\/(png|jpe?g|svg\+xml|bmp|webp|gif);base64,(.+)$/s.exec(src ?? '')
  if (!m) return { src }
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1] === 'svg+xml' ? 'svg' : m[1]
  const buf = Buffer.from(m[2], 'base64')
  const hash = createHash('sha1').update(buf).digest('hex').slice(0, 10)
  if (!assetByHash.has(hash)) {
    const file = `${hash}.${ext}`
    writeFileSync(join(OUT_DIR, file), buf)
    const ratio = w / h
    const kind = ext === 'jpg' && w > 150 ? 'logo' : ratio > 1.4 ? 'signature' : 'stamp'
    const id = `as_lg_${hash}`
    assets.push({ id, kind, name: `${docKey}: ${kind} ${w}×${h}`, url: `/legacy/${file}`, width: w, height: h })
    assetByHash.set(hash, id)
  }
  return { assetId: assetByHash.get(hash) }
}

const style = (e) => ({
  fontFamily: /times|georgia|garamond|serif/i.test(e.font ?? '') ? 'serif' : /mono|courier/i.test(e.font ?? '') ? 'mono' : 'sans',
  fontSize: Number(e.size ?? 13),
  fontWeight: e.bold ? 700 : 400,
  italic: !!e.italic || undefined,
  underline: !!e.underline || undefined,
  color: e.color || '#000000',
  align: ['left', 'center', 'right', 'justify'].includes(e.align) ? e.align : 'left',
  vAlign: 'top',
  lineHeight: e.lh ? Number(e.lh) : 1.15,
  letterSpacing: e.ls ? Number(e.ls) : undefined,
  background: e.bg && e.bg !== 'transparent' ? e.bg : undefined,
})

let n = 0
const round = (v) => Math.round(Number(v) * 100) / 100
function convert(el, docKey) {
  const base = { id: `lg_${(n++).toString(36)}`, x: round(el.x), y: round(el.y), w: round(el.w), h: round(el.h) }
  if (el.rot) base.rotation = Number(el.rot)
  if (el.opacity != null && Number(el.opacity) !== 1) base.opacity = Number(el.opacity)
  if (el.locked) base.locked = true
  if (el.hidden) base.hidden = true
  if (el.rep) base.repeat = { fieldKey: 'rows', step: Number(el.rep.step ?? 18) }
  if (el.hlIf) base.showIf = mapExpr(el.hlIf)
  switch (el.type) {
    case 'text': return { ...base, type: 'text', text: mapText(el.text, docKey), style: style(el), name: (el.text ?? '').slice(0, 30) }
    case 'rect': return { ...base, type: 'rect', fill: el.fill || undefined, stroke: el.stroke || undefined, strokeWidth: el.sw ? Number(el.sw) : undefined, radius: el.radius ? Number(el.radius) : undefined }
    case 'ellipse': return { ...base, type: 'ellipse', fill: el.fill || undefined, stroke: el.stroke || undefined, strokeWidth: el.sw ? Number(el.sw) : undefined }
    case 'line': return { ...base, type: 'line', stroke: el.stroke || '#000000', strokeWidth: el.sw ? Number(el.sw) : 1, orientation: el.h > el.w ? 'vertical' : 'horizontal' }
    case 'image': return { ...base, type: 'image', fit: 'contain', ...assetFor(el.src, el.w, el.h, docKey) }
    default: return null
  }
}

/**
 * SES letterhead fix. In the pixel-perfect renderers (blanka_par.py etc.) the
 * 4 organisation title lines are centred to the RIGHT of the logo (centre ≈
 * 124.7 mm = 471 px), while the hand-made andoza JSON centres them across the
 * full page width — which overlaps the logo. Re-centre any centred text that
 * sits in the logo band and horizontally overlaps the logo image.
 */
function fixLetterhead(elements) {
  const logo = elements.find((e) => e.type === 'image' && e.y < 60 && e.x < 120 && e.w > 100)
  if (!logo) return elements
  const logoRight = logo.x + logo.w
  const band = logo.y + logo.h * 0.7 // organisation title lines only (section titles sit lower)
  return elements.map((e) => {
    if (e.type !== 'text' || e.style.align !== 'center') return e
    if (e.y > band || e.x > logoRight) return e
    const right = e.x + e.w
    const x = logoRight + 6
    if (right - x < 200) return e
    return { ...e, x: round(x), w: round(right - x) } // legacy: line 1 starts at 263px — this gives ~258px
  })
}

/** Text boxes on the same line must not overlap the next box (legacy PDF clips at the box edge). */
function fixRowOverlaps(elements) {
  const texts = elements.filter((e) => e.type === 'text' && !e.repeat)
  return elements.map((e) => {
    if (e.type !== 'text' || e.repeat || e.style.align === 'center') return e
    const next = texts
      .filter((o) => o !== e && Math.abs(o.y - e.y) < 8 && o.x > e.x + 20 && o.x < e.x + e.w)
      .sort((a, b) => a.x - b.x)[0]
    if (!next) return e
    return { ...e, w: round(Math.max(30, next.x - e.x - 4)) }
  })
}


/**
 * Hepatitis panel (virusologiya): the exported andoza JSON is older than the production
 * Delphi natija_virus.fr3 (ftasdiq_virus.pas maps a1..a7/b1..b7, c1,c2,c7, d1..d4).
 * Rebuild the three tables to the real 6 / 3 / 4 rows:
 *   T1: ИФА А IgM (85), ИФА А IgG (95), ИФА B (83), анти-HCV C (84), ИФА Д (92), Лямблия (96)
 *   T2: HBV DNA (86), HCV RNA (87), HCV RNA — davolashdan keyingi nazorat (104)
 *   T3: unchanged (88, 89, 90, 91)
 * Everything below is shifted down accordingly. Pure geometry — bindings stay {svc.CODE.field}.
 */
function rebuildHepatitisTables(elements) {
  const T1_TOP = 377, T1_HDR_BOTTOM = 407, T1_ROW0 = 409, STEP = 19, T2_TOP = 501, T3_TOP = 625
  const rowTpl = elements.find((e) => e.type === 'text' && e.y === T1_ROW0 && String(e.text).includes('svc.LG-85.result'))
  if (!rowTpl) return elements
  const cellStyle = { ...rowTpl.style }
  const mkText = (x, y, w, text, extra = {}) => ({ id: `lg_hep_${Math.random().toString(36).slice(2, 8)}`, type: 'text', x, y, w, h: 22, text, style: { ...cellStyle, ...extra } })
  const mkHLine = (y) => ({ id: `lg_hep_${Math.random().toString(36).slice(2, 8)}`, type: 'rect', x: 54, y, w: 687, h: 1, fill: '#000000' })

  // ---- table 1: rebuild rows
  const T1_ROWS = [
    ['ИФА ВГ “А”', 'IgM', 85], ['ИФА ВГ “А”', 'IgG', 95], ['ИФА ВГ “B”', 'HВs антиген', 83],
    ['ИФА анти-HCV ВГ “C”', 'IgG, IgM', 84], ['ИФА ВГ “Д”', 'антитела', 92], ['ИФА Лямблия', 'антитела', 96],
  ]
  const t1Bottom0 = T1_ROW0 + T1_ROWS.length * STEP - 2
  const t1Extra = t1Bottom0 - 482 // old bottom line was at 482 → +39
  const t1Bottom = T1_ROW0 + T1_ROWS.length * STEP - 2 // 409 + 114 - 2 = 521 (old bottom 482 → +39, snap to grid)
  const out = []
  for (const e of elements) {
    // header + everything above: keep; extend the vertical rules of table 1
    if (e.y < T1_ROW0) {
      if (e.type === 'rect' && e.h > 50 && e.y === T1_TOP) out.push({ ...e, h: t1Bottom - T1_TOP })
      else out.push(e)
      continue
    }
    // old table-1 data rows / separators: drop (regenerated below)
    if (e.y >= T1_ROW0 && e.y < T2_TOP) continue
    out.push(e) // handled in the shift pass
  }
  // ---- shift table 2 & 3 down by t1Extra; then insert 3rd row into table 2 (39px) and shift table 3 more
  const T2_ROW3_H = 39
  const res = []
  for (const e of out) {
    if (e.y < T2_TOP) { res.push(e); continue }
    if (e.y < T3_TOP) {
      const ne = { ...e, y: e.y + t1Extra }
      if (e.type === 'rect' && e.h > 50) ne.h = e.h + T2_ROW3_H // vertical rules of table 2
      // old bottom line of table 2 (y 606) moves down by the extra row
      if (e.type === 'rect' && e.h === 1 && e.y === 606) ne.y = e.y + t1Extra + T2_ROW3_H
      res.push(ne)
      continue
    }
    res.push({ ...e, y: e.y + t1Extra + T2_ROW3_H })
  }
  // table-1 rows (added AFTER the shift pass so they keep their own y)
  T1_ROWS.forEach(([name, kind, pid], i) => {
    const y = T1_ROW0 + i * STEP
    res.push(mkText(56, y, 195, name), mkText(251, y, 120, kind), mkText(371, y, 147, 'бўлмаслиги керак'),
      mkText(522, y, 135, `{svc.LG-${pid}.result}`), mkText(658, y, 85, `{svc.LG-${pid}.od}`))
    res.push(mkHLine(y + STEP - 2))
  })
  // new table-2 row (2-line name) right after old row 2 (old separator 606 → 606+t1Extra)
  const y3 = 606 + t1Extra + 3
  res.push(mkText(56, y3, 189, 'Вирусли гепатит С (РНК)'), mkText(56, y3 + 18, 189, 'Даволанишдан кейинги назорат', { fontSize: 13 }),
    mkText(249, y3, 120, 'сифат'), mkText(249, y3 + 18, 120, '(качества)'), mkText(371, y3, 145, 'бўлмаслиги керак'),
    mkText(520, y3, 221, '{svc.LG-104.result}'))
  return res
}

const docs = {}
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.json'))) {
  const key = f.replace('.json', '')
  const src = JSON.parse(readFileSync(join(SRC, f), 'utf8'))
  let elements = fixRowOverlaps(fixLetterhead((src.elements ?? []).map((e) => convert(e, key)).filter(Boolean)))
  if (key === 'virusologiya') elements = rebuildHepatitisTables(elements)
  docs[key] = { name: src.name ?? key, doc: { paper: 'A4', orientation: src.orientation === 'landscape' ? 'landscape' : 'portrait', background: src.bg || '#ffffff', margin: 40, elements } }
  console.log(key, elements.length, 'elements')
}
writeFileSync(OUT_JSON, JSON.stringify({ assets, docs }, null, 1), 'utf8')
console.log('assets:', assets.length, '→', OUT_DIR)
