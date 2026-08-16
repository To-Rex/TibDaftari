import type { CatalogRepository, TemplateRepository } from '../../repositories'
import type { AttributeSchema, Category, ResultTemplate, ServiceType, TemplateAsset } from '@/domain'
import { emptyDoc } from '@/domain'
import { db } from '../db'
import { clone, latency, matches, MockError, nowIso, uid } from '../util'

const stamp = () => ({ createdAt: nowIso(), updatedAt: nowIso() })

export const catalogMock: CatalogRepository = {
  async listCategories(companyId) {
    await latency(150)
    return clone(db().categories.filter((c) => c.companyId === companyId).sort((a, b) => a.order - b.order))
  },
  async saveCategory(input) {
    await latency(300)
    const d = db()
    if (input.id) {
      const i = d.categories.findIndex((x) => x.id === input.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Kategoriya topilmadi')
      d.categories[i] = { ...d.categories[i]!, ...input, updatedAt: nowIso() } as Category
      return clone(d.categories[i]!)
    }
    const siblings = d.categories.filter((c) => c.parentId === (input.parentId ?? null))
    const c: Category = { id: uid('cat'), parentId: null, name: '', order: siblings.length + 1, isActive: true, workflow: 'lab', ...stamp(), ...input } as Category
    d.categories.push(c)
    return clone(c)
  },
  async deleteCategory(id) {
    await latency(300)
    const d = db()
    if (d.categories.some((c) => c.parentId === id)) throw new MockError(409, 'has_children', 'Avval ichki kategoriyalarni o‘chiring')
    if (d.serviceTypes.some((s) => s.categoryId === id)) throw new MockError(409, 'in_use', 'Kategoriyada xizmatlar bor')
    d.categories = d.categories.filter((c) => c.id !== id)
  },
  async listServiceTypes(companyId, q = {}) {
    await latency(180)
    const d = db()
    let items = d.serviceTypes.filter((s) => s.companyId === companyId)
    if (q.categoryId) {
      // include descendants
      const ids = new Set<string>([q.categoryId])
      let grew = true
      while (grew) {
        grew = false
        for (const c of d.categories) if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) { ids.add(c.id); grew = true }
      }
      items = items.filter((s) => ids.has(s.categoryId))
    }
    if (q.activeOnly) items = items.filter((s) => s.isActive)
    if (q.search) items = items.filter((s) => matches(s.name, q.search!) || matches(s.code, q.search!))
    const ordered30d = (id: string) => d.items.filter((i) => i.serviceTypeId === id).length
    return clone(items.sort((a, b) => a.order - b.order).map((s) => ({ ...s, stats: { ordered30d: ordered30d(s.id) } })))
  },
  async getServiceType(id) {
    await latency(120)
    const s = db().serviceTypes.find((x) => x.id === id)
    if (!s) throw new MockError(404, 'not_found', 'Xizmat topilmadi')
    return clone(s)
  },
  async saveServiceType(input) {
    await latency(350)
    const d = db()
    if (input.id) {
      const i = d.serviceTypes.findIndex((x) => x.id === input.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Xizmat topilmadi')
      d.serviceTypes[i] = { ...d.serviceTypes[i]!, ...input, updatedAt: nowIso() } as ServiceType
      return clone(d.serviceTypes[i]!)
    }
    const s: ServiceType = { id: uid('st'), categoryId: '', name: '', price: 0, branchPrices: {}, turnaroundDays: 1, order: 99, isActive: true, schemaId: null, documentScope: 'item', defaultTemplateId: null, ...stamp(), ...input } as ServiceType
    d.serviceTypes.push(s)
    return clone(s)
  },
  async deleteServiceType(id) {
    await latency(300)
    const d = db()
    if (d.items.some((i) => i.serviceTypeId === id)) throw new MockError(409, 'in_use', 'Bu xizmat bo‘yicha buyurtmalar bor — o‘chirish o‘rniga nofaol qiling')
    d.serviceTypes = d.serviceTypes.filter((s) => s.id !== id)
  },
  async listSchemas(companyId) {
    await latency(150)
    const d = db()
    return clone(d.schemas.filter((s) => s.companyId === companyId).map((s) => ({ ...s, usedBy: d.serviceTypes.filter((st) => st.schemaId === s.id).length })))
  },
  async getSchema(id) {
    await latency(120)
    const s = db().schemas.find((x) => x.id === id)
    if (!s) throw new MockError(404, 'not_found', 'Sxema topilmadi')
    return clone(s)
  },
  async saveSchema(input) {
    await latency(400)
    const d = db()
    if (input.id) {
      const i = d.schemas.findIndex((x) => x.id === input.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Sxema topilmadi')
      const cur = d.schemas[i]!
      // editing a published schema bumps version and returns to draft-like state (published stays for old items)
      const next: AttributeSchema = { ...cur, ...input, version: cur.status === 'published' && input.fields ? cur.version + 1 : cur.version, updatedAt: nowIso() } as AttributeSchema
      d.schemas[i] = next
      return clone(next)
    }
    const s: AttributeSchema = { id: uid('sch'), name: '', version: 1, status: 'draft', fields: [], usedBy: 0, ...stamp(), ...input } as AttributeSchema
    d.schemas.push(s)
    return clone(s)
  },
  async publishSchema(id) {
    await latency(300)
    const s = db().schemas.find((x) => x.id === id)
    if (!s) throw new MockError(404, 'not_found', 'Sxema topilmadi')
    if (!s.fields.length) throw new MockError(422, 'empty', 'Kamida bitta maydon kerak')
    s.status = 'published'
    s.updatedAt = nowIso()
    return clone(s)
  },
}

export const templateMock: TemplateRepository = {
  async list(companyId, q = {}) {
    await latency(180)
    let items = db().templates.filter((t) => t.companyId === companyId)
    if (q.status) items = items.filter((t) => t.status === q.status)
    if (q.serviceTypeId) items = items.filter((t) => t.serviceTypeIds.includes(q.serviceTypeId!) || t.serviceTypeIds.length === 0)
    if (q.search) items = items.filter((t) => matches(t.name, q.search!))
    return clone(items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  },
  async get(id) {
    await latency(150)
    const t = db().templates.find((x) => x.id === id)
    if (!t) throw new MockError(404, 'not_found', 'Shablon topilmadi')
    return clone(t)
  },
  async save(input) {
    await latency(450)
    const d = db()
    if (input.id) {
      const i = d.templates.findIndex((x) => x.id === input.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Shablon topilmadi')
      const cur = d.templates[i]!
      d.templates[i] = { ...cur, ...input, version: input.doc && cur.status === 'active' ? cur.version + 1 : cur.version, updatedAt: nowIso() } as ResultTemplate
      return clone(d.templates[i]!)
    }
    const t: ResultTemplate = { id: uid('tpl'), name: 'Yangi shablon', status: 'draft', version: 1, serviceTypeIds: [], categoryIds: [], scope: 'item', language: 'uz', doc: emptyDoc(), usage: 0, ...stamp(), ...input } as ResultTemplate
    d.templates.unshift(t)
    return clone(t)
  },
  async setStatus(id, status) {
    await latency(300)
    const t = db().templates.find((x) => x.id === id)
    if (!t) throw new MockError(404, 'not_found', 'Shablon topilmadi')
    if (status === 'active' && !t.doc.elements.length) throw new MockError(422, 'empty', 'Bo‘sh shablonni faollashtirib bo‘lmaydi')
    t.status = status
    t.updatedAt = nowIso()
    return clone(t)
  },
  async duplicate(id) {
    await latency(300)
    const d = db()
    const t = d.templates.find((x) => x.id === id)
    if (!t) throw new MockError(404, 'not_found', 'Shablon topilmadi')
    const copy: ResultTemplate = { ...clone(t), id: uid('tpl'), name: `${t.name} (nusxa)`, status: 'draft', version: 1, usage: 0, ...stamp() }
    d.templates.unshift(copy)
    return clone(copy)
  },
  async delete(id) {
    await latency(300)
    const d = db()
    const t = d.templates.find((x) => x.id === id)
    if (t?.status === 'active') throw new MockError(409, 'active', 'Faol shablonni o‘chirib bo‘lmaydi — avval arxivlang')
    d.templates = d.templates.filter((x) => x.id !== id)
  },
  async listAssets(companyId) {
    await latency(120)
    return clone(db().assets.filter((a) => a.companyId === companyId))
  },
  async uploadAsset(companyId, asset) {
    await latency(500)
    const a: TemplateAsset = { id: uid('as'), companyId, ...asset }
    db().assets.push(a)
    return clone(a)
  },
}
