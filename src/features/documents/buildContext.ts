/**
 * Builds a RenderContext from domain objects (mirror of the backend `renderer/context.py`).
 *
 * Organisation keys: `org` is the organisation a document is issued by — the nearest unit above facility level on
 * the facility's path (name, shortName, legalName, phone, email, address, logoUrl) — and `unit` is the facility
 * itself (name, code, phone, address, timezone, district / region). `company` and `branch` are kept as ALIASES of
 * `org` / `unit` so templates written before the organisation tree (`{company.name}`, `{branch.code}` …) render
 * unchanged; `company.slug` (the old cheque prefix) is the facility code.
 */
import type { AttributeSchema, Category, Order, OrderItem, OrgUnit, Patient, Payment, RenderContext, RenderItem } from '@/domain'
import { itemStatusMeta, orderStatusMeta, paymentMethodLabel, paymentStatusMeta } from '@/features/orders/status'
import { ageFrom, ageMonthsFrom, fmtDate, fmtDateTime, fmtMoney, fmtPhone, fmtTime } from '@/shared/lib/format'
import i18n from '@/shared/i18n'

/** The organisation's letterhead data — an `OrgUnit` row of any level above facility fits as it is. */
export type OrgCtx = Pick<OrgUnit, 'name'> & Partial<Pick<OrgUnit, 'shortName' | 'legalName' | 'phone' | 'email' | 'address' | 'logoUrl'>>
/** The facility — an `OrgUnit` row of level `facility` fits as it is. */
export type UnitCtx = Pick<OrgUnit, 'name'> & Partial<Pick<OrgUnit, 'shortName' | 'code' | 'kind' | 'phone' | 'email' | 'address' | 'timezone' | 'districtName' | 'regionName'>>
type CategoryCtx = Pick<Category, 'name'> & Partial<Pick<Category, 'code' | 'phone'>>

/** `org.*` placeholders. */
export interface OrgBlock { name: string; shortName: string; legalName: string; phone?: string; email?: string; address?: string; logoUrl?: string }
/** `unit.*` placeholders (`phone` formatted for print). */
export interface UnitBlock { name: string; shortName: string; code: string; kind: string; phone?: string; email?: string; address?: string; timezone: string; district: string; region: string }
/** The render context with the organisation-tree blocks (`company` / `branch` inside are their aliases). */
export type DocumentRenderContext = RenderContext & { org: OrgBlock; unit: UnitBlock }

/** Sample organisation / facility for editor previews when no real document is selected. */
const SAMPLE_ORG: OrgCtx = { name: 'TibDaftari tibbiyot markazlari', shortName: 'TibDaftari', legalName: 'TibDaftari MChJ', email: 'info@tibdaftari.uz' }
const SAMPLE_UNIT: UnitCtx = { name: 'Urganch shahar muassasasi', shortName: 'Urganch', code: 'UR', kind: 'clinic', timezone: 'Asia/Tashkent', districtName: 'Urganch shahri', regionName: 'Xorazm viloyati' }

export function buildRenderContext(input: {
  patient?: Pick<Patient, 'fullName' | 'phone' | 'birthDate' | 'gender' | 'address' | 'passportNumber' | 'pinfl' | 'workplace' | 'discountPercent' | 'contractNumber' | 'note' | 'tags'> | null
  /** receipts pass the whole order — its totals become `order.*` placeholders */
  order?: (Pick<Order, 'number' | 'createdAt'> & Partial<Pick<Order, 'subtotal' | 'discountPercent' | 'discountAmount' | 'total' | 'paidAmount' | 'itemCount' | 'note' | 'status' | 'payment'>>) | null
  item?: Pick<OrderItem, 'serviceName' | 'serviceTypeId' | 'categoryName' | 'price' | 'finalPrice' | 'status' | 'schemaVersion' | 'enteredAt' | 'submittedAt' | 'approvedAt' | 'technicianName' | 'doctorName' | 'rejectReason' | 'labNote' | 'values'> | null
  /** catalog code of the primary item (not stored on OrderItem) */
  serviceCode?: string
  /** the organisation that issues the document — the nearest unit above facility level (`org.*`) */
  org?: OrgCtx | null
  /** the facility that did the work (`unit.*`) */
  unit?: UnitCtx | null
  /** aliases of `org` / `unit` for callers written before the organisation tree */
  company?: OrgCtx | null
  branch?: UnitCtx | null
  category?: CategoryCtx | null
  schema?: AttributeSchema | null
  districtName?: string
  regionName?: string
  /** receipts: payments (non-refunded) and the cashier who opened the cheque */
  payments?: Pick<Payment, 'createdAt' | 'method' | 'amount' | 'note'>[]
  cashier?: string
  /** order-scoped documents: every covered item with its schema and catalog code */
  items?: { item: OrderItem; schema: AttributeSchema | null; code: string }[]
  /** the issued document's public verification link — the template's QR element encodes it */
  docLink?: string | null
}): DocumentRenderContext {
  const p = input.patient
  const address = [input.districtName, p?.address?.street].filter(Boolean).join(', ')
  const org = orgBlock(input.org ?? input.company)
  const unit = unitBlock(input.unit ?? input.branch)
  return {
    patient: {
      fullName: p?.fullName ?? '',
      phone: fmtPhone(p?.phone),
      birthDate: fmtDate(p?.birthDate),
      age: p?.birthDate ? String(ageFrom(p.birthDate)) : '',
      gender: p?.gender ? i18n.t(`common.${p.gender}`) : '',
      genderRaw: p?.gender,
      ageMonths: ageMonthsFrom(p?.birthDate),
      address,
      passportNumber: p?.passportNumber ?? '',
      pinfl: p?.pinfl ?? '',
      workplace: p?.workplace ?? '',
      discountPercent: String(p?.discountPercent ?? 0),
      contractNumber: p?.contractNumber ?? '',
      note: p?.note ?? '',
      tags: (p?.tags ?? []).join(', '),
      region: input.regionName ?? '',
      district: input.districtName ?? '',
      street: p?.address?.street ?? '',
    },
    order: { ...orderBlock(input.order), ...(input.payments ? { hasPayments: input.payments.length ? '1' : '' } : {}) },
    ...(input.cashier != null ? { cashier: { name: input.cashier } } : {}),
    ...(input.payments ? { payments: input.payments.map((pay, i) => ({ i: i + 1, date: fmtDateTime(pay.createdAt), method: paymentMethodLabel(pay.method), amount: fmtMoney(pay.amount, false), note: pay.note ?? '' })) } : {}),
    item: {
      serviceName: input.item?.serviceName ?? '',
      serviceCode: input.serviceCode ?? '',
      categoryName: input.item?.categoryName ?? '',
      status: input.item?.status ?? '',
      statusLabel: input.item?.status ? itemStatusMeta(input.item.status).label : '',
      price: input.item ? fmtMoney(input.item.price, false) : '',
      finalPrice: input.item ? fmtMoney(input.item.finalPrice, false) : '',
      enteredAt: input.item?.enteredAt ? fmtDateTime(input.item.enteredAt) : '',
      submittedAt: input.item?.submittedAt ? fmtDateTime(input.item.submittedAt) : '',
      approvedAt: input.item?.approvedAt ? fmtDateTime(input.item.approvedAt) : '',
      technician: input.item?.technicianName ?? '',
      doctor: input.item?.doctorName ?? '',
      labNote: input.item?.labNote ?? '',
      rejectReason: input.item?.rejectReason ?? '',
      schemaVersion: input.item?.schemaVersion != null ? String(input.item.schemaVersion) : '',
    },
    org,
    unit,
    // aliases — templates authored before the organisation tree keep rendering ({company.name}, {branch.code});
    // `company.slug` (the old cheque prefix) is the facility code
    company: { ...org, slug: unit.code },
    branch: unit,
    category: { name: input.category?.name ?? '', code: input.category?.code, phone: input.category?.phone },
    today: fmtDate(new Date().toISOString()),
    now: fmtDateTime(new Date().toISOString()),
    ...(input.docLink ? { doc: { link: input.docLink } } : {}),
    values: input.item?.values ?? {},
    schema: input.schema ?? null,
    items: input.items?.map(toRenderItem),
  }
}

export const toRenderItem = (x: { item: OrderItem; schema: AttributeSchema | null; code: string }): RenderItem => ({
  code: x.code, serviceTypeId: x.item.serviceTypeId, serviceName: x.item.serviceName, status: x.item.status, statusLabel: itemStatusMeta(x.item.status).label,
  values: x.item.values, schema: x.schema,
  enteredAt: x.item.enteredAt ? fmtDateTime(x.item.enteredAt) : undefined,
  submittedAt: x.item.submittedAt ? fmtDateTime(x.item.submittedAt) : undefined,
  approvedAt: x.item.approvedAt ? fmtDateTime(x.item.approvedAt) : undefined, technician: x.item.technicianName, doctor: x.item.doctorName,
  price: fmtMoney(x.item.price, false), finalPrice: fmtMoney(x.item.finalPrice, false), category: x.item.categoryName,
  schemaVersion: x.item.schemaVersion != null ? String(x.item.schemaVersion) : undefined,
})

/** `org.*`: the organisation's letterhead data. Mirror of the backend `org_block`. */
function orgBlock(o: OrgCtx | null | undefined): OrgBlock {
  return { name: o?.name ?? '', shortName: o?.shortName || o?.name || '', legalName: o?.legalName ?? '', phone: o?.phone ?? undefined, email: o?.email ?? undefined, address: o?.address ?? undefined, logoUrl: o?.logoUrl ?? undefined }
}

/** `unit.*`: the facility — its code is the cheque prefix; district / region come from the unit row. Mirror of `unit_block`. */
function unitBlock(u: UnitCtx | null | undefined): UnitBlock {
  return { name: u?.name ?? '', shortName: u?.shortName || u?.name || '', code: u?.code ?? '', kind: u?.kind ?? '', phone: u?.phone ? fmtPhone(u.phone) : undefined, email: u?.email ?? undefined, address: u?.address ?? undefined, timezone: u?.timezone ?? '', district: u?.districtName ?? '', region: u?.regionName ?? '' }
}

/** `order.*`: number/date always; totals when the order carries them (receipts). Mirror of the backend `_order_block`. */
function orderBlock(o: NonNullable<Parameters<typeof buildRenderContext>[0]['order']> | null | undefined): RenderContext['order'] {
  // {order.date} carries the time (a bare 'yyyy-MM-dd' stays a date); {order.dateOnly} is just the day
  const block: RenderContext['order'] = { number: o?.number ?? '', date: o?.createdAt && o.createdAt.length > 10 ? fmtDateTime(o.createdAt) : fmtDate(o?.createdAt), dateOnly: fmtDate(o?.createdAt) }
  if (!o) return block
  if (o.createdAt) { block.dateTime = fmtDateTime(o.createdAt); block.time = fmtTime(o.createdAt) }
  if (o.status) { block.status = o.status; block.statusLabel = orderStatusMeta(o.status).label }
  if (o.payment) { block.payment = o.payment; block.paymentLabel = paymentStatusMeta(o.payment).label }
  if (o.total != null) {
    const total = o.total, paid = o.paidAmount ?? 0
    Object.assign(block, {
      subtotal: fmtMoney(o.subtotal ?? total, false), discountPercent: String(o.discountPercent ?? 0), discountAmount: fmtMoney(o.discountAmount ?? 0, false),
      total: fmtMoney(total, false), paidAmount: fmtMoney(paid, false), remaining: fmtMoney(Math.max(0, total - paid), false),
      itemCount: String(o.itemCount ?? 0), note: o.note ?? '',
      // presence flags for showIf (the discount line, the balance line)
      hasDiscount: (o.discountPercent ?? 0) > 0 || (o.discountAmount ?? 0) > 0 ? '1' : '', hasRemaining: total - paid > 0 ? '1' : '',
    })
  }
  return block
}

/** Sample context for RECEIPT templates: three services, a discount, a partial payment. */
export function sampleReceiptRenderContext(org?: OrgCtx | null, unit?: UnitCtx | null): DocumentRenderContext {
  const now = new Date().toISOString()
  const services = [['PAR', 'Парозитологик тахлил', 'Parazitologiya', 52000], ['BAK', 'Бактериологик тахлил', 'Bakteriologiya', 160000], ['IFA', 'ИФА ВГ “B”', 'Virusologiya', 41000]] as const
  const subtotal = services.reduce((s, x) => s + x[3], 0)
  const discount = 10, total = subtotal - Math.floor(subtotal * discount / 100)
  const ctx = buildRenderContext({
    patient: { fullName: 'Karimova Madina Aziz qizi', phone: '998901234567', birthDate: '1992-04-12', gender: 'female', address: { street: 'Al-Xorazmiy ko‘chasi, 12-uy' }, passportNumber: 'AB1234567', pinfl: '50101992040012', workplace: 'TibDaftari', discountPercent: 10, contractNumber: 'SH-00124', note: 'Doimiy mijoz', tags: ['VIP'] },
    order: { number: 'UR-001240', createdAt: now, subtotal, discountPercent: discount, discountAmount: Math.floor(subtotal * discount / 100), total, paidAmount: total - 50000, itemCount: services.length, status: 'in_progress', payment: 'partial' },
    org: org ?? SAMPLE_ORG,
    unit: unit ?? SAMPLE_UNIT,
    payments: [{ createdAt: now, method: 'cash', amount: total - 50000 }],
    cashier: 'Umida Qodirova',
    districtName: 'Urganch shahri',
    regionName: 'Xorazm viloyati',
  })
  ctx.items = services.map(([code, name, category, price]) => ({ code, serviceTypeId: code, serviceName: name, status: 'pending', statusLabel: 'Navbatda', values: {}, schema: null, price: fmtMoney(price, false), finalPrice: fmtMoney(price - Math.floor(price * discount / 100), false), category, schemaVersion: '1' }))
  return ctx
}

/** Sample values for a schema (shared by item- and order-scope previews). */
export function sampleValues(schema: AttributeSchema | null): RenderContext['values'] {
  const values: RenderContext['values'] = {}
  for (const f of schema?.fields ?? []) {
    switch (f.type) {
      case 'text': values[f.key] = 'Namuna matn'; break
      case 'longtext': values[f.key] = 'Izoh matni. Qayta tahlil 30 kundan so‘ng tavsiya etiladi.'; break
      case 'number': { const r = f.references[0]; values[f.key] = r?.min != null && r?.max != null ? Number(((r.min + r.max) / 2).toFixed(f.decimals ?? 1)) : 12.5; break }
      case 'select': values[f.key] = f.options[0]?.value ?? null; break
      case 'multiselect': values[f.key] = f.options.slice(0, 2).map((o) => o.value); break
      case 'boolean': values[f.key] = true; break
      case 'date': values[f.key] = new Date().toISOString().slice(0, 10); break
      case 'table': {
        if (f.presetRows.length) {
          // preset (seeded) tables preview EXACTLY like the empty blank: every row, preset cells as-is,
          // result columns left empty — they are filled by the laboratory, never by the template
          values[f.key] = f.presetRows.map((r) => ({ ...r }))
          break
        }
        values[f.key] = Array.from({ length: 4 }, (_, i) => {
          const o: Record<string, unknown> = {}
          for (const c of f.columns) o[c.key] = c.type === 'select' ? (c.options[i % c.options.length]?.value ?? '') : c.type === 'number' ? 10 + i : c.type === 'boolean' ? i % 2 === 0 : c.type === 'multiselect' ? c.options.slice(0, 1).map((x) => x.value) : `Namuna ${i + 1}`
          return o
        })
        break
      }
    }
  }
  return values
}

/** Sample context for ORDER-scoped previews: one RenderItem per bound service. */
export function sampleOrderRenderContext(services: { code: string; name: string; serviceTypeId: string; schema: AttributeSchema | null }[], org?: OrgCtx | null, unit?: UnitCtx | null, category?: CategoryCtx | null): DocumentRenderContext {
  const base = sampleRenderContext(services[0]?.schema ?? null, org, unit, category)
  return {
    ...base,
    items: services.map((s) => ({ code: s.code, serviceTypeId: s.serviceTypeId, serviceName: s.name, status: 'approved', statusLabel: 'Tasdiqlangan', values: sampleValues(s.schema), schema: s.schema, enteredAt: base.item.enteredAt, submittedAt: base.item.submittedAt, approvedAt: base.item.approvedAt, technician: base.item.technician, doctor: base.item.doctor, price: fmtMoney(50000, false), finalPrice: fmtMoney(45000, false), category: category?.name, schemaVersion: '1' })),
  }
}

/** Sample context for editor previews when no real item is selected. */
export function sampleRenderContext(schema: AttributeSchema | null, org?: OrgCtx | null, unit?: UnitCtx | null, category?: CategoryCtx | null): DocumentRenderContext {
  const values = sampleValues(schema)
  return buildRenderContext({
    patient: { fullName: 'Karimova Madina Aziz qizi', phone: '998901234567', birthDate: '1992-04-12', gender: 'female', address: { street: 'Al-Xorazmiy ko‘chasi, 12-uy' }, passportNumber: 'AB1234567', pinfl: '50101992040012', workplace: 'TibDaftari', discountPercent: 0, contractNumber: 'SH-00124', note: 'Doimiy mijoz', tags: ['VIP'] },
    order: { number: 'UR-001240', createdAt: new Date().toISOString(), subtotal: 50000, discountPercent: 0, discountAmount: 0, total: 50000, paidAmount: 50000, itemCount: 1, note: 'Namuna izoh', status: 'completed', payment: 'paid' },
    item: { serviceName: 'Namuna xizmat', serviceTypeId: 'sample', categoryName: 'Laboratoriya', price: 50000, finalPrice: 45000, status: 'approved', schemaVersion: 1, enteredAt: new Date().toISOString(), submittedAt: new Date().toISOString(), approvedAt: new Date().toISOString(), technicianName: 'D. Rahimova', doctorName: 'A. Jumaniyazov', labNote: 'Namuna sifati qoniqarli', values },
    serviceCode: 'LG-001',
    org: org ?? SAMPLE_ORG,
    unit: unit ?? SAMPLE_UNIT,
    category: category ?? { name: 'Laboratoriya', code: 'LAB', phone: '97-092-08-88; 97-457-83-89' },
    schema,
    districtName: 'Urganch shahri',
    regionName: 'Xorazm viloyati',
  })
}
