import type { StaffRepository, TenantRepository, PatientRepository } from '../../repositories'
import type { Branch, Company, Employee, Patient, Role } from '@/domain'
import { db } from '../db'
import { clone, latency, matches, MockError, nowIso, paginate, sortBy, uid } from '../util'

const stamp = () => ({ createdAt: nowIso(), updatedAt: nowIso() })

export const tenantMock: TenantRepository = {
  async listCompanies(q) {
    await latency()
    const d = db()
    const items = d.companies
      .filter((c) => matches(c.name, q.search ?? '') || matches(c.legalName, q.search ?? ''))
      .map((c) => ({ ...c, branchCount: d.branches.filter((b) => b.companyId === c.id).length, employeeCount: d.employees.filter((e) => e.companyId === c.id).length }))
    return paginate(sortBy(items, q.sortBy ?? 'createdAt', q.sortDir), q)
  },
  async getCompany(id) {
    await latency()
    const c = db().companies.find((x) => x.id === id)
    if (!c) throw new MockError(404, 'not_found', 'Kompaniya topilmadi')
    return clone(c)
  },
  async saveCompany(input) {
    await latency(400)
    const d = db()
    if (input.id) {
      const i = d.companies.findIndex((x) => x.id === input.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Kompaniya topilmadi')
      d.companies[i] = { ...d.companies[i]!, ...input, updatedAt: nowIso() } as Company
      return clone(d.companies[i]!)
    }
    const c: Company = { id: uid('c'), name: '', slug: '', locale: 'uz', isActive: true, sms: { provider: 'none', defaultPriority: 'transactional' }, branchCount: 0, employeeCount: 0, ...stamp(), ...input } as Company
    d.companies.push(c)
    return clone(c)
  },
  async listBranches(companyId) {
    await latency(150)
    return clone(db().branches.filter((b) => b.companyId === companyId))
  },
  async saveBranch(input) {
    await latency(400)
    const d = db()
    if (input.id) {
      const i = d.branches.findIndex((x) => x.id === input.id)
      d.branches[i] = { ...d.branches[i]!, ...input, updatedAt: nowIso() } as Branch
      return clone(d.branches[i]!)
    }
    const b: Branch = { id: uid('b'), name: '', code: 'XX', timezone: 'Asia/Tashkent', isActive: true, orderSeq: 0, ...stamp(), ...input } as Branch
    d.branches.push(b)
    return clone(b)
  },
}

export const staffMock: StaffRepository = {
  async listEmployees(companyId, q) {
    await latency()
    const d = db()
    let items = d.employees.filter((e) => e.companyId === companyId)
    if (q.branchId) items = items.filter((e) => e.branchIds.includes(q.branchId!))
    if (q.roleId) items = items.filter((e) => e.roleId === q.roleId)
    if (q.status) items = items.filter((e) => e.status === q.status)
    if (q.search) items = items.filter((e) => matches(e.fullName, q.search!) || matches(e.login, q.search!) || matches(e.phone, q.search!))
    return paginate(sortBy(items, q.sortBy ?? 'fullName', q.sortDir ?? 'asc'), q)
  },
  async getEmployee(id) {
    await latency(150)
    const e = db().employees.find((x) => x.id === id)
    if (!e) throw new MockError(404, 'not_found', 'Xodim topilmadi')
    return clone(e)
  },
  async saveEmployee(input) {
    await latency(400)
    const d = db()
    const { password, ...rest } = input
    if (rest.id) {
      const i = d.employees.findIndex((x) => x.id === rest.id)
      if (i < 0) throw new MockError(404, 'not_found', 'Xodim topilmadi')
      d.employees[i] = { ...d.employees[i]!, ...rest, updatedAt: nowIso() } as Employee
      if (password) d.credentials[d.employees[i]!.login] = password
      return clone(d.employees[i]!)
    }
    if (d.employees.some((e) => e.login === rest.login)) throw new MockError(409, 'conflict', 'Bu login band')
    const e: Employee = { id: uid('e'), branchIds: [], fullName: '', login: '', roleId: '', overrides: { allow: [], deny: [] }, categoryIds: [], status: 'active', avatarHue: Math.floor(Math.random() * 360), ...stamp(), ...rest } as Employee
    d.employees.push(e)
    d.credentials[e.login] = password ?? '123456'
    return clone(e)
  },
  async setOverrides(id, overrides) {
    await latency(300)
    const e = db().employees.find((x) => x.id === id)
    if (!e) throw new MockError(404, 'not_found', 'Xodim topilmadi')
    e.overrides = overrides
    e.updatedAt = nowIso()
    return clone(e)
  },
  async listRoles(companyId) {
    await latency(150)
    return clone(db().roles.filter((r) => r.companyId === companyId || r.companyId === null))
  },
  async saveRole(input) {
    await latency(300)
    const d = db()
    if (input.id) {
      const i = d.roles.findIndex((x) => x.id === input.id)
      d.roles[i] = { ...d.roles[i]!, ...input } as Role
      return clone(d.roles[i]!)
    }
    const r: Role = { id: uid('r'), key: uid('role'), name: '', permissions: [], isSystem: false, ...input } as Role
    d.roles.push(r)
    return clone(r)
  },
  async deleteRole(id) {
    await latency(300)
    const d = db()
    if (d.employees.some((e) => e.roleId === id)) throw new MockError(409, 'in_use', 'Bu rol xodimlarga biriktirilgan')
    d.roles = d.roles.filter((r) => r.id !== id)
  },
}

const normPhone = (p: string) => {
  const digits = p.replace(/\D/g, '')
  return digits.length === 9 ? `998${digits}` : digits
}

export const patientMock: PatientRepository = {
  async list(companyId, q) {
    await latency()
    let items = db().patients.filter((p) => p.companyId === companyId)
    if (q.search) items = items.filter((p) => matches(p.fullName, q.search!) || p.phone.includes(q.search!.replace(/\D/g, '')) || matches(p.passportNumber, q.search!))
    if (q.tag) items = items.filter((p) => p.tags.includes(q.tag!))
    return paginate(sortBy(items, q.sortBy ?? 'createdAt', q.sortDir), q)
  },
  async get(id) {
    await latency(150)
    const p = db().patients.find((x) => x.id === id)
    if (!p) throw new MockError(404, 'not_found', 'Bemor topilmadi')
    return clone(p)
  },
  async search(companyId, query, limit = 12) {
    await latency(180)
    const digits = query.replace(/\D/g, '')
    return clone(
      db().patients
        .filter((p) => p.companyId === companyId && (matches(p.fullName, query) || (digits.length >= 3 && p.phone.includes(digits)) || matches(p.passportNumber, query)))
        .sort((a, b) => (b.stats.lastVisitAt ?? '').localeCompare(a.stats.lastVisitAt ?? ''))
        .slice(0, limit),
    )
  },
  async findDuplicates(companyId, input) {
    await latency(150)
    const phone = input.phone ? normPhone(input.phone) : ''
    return clone(
      db().patients.filter((p) => p.companyId === companyId && (
        (phone && p.phone === phone) ||
        (input.passportNumber && p.passportNumber && p.passportNumber.toUpperCase() === input.passportNumber.toUpperCase()) ||
        (input.pinfl && p.pinfl && p.pinfl === input.pinfl)
      )),
    )
  },
  async create(companyId, input) {
    await latency(400)
    const d = db()
    const phone = normPhone(input.phone)
    if (input.passportNumber && d.patients.some((p) => p.companyId === companyId && p.passportNumber?.toUpperCase() === input.passportNumber!.toUpperCase())) throw new MockError(409, 'duplicate_passport', 'Bu passport raqami bilan bemor mavjud')
    if (input.pinfl && d.patients.some((p) => p.companyId === companyId && p.pinfl === input.pinfl)) throw new MockError(409, 'duplicate_pinfl', 'Bu JSHSHIR bilan bemor mavjud')
    if (!input.passportNumber && !input.pinfl && d.patients.some((p) => p.companyId === companyId && p.phone === phone)) throw new MockError(409, 'duplicate_phone', 'Bu telefon raqami bilan bemor mavjud')
    const p: Patient = {
      id: uid('p'), companyId, ...input, phone, discountPercent: input.discountPercent ?? 0, tags: [], stats: { orders: 0, totalSpent: 0 }, portal: { linked: false }, ...stamp(),
    }
    d.patients.unshift(p)
    return clone(p)
  },
  async update(id, input) {
    await latency(350)
    const d = db()
    const i = d.patients.findIndex((x) => x.id === id)
    if (i < 0) throw new MockError(404, 'not_found', 'Bemor topilmadi')
    const cur = d.patients[i]!
    d.patients[i] = { ...cur, ...input, phone: input.phone ? normPhone(input.phone) : cur.phone, updatedAt: nowIso() }
    return clone(d.patients[i]!)
  },
  async regions() {
    await latency(80)
    return db().regions
  },
  async districts(regionId) {
    await latency(80)
    return db().districts.filter((x) => !regionId || x.regionId === regionId)
  },
}
