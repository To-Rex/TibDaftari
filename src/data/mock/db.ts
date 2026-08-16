/**
 * In-memory mock database. Seeded deterministically once per session and
 * mutated by mock repositories. Shape mirrors the future relational model.
 */
import type {
  AttributeSchema, Branch, Category, Company, Employee, ItemStatus, Order, OrderItem, OutboxMessage,
  Patient, Payment, ResultDocument, ResultTemplate, Role, ServiceType, TemplateAsset, ValueMap, FieldDef,
  Region, District, Notification,
} from '@/domain'
import { COMPANIES, BRANCHES, ROLES, EMPLOYEES, REGIONS, DISTRICTS } from './seed/org.seed'
import { CATEGORIES, SERVICE_TYPES, SCHEMAS } from './seed/catalog.seed'
import { TEMPLATES, ASSETS } from './seed/template.seed'
import { rng, daysAgo, uid } from './util'

export interface MockDb {
  companies: Company[]
  branches: Branch[]
  roles: Role[]
  employees: Employee[]
  regions: Region[]
  districts: District[]
  patients: Patient[]
  categories: Category[]
  serviceTypes: ServiceType[]
  schemas: AttributeSchema[]
  templates: ResultTemplate[]
  assets: TemplateAsset[]
  orders: Order[]
  items: OrderItem[]
  payments: Payment[]
  documents: ResultDocument[]
  outbox: OutboxMessage[]
  notifications: Notification[]
  /** login → password (mock only) */
  credentials: Record<string, string>
}

const FIRST_M = ['Aziz', 'Bekzod', 'Davron', 'Eldor', 'Farrux', 'G‘ayrat', 'Humoyun', 'Islom', 'Jahongir', 'Kamol', 'Laziz', 'Mirzo', 'Nodir', 'Otabek', 'Rustam', 'Sardor', 'Timur', 'Ulug‘bek', 'Xurshid', 'Zafar', 'Sanjar', 'Shoxrux', 'Abror', 'Doniyor']
const FIRST_F = ['Aziza', 'Barno', 'Dilnoza', 'Feruza', 'Gulnora', 'Hilola', 'Iroda', 'Kamola', 'Lola', 'Madina', 'Nargiza', 'Ozoda', 'Rayhona', 'Sevara', 'Umida', 'Zulfiya', 'Nilufar', 'Shahnoza', 'Malika', 'Dildora', 'Sabina', 'Yulduz']
const LAST = ['Karimov', 'Rahimov', 'Yusupov', 'Abdullayev', 'Saidov', 'Matyoqubov', 'Bobojonov', 'Ro‘zmetov', 'Sobirov', 'Ergashev', 'Toshpo‘latov', 'Ismoilov', 'Xudoyberganov', 'Otajonov', 'Jumaniyozov', 'Sultonov', 'Qodirov', 'Yo‘ldoshev', 'Madaminov', 'Olimov']
const STREETS = ['Al-Xorazmiy ko‘chasi', 'Amir Temur shoh ko‘chasi', 'Navoiy ko‘chasi', 'Mustaqillik ko‘chasi', 'Bog‘bon MFY', 'Yoshlik MFY', 'Beruniy ko‘chasi', 'Ibn Sino ko‘chasi']
const WORK = ['O‘qituvchi', 'Shifokor', 'Tadbirkor', 'Talaba', 'Haydovchi', 'Uy bekasi', 'Muhandis', 'Sotuvchi', 'Nafaqaxo‘r', 'Dehqon']

function genPatients(r: ReturnType<typeof rng>, count: number, companyId: string): Patient[] {
  const out: Patient[] = []
  const usedPhones = new Set<string>()
  for (let i = 0; i < count; i++) {
    const female = r.chance(0.55)
    const first = r.pick(female ? FIRST_F : FIRST_M)
    const last = r.pick(LAST) + (female ? 'a' : '')
    const middle = r.pick(FIRST_M) + (female ? ' qizi' : ' o‘g‘li')
    let phone = ''
    do phone = `998${r.pick(['90', '91', '93', '94', '97', '99', '88', '33'])}${r.int(1000000, 9999999)}`
    while (usedPhones.has(phone))
    usedPhones.add(phone)
    const age = r.int(1, 78)
    const y = new Date().getFullYear() - age
    const districtId = r.pick(DISTRICTS.filter((d) => d.regionId === 'rg12')).id
    const created = daysAgo(r.int(1, 700))
    out.push({
      id: `p_${(i + 1).toString(36)}`, companyId, fullName: `${last} ${first} ${middle}`, phone,
      gender: female ? 'female' : 'male', birthDate: `${y}-${String(r.int(1, 12)).padStart(2, '0')}-${String(r.int(1, 28)).padStart(2, '0')}`,
      passportNumber: r.chance(0.6) ? `A${r.pick(['A', 'B', 'C'])}${r.int(1000000, 9999999)}` : undefined,
      pinfl: r.chance(0.5) ? String(r.int(30000000000000, 60000000000000)) : undefined,
      address: { regionId: 'rg12', districtId, street: `${r.pick(STREETS)}, ${r.int(1, 120)}-uy` },
      workplace: r.chance(0.6) ? r.pick(WORK) : undefined, discountPercent: r.chance(0.08) ? r.pick([5, 10, 15, 20]) : 0,
      contractNumber: r.chance(0.05) ? `SH-${r.int(100, 999)}` : undefined, note: r.chance(0.1) ? 'Doimiy mijoz' : undefined,
      tags: r.chance(0.12) ? [r.pick(['VIP', 'Shartnoma', 'Bola', 'Homilador'])] : [],
      stats: { orders: 0, totalSpent: 0 }, portal: { linked: r.chance(0.3) },
      createdAt: created, updatedAt: created,
    })
  }
  return out
}

/** Random-but-plausible value for a field. */
function genValue(r: ReturnType<typeof rng>, f: FieldDef, filled = true): unknown {
  if (!filled) return f.type === 'table' ? (f.presetRows.length ? f.presetRows.map((row) => ({ ...row })) : []) : null
  switch (f.type) {
    case 'text': return f.key === 'organism' ? r.pick(['E. coli', 'St. aureus', 'Klebsiella pneumoniae', 'Proteus mirabilis', 'Candida albicans']) : f.key === 'sample_type' ? r.pick(['Siydik', 'Qon', 'Najas', 'Tomoq surtmasi']) : f.key === 'titer' ? `10^${r.int(3, 6)} KOE/ml` : r.pick(['Me’yorda', 'Alohida ko‘rsatma yo‘q', 'Nazoratda'])
    case 'longtext': return r.chance(0.5) ? r.pick(['Qayta tahlil 30 kundan so‘ng tavsiya etiladi.', 'Vrach maslahati tavsiya etiladi.', 'Me’yor doirasida.', 'Parhez va suyuqlik iste’molini oshirish.']) : null
    case 'number': {
      const ref = f.references[0]
      const lo = ref?.min ?? 0, hi = ref?.max ?? 100
      const span = hi - lo || 10
      const v = r.chance(0.78) ? lo + r.next() * span : r.chance(0.5) ? hi + r.next() * span * 0.6 : Math.max(0, lo - r.next() * span * 0.4)
      return Number(v.toFixed(f.decimals ?? 1))
    }
    case 'select': return r.chance(0.8) && f.options[0] ? f.options[0].value : r.pick(f.options).value
    case 'multiselect': return r.shuffle(f.options).slice(0, r.int(1, 2)).map((o) => o.value)
    case 'boolean': return r.chance(0.7)
    case 'date': return daysAgo(-r.int(7, 90)).slice(0, 10)
    case 'table': {
      const rows = f.presetRows.length ? f.presetRows.map((row) => ({ ...row })) : Array.from({ length: r.int(1, 4) }, () => ({}))
      return rows.map((row) => {
        const o: Record<string, unknown> = { ...row }
        for (const c of f.columns) {
          if (o[c.key] == null || o[c.key] === '') o[c.key] = c.type === 'text' && c.key === 'tooth' ? String(r.int(11, 48)) : genValue(r, c)
          if (c.type === 'select' && f.key === 'parasites') o[c.key] = r.chance(0.9) ? 'none' : r.pick(['light', 'medium', 'heavy'])
          if (c.type === 'select' && f.key === 'antibiotics') o[c.key] = r.pick(['S', 'S', 'S', 'I', 'R'])
          if (c.type === 'text' && c.key === 'found') o[c.key] = r.pick(['10⁸', '10⁹', 'Bo‘lmadi', '10⁵', '3 %'])
        }
        return o
      })
    }
  }
}

/** base + hours, clamped to now */
const after = (base: string, hours: number) => new Date(Math.min(Date.now() - 60_000, new Date(base).getTime() + hours * 3600_000)).toISOString()

function buildDb(): MockDb {
  const r = rng(20260816)
  const patients = genPatients(r, 640, 'c1')
  const orders: Order[] = []
  const items: OrderItem[] = []
  const payments: Payment[] = []
  const documents: ResultDocument[] = []
  const outbox: OutboxMessage[] = []
  const regs = EMPLOYEES.filter((e) => e.roleId === 'r_reg')
  const labs = EMPLOYEES.filter((e) => e.roleId === 'r_lab')
  const docs = EMPLOYEES.filter((e) => e.roleId === 'r_doc')
  const active = SERVICE_TYPES.filter((s) => s.isActive)
  const seq: Record<string, number> = { b1: 0, b2: 0 }
  const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? ''

  const N = 1150
  for (let i = 0; i < N; i++) {
    const p = r.pick(patients)
    const branchId = r.chance(0.72) ? 'b1' : 'b2'
    const br = BRANCHES.find((b) => b.id === branchId)!
    seq[branchId] = (seq[branchId] ?? 0) + 1
    // skew towards recent days
    const daysBack = Math.floor(Math.pow(r.next(), 1.8) * 120)
    let createdAt = daysAgo(daysBack, r.int(8, 18))
    if (createdAt > new Date().toISOString()) createdAt = new Date(Date.now() - r.int(5, 300) * 60_000).toISOString()
    const reg = r.pick(regs.filter((e) => e.branchIds.includes(branchId)) .length ? regs.filter((e) => e.branchIds.includes(branchId)) : regs)
    const chosen = r.shuffle(active).slice(0, r.chance(0.6) ? 1 : r.int(2, 4))
    const orderId = uid('o')
    const subtotal = chosen.reduce((s, st) => s + (st.branchPrices[branchId] ?? st.price), 0)
    const disc = p.discountPercent
    const discountAmount = Math.round((subtotal * disc) / 100)
    const total = subtotal - discountAmount
    const isOld = daysBack > 2
    const paid = isOld ? r.chance(0.97) : r.chance(0.55)
    const progress: Record<ItemStatus, number> = { pending: 0, entered: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }

    for (const st of chosen) {
      const schema = SCHEMAS.find((s) => s.id === st.schemaId) ?? null
      let status: ItemStatus = 'pending'
      if (paid) {
        if (daysBack > 6) status = r.chance(0.94) ? 'approved' : r.chance(0.6) ? 'submitted' : 'entered'
        else if (daysBack > 1) status = r.pick(['approved', 'approved', 'submitted', 'entered', 'pending'])
        else status = r.pick(['pending', 'pending', 'entered', 'submitted'])
      }
      if (!schema) status = paid ? 'approved' : 'pending'
      const filled = status !== 'pending'
      const values: ValueMap = {}
      if (schema) for (const f of schema.fields) values[f.key] = genValue(r, f, filled) as ValueMap[string]
      const lab = r.pick(labs), doc = r.pick(docs)
      const itemId = uid('it')
      const price = st.branchPrices[branchId] ?? st.price
      const item: OrderItem = {
        id: itemId, orderId, companyId: 'c1', branchId, serviceTypeId: st.id, serviceName: st.name, categoryId: st.categoryId, categoryName: catName(st.categoryId),
        price, finalPrice: Math.round(price - (price * disc) / 100), status, schemaId: st.schemaId, schemaVersion: schema?.version, values,
        createdAt, updatedAt: createdAt,
        ...(filled ? { technicianId: lab.id, technicianName: lab.fullName, enteredAt: after(createdAt, r.int(1, 20)) } : {}),
        ...(status === 'submitted' || status === 'approved' ? { submittedAt: after(createdAt, r.int(21, 30)) } : {}),
        ...(status === 'approved' ? { doctorId: doc.id, doctorName: doc.fullName, approvedAt: after(createdAt, r.int(31, 60)) } : {}),
        ...(r.chance(0.2) && filled ? { labNote: 'Namuna sifati qoniqarli' } : {}),
      }
      if (status === 'approved') {
        const tpl = TEMPLATES.find((t) => t.serviceTypeIds.includes(st.id)) ?? TEMPLATES.find((t) => t.categoryIds.includes(st.categoryId))
        if (tpl) {
          const d: ResultDocument = {
            id: uid('doc'), companyId: 'c1', orderId, orderItemId: itemId, templateId: tpl.id, templateVersion: tpl.version, title: `${st.name} — natija`,
            status: 'final', createdAt: item.approvedAt!, updatedAt: item.approvedAt!,
            deliveries: [
              { channel: 'portal', status: 'delivered', at: item.approvedAt! },
              { channel: 'sms', status: r.chance(0.9) ? 'delivered' : 'sent', at: item.approvedAt! },
            ],
          }
          documents.push(d)
          item.documentId = d.id
          outbox.push({ id: uid('msg'), companyId: 'c1', branchId, patientId: p.id, orderId, channel: 'sms', kind: 'result_ready', to: p.phone, text: `${st.name} natijasi tayyor. ${COMPANIES[0]!.name}`, status: 'delivered', sentAt: item.approvedAt, attempts: 1, providerMessageId: String(r.int(10000, 99999)), createdAt: item.approvedAt!, updatedAt: item.approvedAt! })
        }
      }
      progress[status]++
      items.push(item)
    }
    const allApproved = progress.approved === chosen.length
    const order: Order = {
      id: orderId, companyId: 'c1', branchId, number: `${br.code}-${String(seq[branchId]).padStart(6, '0')}`, patientId: p.id, patientName: p.fullName, patientPhone: p.phone,
      createdByEmployeeId: reg.id, status: allApproved ? 'completed' : paid ? 'in_progress' : 'open', payment: paid ? 'paid' : 'unpaid',
      subtotal, discountPercent: disc, discountAmount, total, paidAmount: paid ? total : 0, itemCount: chosen.length, progress,
      createdAt, updatedAt: createdAt,
    }
    if (paid) {
      payments.push({ id: uid('pay'), orderId, companyId: 'c1', branchId, amount: total, method: r.pick(['cash', 'cash', 'card', 'transfer']), employeeId: reg.id, createdAt, updatedAt: createdAt })
      outbox.push({ id: uid('msg'), companyId: 'c1', branchId, patientId: p.id, orderId, channel: 'sms', kind: 'payment_receipt', to: p.phone, text: `Chek ${order.number}: ${total.toLocaleString('ru-RU')} so‘m qabul qilindi. Rahmat!`, status: 'delivered', sentAt: createdAt, attempts: 1, createdAt, updatedAt: createdAt })
    }
    p.stats.orders++
    p.stats.totalSpent += paid ? total : 0
    if (!p.stats.lastVisitAt || p.stats.lastVisitAt < createdAt) p.stats.lastVisitAt = createdAt
    orders.push(order)
  }
  BRANCHES[0]!.orderSeq = seq.b1 ?? 0
  BRANCHES[1]!.orderSeq = seq.b2 ?? 0

  // a few scheduled reminders + a failed one
  outbox.push({ id: uid('msg'), companyId: 'c1', channel: 'sms', kind: 'reminder', to: patients[3]!.phone, patientId: patients[3]!.id, text: 'Ertaga 09:00 da qabulga kelishingizni eslatamiz. Shifo Med', status: 'scheduled', scheduledAt: daysAgo(-1, 9), attempts: 0, createdAt: daysAgo(0), updatedAt: daysAgo(0) })
  outbox.push({ id: uid('msg'), companyId: 'c1', channel: 'sms', kind: 'result_ready', to: patients[7]!.phone, patientId: patients[7]!.id, text: 'Natija tayyor. Shifo Med', status: 'failed', attempts: 3, error: 'device_offline', createdAt: daysAgo(1), updatedAt: daysAgo(1) })

  const notifications: Notification[] = [
    { id: 'n1', title: 'Tasdiqlash kutilmoqda', body: `${items.filter((i) => i.status === 'submitted').length} ta natija vrach tasdig‘ini kutmoqda`, kind: 'warning', createdAt: daysAgo(0, 8), read: false, link: '/app/confirm' },
    { id: 'n2', title: 'SMS yuborilmadi', body: 'Bitta xabar 3 urinishdan so‘ng ham yetkazilmadi (device_offline)', kind: 'warning', createdAt: daysAgo(1), read: false, link: '/app/messages' },
    { id: 'n3', title: 'Yangi shablon faollashtirildi', body: 'Stomatologiya — karies xulosasi (v1)', kind: 'success', createdAt: daysAgo(3), read: true, link: '/admin/templates' },
  ]

  const credentials: Record<string, string> = {}
  for (const e of EMPLOYEES) credentials[e.login] = '123456'

  return {
    companies: structuredClone(COMPANIES), branches: BRANCHES, roles: structuredClone(ROLES), employees: structuredClone(EMPLOYEES),
    regions: REGIONS, districts: DISTRICTS, patients, categories: structuredClone(CATEGORIES), serviceTypes: structuredClone(SERVICE_TYPES),
    schemas: structuredClone(SCHEMAS), templates: structuredClone(TEMPLATES), assets: ASSETS, orders, items, payments, documents, outbox, notifications, credentials,
  }
}

let _db: MockDb | null = null
export const db = (): MockDb => (_db ??= buildDb())
export const resetDb = () => {
  _db = null
}
