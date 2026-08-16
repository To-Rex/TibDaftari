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
  t = t.replace(/\[([a-d]\d{1,2})\]/g, (_, v) => (docKey === 'virus_bio' && v in BIO_VARS ? (BIO_VARS[v] ? `{${BIO_VARS[v]}}` : '') : `{values.${v}}`))
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

const docs = {}
for (const f of readdirSync(SRC).filter((x) => x.endsWith('.json'))) {
  const key = f.replace('.json', '')
  const src = JSON.parse(readFileSync(join(SRC, f), 'utf8'))
  const elements = fixRowOverlaps(fixLetterhead((src.elements ?? []).map((e) => convert(e, key)).filter(Boolean)))
  docs[key] = { name: src.name ?? key, doc: { paper: 'A4', orientation: src.orientation === 'landscape' ? 'landscape' : 'portrait', background: src.bg || '#ffffff', margin: 40, elements } }
  console.log(key, elements.length, 'elements')
}
writeFileSync(OUT_JSON, JSON.stringify({ assets, docs }, null, 1), 'utf8')
console.log('assets:', assets.length, '→', OUT_DIR)
