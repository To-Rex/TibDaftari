import type { Branch, Company, Employee, Region, District, Role } from '@/domain'
import { PERMISSIONS } from '@/domain'
import { daysAgo } from '../util'

const stamp = (d = 300) => ({ createdAt: daysAgo(d), updatedAt: daysAgo(2) })

export const COMPANIES: Company[] = [
  {
    id: 'c1', name: 'Shifo Med', legalName: '"SHIFO MED SERVIS" MChJ', slug: 'shifomed', phone: '+998 62 228-82-81',
    email: 'info@shifomed.uz', address: 'Urganch sh., A. Bahodirxon ko‘chasi, 177', locale: 'uz', isActive: true,
    sms: { provider: 'xabarchi', apiKeyMasked: 'xab_live_••••••••7f2a', defaultPriority: 'transactional', senderNote: 'Shifo Med' },
    branchCount: 2, employeeCount: 9, ...stamp(400),
  },
  {
    id: 'c2', name: 'Nur Klinika', legalName: '"NUR KLINIKA" MChJ', slug: 'nurklinika', phone: '+998 71 200-11-22',
    address: 'Toshkent sh., Yunusobod tumani', locale: 'uz', isActive: true,
    sms: { provider: 'none', defaultPriority: 'transactional' }, branchCount: 1, employeeCount: 3, ...stamp(90),
  },
]

export const BRANCHES: Branch[] = [
  { id: 'b1', companyId: 'c1', name: 'Markaziy filial', code: 'UR', address: 'Urganch sh., A. Bahodirxon 177', phone: '+998 62 228-82-81', timezone: 'Asia/Tashkent', isActive: true, orderSeq: 1240, ...stamp(400) },
  { id: 'b2', companyId: 'c1', name: 'Xiva filiali', code: 'XV', address: 'Xiva sh., Ichan-Qal’a yaqinida', phone: '+998 62 375-10-10', timezone: 'Asia/Tashkent', isActive: true, orderSeq: 412, ...stamp(200) },
  { id: 'b3', companyId: 'c2', name: 'Yunusobod', code: 'YU', address: 'Toshkent sh.', timezone: 'Asia/Tashkent', isActive: true, orderSeq: 88, ...stamp(90) },
]

const P = (...keys: string[]) => keys as unknown as Role['permissions']

export const ROLES: Role[] = [
  { id: 'r_super', companyId: null, key: 'superadmin', name: 'Superadmin', permissions: [...PERMISSIONS], isSystem: true, description: 'Platforma egasi — hamma narsa' },
  { id: 'r_admin', companyId: 'c1', key: 'admin', name: 'Administrator', isSystem: true, description: 'Kompaniya administratori', permissions: PERMISSIONS.filter((p) => !p.startsWith('platform.')) },
  { id: 'r_reg', companyId: 'c1', key: 'registrator', name: 'Registrator / Kassir', isSystem: false, description: 'Qabul, chek, to‘lov', permissions: P('reception.patient.read', 'reception.patient.write', 'reception.order.create', 'reception.order.cancel', 'reception.payment.create', 'reports.operations.read', 'messaging.send') },
  { id: 'r_lab', companyId: 'c1', key: 'laborant', name: 'Laborant', isSystem: false, description: 'Natijalarni kiritish', permissions: P('lab.worklist.read', 'lab.result.write', 'lab.result.submit') },
  { id: 'r_doc', companyId: 'c1', key: 'vrach', name: 'Vrach', isSystem: false, description: 'Natijalarni tasdiqlash', permissions: P('lab.worklist.read', 'lab.result.write', 'confirm.result.read', 'confirm.result.approve', 'confirm.result.resend', 'reception.patient.read') },
  { id: 'r_head', companyId: 'c1', key: 'rahbar', name: 'Rahbar', isSystem: false, description: 'Hisobotlar', permissions: P('reports.finance.read', 'reports.operations.read', 'reports.export', 'reception.patient.read', 'admin.employee.read') },
]

const emp = (id: string, fullName: string, login: string, roleId: string, branchIds: string[], hue: number, extra: Partial<Employee> = {}): Employee => ({
  id, companyId: 'c1', branchIds, fullName, login, roleId, overrides: { allow: [], deny: [] }, categoryIds: [], status: 'active', avatarHue: hue,
  phone: '+998 9' + String(hue).padStart(2, '0') + ' 000-00-00', lastLoginAt: daysAgo(0, 8), ...stamp(300), ...extra,
})

export const EMPLOYEES: Employee[] = [
  emp('e_super', 'Jasur Vapayev', 'super', 'r_super', ['b1', 'b2'], 160, { email: 'jasur@clinic.uz' }),
  emp('e_admin', 'Nasiba Matmuratova', 'admin', 'r_admin', ['b1', 'b2'], 210, { email: 'admin@shifomed.uz' }),
  emp('e_reg1', 'Umida Qodirova', 'umida', 'r_reg', ['b1'], 20),
  emp('e_reg2', 'Sevara Ismailova', 'sevara', 'r_reg', ['b2'], 300),
  emp('e_lab1', 'Muhammad Isaqov', 'muhammad', 'r_lab', ['b1'], 120, { categoryIds: ['cat_vir', 'cat_bio'] }),
  emp('e_lab2', 'Dilnoza Rahimova', 'dilnoza', 'r_lab', ['b1', 'b2'], 260, { categoryIds: ['cat_paraz', 'cat_bak'] }),
  emp('e_doc1', 'Ahmed Jumaniyazov', 'ahmed', 'r_doc', ['b1', 'b2'], 40, { overrides: { allow: ['reports.operations.read'], deny: [] } }),
  emp('e_doc2', 'Nodir Salayev', 'nodir', 'r_doc', ['b1'], 90, { categoryIds: ['cat_paraz'], overrides: { allow: [], deny: ['confirm.result.resend'] } }),
  emp('e_head', 'Bahrom Karimov', 'bahrom', 'r_head', ['b1', 'b2'], 330, { status: 'inactive', lastLoginAt: daysAgo(40) }),
]

export const REGIONS: Region[] = [
  { id: 'rg12', name: 'Xorazm viloyati' }, { id: 'rg14', name: 'Toshkent shahri' }, { id: 'rg13', name: 'Toshkent viloyati' },
  { id: 'rg3', name: 'Buxoro viloyati' }, { id: 'rg8', name: 'Samarqand viloyati' }, { id: 'rg15', name: 'Qoraqalpog‘iston Respublikasi' },
]
export const DISTRICTS: District[] = [
  { id: 'd1', regionId: 'rg12', name: 'Urganch shahri' }, { id: 'd2', regionId: 'rg12', name: 'Xiva tumani' }, { id: 'd3', regionId: 'rg12', name: 'Xonqa tumani' },
  { id: 'd4', regionId: 'rg12', name: 'Shovot tumani' }, { id: 'd5', regionId: 'rg12', name: 'Gurlan tumani' }, { id: 'd6', regionId: 'rg12', name: 'Bog‘ot tumani' },
  { id: 'd7', regionId: 'rg14', name: 'Yunusobod tumani' }, { id: 'd8', regionId: 'rg14', name: 'Chilonzor tumani' }, { id: 'd9', regionId: 'rg3', name: 'Buxoro shahri' },
  { id: 'd10', regionId: 'rg8', name: 'Samarqand shahri' }, { id: 'd11', regionId: 'rg15', name: 'Nukus shahri' },
]
