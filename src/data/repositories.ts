/**
 * Repository contracts. Pages/features depend ONLY on these interfaces.
 * `mock/` implements them in-memory today; `http/` will call FastAPI later.
 */
import type {
  AttributeSchema,
  Branch,
  Category,
  Company,
  DashboardSummary,
  District,
  Employee,
  Id,
  Notification,
  Order,
  OrderItem,
  OutboxMessage,
  Page,
  PageQuery,
  Patient,
  PatientOtpRequestInput,
  PatientOtpVerifyInput,
  PatientSession,
  PatientUpsertInput,
  Payment,
  PayOrderInput,
  CreateOrderInput,
  Region,
  ResultDocument,
  ResultTemplate,
  Role,
  ServiceType,
  StaffLoginInput,
  StaffSession,
  TemplateAsset,
  ValueMap,
  ItemStatus,
  PermissionOverrides,
} from '@/domain'

export interface AuthRepository {
  staffLogin(input: StaffLoginInput): Promise<StaffSession>
  staffMe(token: string): Promise<StaffSession>
  requestPatientOtp(input: PatientOtpRequestInput): Promise<{ challengeId: string; devCode?: string }>
  verifyPatientOtp(input: PatientOtpVerifyInput): Promise<PatientSession>
  patientMe(token: string): Promise<PatientSession>
  logout(token: string): Promise<void>
}

export interface TenantRepository {
  listCompanies(q: PageQuery): Promise<Page<Company>>
  getCompany(id: Id): Promise<Company>
  saveCompany(input: Partial<Company> & { id?: Id }): Promise<Company>
  listBranches(companyId: Id): Promise<Branch[]>
  saveBranch(input: Partial<Branch> & { companyId: Id; id?: Id }): Promise<Branch>
}

export interface StaffRepository {
  listEmployees(companyId: Id, q: PageQuery & { branchId?: Id; roleId?: Id; status?: string }): Promise<Page<Employee>>
  getEmployee(id: Id): Promise<Employee>
  saveEmployee(input: Partial<Employee> & { companyId: Id; id?: Id; password?: string }): Promise<Employee>
  setOverrides(id: Id, overrides: PermissionOverrides): Promise<Employee>
  listRoles(companyId: Id): Promise<Role[]>
  saveRole(input: Partial<Role> & { companyId: Id; id?: Id }): Promise<Role>
  deleteRole(id: Id): Promise<void>
}

export interface PatientRepository {
  list(companyId: Id, q: PageQuery & { tag?: string }): Promise<Page<Patient>>
  get(id: Id): Promise<Patient>
  search(companyId: Id, query: string, limit?: number): Promise<Patient[]>
  create(companyId: Id, input: PatientUpsertInput): Promise<Patient>
  update(id: Id, input: Partial<PatientUpsertInput>): Promise<Patient>
  findDuplicates(companyId: Id, input: Partial<PatientUpsertInput>): Promise<Patient[]>
  regions(): Promise<Region[]>
  districts(regionId?: Id): Promise<District[]>
}

export interface CatalogRepository {
  listCategories(companyId: Id): Promise<Category[]>
  saveCategory(input: Partial<Category> & { companyId: Id; id?: Id }): Promise<Category>
  deleteCategory(id: Id): Promise<void>
  listServiceTypes(companyId: Id, q?: { categoryId?: Id; search?: string; activeOnly?: boolean }): Promise<ServiceType[]>
  getServiceType(id: Id): Promise<ServiceType>
  saveServiceType(input: Partial<ServiceType> & { companyId: Id; id?: Id }): Promise<ServiceType>
  deleteServiceType(id: Id): Promise<void>
  listSchemas(companyId: Id): Promise<AttributeSchema[]>
  getSchema(id: Id): Promise<AttributeSchema>
  saveSchema(input: Partial<AttributeSchema> & { companyId: Id; id?: Id }): Promise<AttributeSchema>
  publishSchema(id: Id): Promise<AttributeSchema>
}

export interface OrderRepository {
  list(companyId: Id, q: PageQuery & { branchId?: Id; status?: string; payment?: string; dateFrom?: string; dateTo?: string; patientId?: Id }): Promise<Page<Order>>
  get(id: Id): Promise<{ order: Order; items: OrderItem[]; payments: Payment[] }>
  create(companyId: Id, employeeId: Id, input: CreateOrderInput): Promise<{ order: Order; items: OrderItem[] }>
  addItems(orderId: Id, serviceTypeIds: Id[]): Promise<{ order: Order; items: OrderItem[] }>
  removeItem(orderId: Id, itemId: Id): Promise<{ order: Order; items: OrderItem[] }>
  pay(employeeId: Id, input: PayOrderInput): Promise<{ order: Order; payments: Payment[] }>
  cancel(orderId: Id, reason: string): Promise<Order>
  /** Lab worklist: items filtered by category/status/date */
  worklist(companyId: Id, q: PageQuery & { branchId?: Id; categoryIds?: Id[]; status?: ItemStatus[]; dateFrom?: string; dateTo?: string }): Promise<Page<OrderItem & { orderNumber: string; patientName: string; patientPhone: string; patientGender?: 'male' | 'female'; patientBirthDate?: string }>>
  getItem(itemId: Id): Promise<OrderItem>
  saveValues(itemId: Id, employeeId: Id, values: ValueMap, labNote?: string): Promise<OrderItem>
  submitItem(itemId: Id, employeeId: Id): Promise<OrderItem>
  approveItem(itemId: Id, employeeId: Id, templateId?: Id): Promise<{ item: OrderItem; document: ResultDocument }>
  rejectItem(itemId: Id, employeeId: Id, reason: string): Promise<OrderItem>
  listDocuments(q: { orderId?: Id; patientId?: Id }): Promise<ResultDocument[]>
  getDocument(id: Id): Promise<ResultDocument>
}

export interface TemplateRepository {
  list(companyId: Id, q?: { status?: string; serviceTypeId?: Id; search?: string }): Promise<ResultTemplate[]>
  get(id: Id): Promise<ResultTemplate>
  save(input: Partial<ResultTemplate> & { companyId: Id; id?: Id }): Promise<ResultTemplate>
  setStatus(id: Id, status: ResultTemplate['status']): Promise<ResultTemplate>
  duplicate(id: Id): Promise<ResultTemplate>
  delete(id: Id): Promise<void>
  listAssets(companyId: Id): Promise<TemplateAsset[]>
  uploadAsset(companyId: Id, asset: Omit<TemplateAsset, 'id' | 'companyId'>): Promise<TemplateAsset>
}

export interface MessagingRepository {
  listOutbox(companyId: Id, q: PageQuery & { status?: string; kind?: string }): Promise<Page<OutboxMessage>>
  send(companyId: Id, input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string }): Promise<OutboxMessage[]>
  notifications(): Promise<Notification[]>
  markRead(id?: Id): Promise<void>
}

export interface ReportRepository {
  dashboard(companyId: Id, q: { branchId?: Id; dateFrom: string; dateTo: string }): Promise<DashboardSummary>
  breakdown(companyId: Id, q: { by: 'category' | 'service' | 'branch' | 'employee'; dateFrom: string; dateTo: string; branchId?: Id }): Promise<{ name: string; count: number; revenue: number }[]>
}

/** Patient portal — scoped by patient token; separate surface on purpose. */
export interface PortalRepository {
  overview(patientId: Id): Promise<{ patient: Patient; orders: Order[]; documents: ResultDocument[]; companies: { id: Id; name: string }[] }>
  order(patientId: Id, orderId: Id): Promise<{ order: Order; items: OrderItem[]; documents: ResultDocument[] }>
  document(patientId: Id, documentId: Id): Promise<{ document: ResultDocument; template: ResultTemplate; item?: OrderItem; order: Order }>
}

export interface Repositories {
  auth: AuthRepository
  tenant: TenantRepository
  staff: StaffRepository
  patients: PatientRepository
  catalog: CatalogRepository
  orders: OrderRepository
  templates: TemplateRepository
  messaging: MessagingRepository
  reports: ReportRepository
  portal: PortalRepository
}
