import type { OrderRepository, MessagingRepository, ReportRepository, PortalRepository } from '../../repositories'
import type { ItemStatus, Order, OrderItem, OutboxMessage, Payment, ResultDocument } from '@/domain'
import { db } from '../db'
import { clone, latency, matches, MockError, nowIso, paginate, sortBy, uid } from '../util'

const stamp = () => ({ createdAt: nowIso(), updatedAt: nowIso() })

function recompute(order: Order) {
  const d = db()
  const items = d.items.filter((i) => i.orderId === order.id && i.status !== 'cancelled')
  order.subtotal = items.reduce((s, i) => s + i.price, 0)
  order.discountAmount = Math.round((order.subtotal * order.discountPercent) / 100)
  order.total = order.subtotal - order.discountAmount
  order.itemCount = items.length
  const progress: Record<ItemStatus, number> = { pending: 0, entered: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }
  for (const i of d.items.filter((i) => i.orderId === order.id)) progress[i.status]++
  order.progress = progress
  order.paidAmount = d.payments.filter((p) => p.orderId === order.id && !p.refundedAt).reduce((s, p) => s + p.amount, 0)
  order.payment = order.paidAmount <= 0 ? 'unpaid' : order.paidAmount >= order.total ? 'paid' : 'partial'
  if (order.status !== 'cancelled') {
    order.status = items.length && items.every((i) => i.status === 'approved') ? 'completed' : order.payment === 'unpaid' ? 'open' : 'in_progress'
  }
  order.updatedAt = nowIso()
}

const bundle = (orderId: string) => {
  const d = db()
  const order = d.orders.find((o) => o.id === orderId)
  if (!order) throw new MockError(404, 'not_found', 'Chek topilmadi')
  return { order, items: d.items.filter((i) => i.orderId === orderId), payments: d.payments.filter((p) => p.orderId === orderId) }
}

const findItem = (id: string) => {
  const it = db().items.find((i) => i.id === id)
  if (!it) throw new MockError(404, 'not_found', 'Tahlil topilmadi')
  return it
}
const emp = (id: string) => db().employees.find((e) => e.id === id)

function pushSms(o: Order, kind: OutboxMessage['kind'], text: string) {
  db().outbox.unshift({ id: uid('msg'), companyId: o.companyId, branchId: o.branchId, patientId: o.patientId, orderId: o.id, channel: 'sms', kind, to: o.patientPhone, text, status: 'queued', attempts: 0, ...stamp() })
}

export const orderMock: OrderRepository = {
  async list(companyId, q) {
    await latency()
    let items = db().orders.filter((o) => o.companyId === companyId)
    if (q.branchId) items = items.filter((o) => o.branchId === q.branchId)
    if (q.status) items = items.filter((o) => o.status === q.status)
    if (q.payment) items = items.filter((o) => o.payment === q.payment)
    if (q.patientId) items = items.filter((o) => o.patientId === q.patientId)
    if (q.dateFrom) items = items.filter((o) => o.createdAt >= q.dateFrom!)
    if (q.dateTo) items = items.filter((o) => o.createdAt <= q.dateTo! + 'T23:59:59')
    if (q.search) items = items.filter((o) => matches(o.patientName, q.search!) || o.number.toLowerCase().includes(q.search!.toLowerCase()) || o.patientPhone.includes(q.search!.replace(/\D/g, '') || '§'))
    return paginate(sortBy(items, q.sortBy ?? 'createdAt', q.sortDir ?? 'desc'), q)
  },
  async get(id) {
    await latency(180)
    return clone(bundle(id))
  },
  async create(companyId, employeeId, input) {
    await latency(400)
    const d = db()
    const p = d.patients.find((x) => x.id === input.patientId)
    const br = d.branches.find((b) => b.id === input.branchId)
    if (!p || !br) throw new MockError(404, 'not_found', 'Bemor yoki filial topilmadi')
    br.orderSeq++
    const order: Order = {
      id: uid('o'), companyId, branchId: br.id, number: `${br.code}-${String(br.orderSeq).padStart(6, '0')}`, patientId: p.id, patientName: p.fullName, patientPhone: p.phone,
      createdByEmployeeId: employeeId, status: 'open', payment: 'unpaid', subtotal: 0, discountPercent: p.discountPercent, discountAmount: 0, total: 0, paidAmount: 0, itemCount: 0,
      progress: { pending: 0, entered: 0, submitted: 0, approved: 0, rejected: 0, cancelled: 0 }, note: input.note, ...stamp(),
    }
    d.orders.unshift(order)
    p.stats.orders++
    p.stats.lastVisitAt = order.createdAt
    await orderMock.addItems(order.id, input.serviceTypeIds)
    return clone({ order: bundle(order.id).order, items: bundle(order.id).items })
  },
  async addItems(orderId, serviceTypeIds) {
    const d = db()
    const { order } = bundle(orderId)
    if (order.status === 'cancelled' || order.status === 'completed') throw new MockError(409, 'closed', 'Chek yopilgan')
    for (const stId of serviceTypeIds) {
      const st = d.serviceTypes.find((s) => s.id === stId)
      if (!st) continue
      const cat = d.categories.find((c) => c.id === st.categoryId)
      const schema = d.schemas.find((s) => s.id === st.schemaId)
      const price = st.branchPrices[order.branchId] ?? st.price
      const values: OrderItem['values'] = {}
      if (schema) for (const f of schema.fields) values[f.key] = f.type === 'table' ? f.presetRows.map((r) => ({ ...r })) : null
      d.items.push({ id: uid('it'), orderId, companyId: order.companyId, branchId: order.branchId, serviceTypeId: st.id, serviceName: st.name, categoryId: st.categoryId, categoryName: cat?.name ?? '', price, finalPrice: Math.round(price - (price * order.discountPercent) / 100), status: 'pending', schemaId: st.schemaId, schemaVersion: schema?.version, values, ...stamp() })
    }
    recompute(order)
    const b = bundle(orderId)
    return clone({ order: b.order, items: b.items })
  },
  async removeItem(orderId, itemId) {
    await latency(250)
    const d = db()
    const { order } = bundle(orderId)
    const it = findItem(itemId)
    if (it.status !== 'pending') throw new MockError(409, 'in_progress', 'Laboratoriya boshlagan tahlilni o‘chirib bo‘lmaydi')
    if (order.payment !== 'unpaid') throw new MockError(409, 'paid', 'To‘langan chekdan xizmat o‘chirib bo‘lmaydi')
    d.items = d.items.filter((i) => i.id !== itemId)
    recompute(order)
    const b = bundle(orderId)
    return clone({ order: b.order, items: b.items })
  },
  async pay(employeeId, input) {
    await latency(500)
    const d = db()
    const { order } = bundle(input.orderId)
    if (order.itemCount === 0) throw new MockError(422, 'empty', 'Chekda xizmat yo‘q')
    if (order.payment === 'paid') throw new MockError(409, 'already_paid', 'Chek allaqachon to‘langan')
    const remaining = order.total - order.paidAmount
    if (input.amount <= 0 || input.amount > remaining) throw new MockError(422, 'amount', `Summa 1 – ${remaining} oralig‘ida bo‘lishi kerak`)
    d.payments.push({ id: uid('pay'), orderId: order.id, companyId: order.companyId, branchId: order.branchId, amount: input.amount, method: input.method, employeeId, ...stamp() })
    recompute(order)
    const p = d.patients.find((x) => x.id === order.patientId)
    if (p) p.stats.totalSpent += input.amount
    if (input.sendSms) pushSms(order, 'payment_receipt', `Chek ${order.number}: ${input.amount.toLocaleString('ru-RU')} so‘m qabul qilindi. Natijalar tayyor bo‘lganda xabar beramiz. ${d.companies[0]?.name}`)
    const b = bundle(order.id)
    return clone({ order: b.order, payments: b.payments })
  },
  async cancel(orderId, reason) {
    await latency(300)
    const { order } = bundle(orderId)
    if (order.payment !== 'unpaid') throw new MockError(409, 'paid', 'To‘langan chekni bekor qilish uchun avval qaytarish qiling')
    order.status = 'cancelled'
    order.note = reason
    for (const it of db().items.filter((i) => i.orderId === orderId)) it.status = 'cancelled'
    recompute(order)
    order.status = 'cancelled'
    return clone(order)
  },
  async worklist(companyId, q) {
    await latency()
    const d = db()
    const orders = new Map(d.orders.map((o) => [o.id, o]))
    const patients = new Map(d.patients.map((p) => [p.id, p]))
    let items = d.items.filter((i) => i.companyId === companyId && i.schemaId)
    if (q.branchId) items = items.filter((i) => i.branchId === q.branchId)
    if (q.categoryIds?.length) items = items.filter((i) => q.categoryIds!.includes(i.categoryId))
    if (q.status?.length) items = items.filter((i) => q.status!.includes(i.status))
    if (q.dateFrom) items = items.filter((i) => i.createdAt >= q.dateFrom!)
    if (q.dateTo) items = items.filter((i) => i.createdAt <= q.dateTo! + 'T23:59:59')
    // only paid orders reach the lab
    items = items.filter((i) => orders.get(i.orderId)?.payment !== 'unpaid')
    let rows = items.map((i) => {
      const o = orders.get(i.orderId)!
      const p = patients.get(o.patientId)
      return { ...i, orderNumber: o.number, patientName: o.patientName, patientPhone: o.patientPhone, patientGender: p?.gender, patientBirthDate: p?.birthDate }
    })
    if (q.search) rows = rows.filter((r) => matches(r.patientName, q.search!) || r.orderNumber.toLowerCase().includes(q.search!.toLowerCase()) || matches(r.serviceName, q.search!))
    return paginate(sortBy(rows, q.sortBy ?? 'createdAt', q.sortDir ?? 'desc'), q)
  },
  async getItem(itemId) {
    await latency(150)
    return clone(findItem(itemId))
  },
  async saveValues(itemId, employeeId, values, labNote) {
    await latency(350)
    const it = findItem(itemId)
    if (it.status === 'approved') throw new MockError(409, 'approved', 'Tasdiqlangan natijani o‘zgartirib bo‘lmaydi')
    const e = emp(employeeId)
    it.values = values
    it.labNote = labNote
    it.technicianId = employeeId
    it.technicianName = e?.fullName
    it.enteredAt = nowIso()
    if (it.status === 'pending' || it.status === 'rejected') it.status = 'entered'
    it.updatedAt = nowIso()
    recompute(bundle(it.orderId).order)
    return clone(it)
  },
  async submitItem(itemId) {
    await latency(300)
    const it = findItem(itemId)
    if (it.status !== 'entered' && it.status !== 'submitted') throw new MockError(409, 'state', 'Avval natijalarni saqlang')
    // required-field validation
    const schema = db().schemas.find((s) => s.id === it.schemaId)
    const missing = schema?.fields.filter((f) => f.required && (it.values[f.key] == null || it.values[f.key] === '' || (Array.isArray(it.values[f.key]) && (it.values[f.key] as unknown[]).length === 0))) ?? []
    if (missing.length) throw new MockError(422, 'required', `To‘ldirilmagan: ${missing.map((m) => m.label).join(', ')}`)
    it.status = it.status === 'submitted' ? 'entered' : 'submitted' // toggle like legacy "yuborish"
    it.submittedAt = it.status === 'submitted' ? nowIso() : undefined
    it.updatedAt = nowIso()
    recompute(bundle(it.orderId).order)
    return clone(it)
  },
  async approveItem(itemId, employeeId, templateId) {
    await latency(600)
    const d = db()
    const it = findItem(itemId)
    if (it.status !== 'submitted') throw new MockError(409, 'state', 'Faqat yuborilgan natijani tasdiqlash mumkin')
    const st = d.serviceTypes.find((s) => s.id === it.serviceTypeId)
    const tpl = d.templates.find((t) => t.id === (templateId ?? st?.defaultTemplateId)) ?? d.templates.find((t) => t.status === 'active' && (t.serviceTypeIds.includes(it.serviceTypeId) || t.categoryIds.includes(it.categoryId))) ?? d.templates.find((t) => t.status === 'active' && t.serviceTypeIds.length === 0)
    if (!tpl) throw new MockError(422, 'no_template', 'Bu xizmat uchun faol shablon yo‘q')
    const e = emp(employeeId)
    it.status = 'approved'
    it.doctorId = employeeId
    it.doctorName = e?.fullName
    it.approvedAt = nowIso()
    it.updatedAt = nowIso()
    const document: ResultDocument = { id: uid('doc'), companyId: it.companyId, orderId: it.orderId, orderItemId: it.id, templateId: tpl.id, templateVersion: tpl.version, title: `${it.serviceName} — natija`, status: 'final', deliveries: [{ channel: 'portal', status: 'delivered', at: nowIso() }, { channel: 'sms', status: 'queued', at: nowIso() }], ...stamp() }
    d.documents.push(document)
    it.documentId = document.id
    tpl.usage++
    const order = bundle(it.orderId).order
    recompute(order)
    pushSms(order, 'result_ready', `${it.serviceName} natijasi tayyor. Portalda ko‘rishingiz mumkin. ${d.companies[0]?.name}`)
    return clone({ item: it, document })
  },
  async rejectItem(itemId, _employeeId, reason) {
    await latency(300)
    const it = findItem(itemId)
    if (it.status !== 'submitted') throw new MockError(409, 'state', 'Faqat yuborilgan natijani qaytarish mumkin')
    it.status = 'rejected'
    it.rejectReason = reason
    it.submittedAt = undefined
    it.updatedAt = nowIso()
    recompute(bundle(it.orderId).order)
    return clone(it)
  },
  async listDocuments(q) {
    await latency(150)
    const d = db()
    let docs = d.documents
    if (q.orderId) docs = docs.filter((x) => x.orderId === q.orderId)
    if (q.patientId) {
      const oids = new Set(d.orders.filter((o) => o.patientId === q.patientId).map((o) => o.id))
      docs = docs.filter((x) => oids.has(x.orderId))
    }
    return clone(docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  },
  async getDocument(id) {
    await latency(150)
    const doc = db().documents.find((x) => x.id === id)
    if (!doc) throw new MockError(404, 'not_found', 'Hujjat topilmadi')
    return clone(doc)
  },
}

export const messagingMock: MessagingRepository = {
  async listOutbox(companyId, q) {
    await latency()
    let items = db().outbox.filter((m) => m.companyId === companyId)
    if (q.status) items = items.filter((m) => m.status === q.status)
    if (q.kind) items = items.filter((m) => m.kind === q.kind)
    if (q.search) items = items.filter((m) => m.to.includes(q.search!.replace(/\D/g, '') || '§') || matches(m.text, q.search!))
    return paginate(sortBy(items, 'createdAt', 'desc'), q)
  },
  async send(companyId, input) {
    await latency(500)
    const d = db()
    const out: OutboxMessage[] = input.to.map((to) => ({ id: uid('msg'), companyId, channel: 'sms', kind: input.kind, to, text: input.text, status: input.scheduledAt ? 'scheduled' : 'queued', scheduledAt: input.scheduledAt, attempts: 0, ...stamp() }))
    d.outbox.unshift(...out)
    // simulate provider progress
    setTimeout(() => out.forEach((m) => { if (m.status === 'queued') { m.status = 'sent'; m.sentAt = nowIso(); m.providerMessageId = String(Math.floor(Math.random() * 90000) + 10000) } }), 2500)
    setTimeout(() => out.forEach((m) => { if (m.status === 'sent') m.status = 'delivered' }), 6000)
    return clone(out)
  },
  async notifications() {
    await latency(100)
    return clone(db().notifications)
  },
  async markRead(id) {
    for (const n of db().notifications) if (!id || n.id === id) n.read = true
  },
}

export const reportMock: ReportRepository = {
  async dashboard(companyId, q) {
    await latency(350)
    const d = db()
    const inRange = (iso: string) => iso.slice(0, 10) >= q.dateFrom && iso.slice(0, 10) <= q.dateTo
    const orders = d.orders.filter((o) => o.companyId === companyId && (!q.branchId || o.branchId === q.branchId) && o.status !== 'cancelled')
    const today = new Date().toISOString().slice(0, 10)
    const todays = orders.filter((o) => o.createdAt.slice(0, 10) === today)
    const items = d.items.filter((i) => i.companyId === companyId && (!q.branchId || i.branchId === q.branchId))
    const trendMap = new Map<string, { orders: number; revenue: number }>()
    for (let dt = new Date(q.dateFrom); dt.toISOString().slice(0, 10) <= q.dateTo; dt.setDate(dt.getDate() + 1)) trendMap.set(dt.toISOString().slice(0, 10), { orders: 0, revenue: 0 })
    for (const o of orders) if (inRange(o.createdAt)) { const t = trendMap.get(o.createdAt.slice(0, 10)); if (t) { t.orders++; t.revenue += o.paidAmount } }
    const cats = new Map<string, { name: string; count: number; revenue: number; color?: string }>()
    for (const i of items) if (inRange(i.createdAt)) {
      const top = topCategory(i.categoryId)
      const c = cats.get(top.id) ?? { name: top.name, count: 0, revenue: 0, color: top.color }
      c.count++; c.revenue += i.finalPrice; cats.set(top.id, c)
    }
    return {
      todayOrders: todays.length, todayRevenue: todays.reduce((s, o) => s + o.paidAmount, 0),
      pendingLab: items.filter((i) => i.status === 'pending' || i.status === 'entered').length,
      pendingApproval: items.filter((i) => i.status === 'submitted').length,
      patients: d.patients.filter((p) => p.companyId === companyId).length,
      smsQueued: d.outbox.filter((m) => m.companyId === companyId && (m.status === 'queued' || m.status === 'scheduled')).length,
      trend: [...trendMap.entries()].map(([date, v]) => ({ date, ...v })),
      byCategory: [...cats.values()].sort((a, b) => b.revenue - a.revenue),
    }
    function topCategory(id: string) {
      let c = d.categories.find((x) => x.id === id)
      while (c?.parentId) { const p = d.categories.find((x) => x.id === c!.parentId); if (!p || !p.parentId) return c; c = p }
      return c ?? { id, name: '—', color: undefined }
    }
  },
  async breakdown(companyId, q) {
    await latency(300)
    const d = db()
    const inRange = (iso: string) => iso.slice(0, 10) >= q.dateFrom && iso.slice(0, 10) <= q.dateTo
    const items = d.items.filter((i) => i.companyId === companyId && inRange(i.createdAt) && (!q.branchId || i.branchId === q.branchId) && i.status !== 'cancelled')
    const key = (i: OrderItem) =>
      q.by === 'category' ? i.categoryName : q.by === 'service' ? i.serviceName : q.by === 'branch' ? (d.branches.find((b) => b.id === i.branchId)?.name ?? '') : (i.technicianName ?? '—')
    const m = new Map<string, { name: string; count: number; revenue: number }>()
    for (const i of items) { const k = key(i); const c = m.get(k) ?? { name: k, count: 0, revenue: 0 }; c.count++; c.revenue += i.finalPrice; m.set(k, c) }
    return [...m.values()].sort((a, b) => b.revenue - a.revenue)
  },
}

export const portalMock: PortalRepository = {
  async overview(patientId) {
    await latency(300)
    const d = db()
    const patient = d.patients.find((p) => p.id === patientId)
    if (!patient) throw new MockError(404, 'not_found', 'Bemor topilmadi')
    const orders = d.orders.filter((o) => o.patientId === patientId && o.status !== 'cancelled').sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const oids = new Set(orders.map((o) => o.id))
    const documents = d.documents.filter((x) => oids.has(x.orderId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const companies = [...new Set(orders.map((o) => o.companyId))].map((id) => ({ id, name: d.companies.find((c) => c.id === id)?.name ?? '' }))
    return clone({ patient, orders, documents, companies })
  },
  async order(patientId, orderId) {
    await latency(250)
    const b = bundle(orderId)
    if (b.order.patientId !== patientId) throw new MockError(403, 'forbidden', 'Ruxsat yo‘q')
    return clone({ order: b.order, items: b.items, documents: db().documents.filter((x) => x.orderId === orderId) })
  },
  async document(patientId, documentId) {
    await latency(300)
    const d = db()
    const document = d.documents.find((x) => x.id === documentId)
    if (!document) throw new MockError(404, 'not_found', 'Hujjat topilmadi')
    const order = d.orders.find((o) => o.id === document.orderId)!
    if (order.patientId !== patientId) throw new MockError(403, 'forbidden', 'Ruxsat yo‘q')
    const template = d.templates.find((t) => t.id === document.templateId)!
    const item = d.items.find((i) => i.id === document.orderItemId)
    return clone({ document, template, item, order })
  },
}

export type { Payment }
