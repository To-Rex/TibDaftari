/**
 * Repository contracts. Pages/features depend ONLY on these interfaces.
 * `http/` implements them against the TibDaftari FastAPI backend.
 */
import type {
  AttributeSchema,
  Branch,
  BranchSmsTemplates,
  Category,
  Company,
  DashboardSummary,
  Country,
  District,
  Employee,
  Id,
  MessageStatus,
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
  ResultSms,
  ResultTemplate,
  Role,
  ServiceType,
  SmsTemplateOverrides,
  SmsTestResult,
  ResetPreview,
  ResetResult,
  ResetTarget,
  StaffLoginInput,
  StaffSession,
  TemplateAsset,
  ValueMap,
  ItemStatus,
  PermissionOverrides,
  PatientReport,
  ResultListStatus,
  ResultRow,
  ResultsReport,
  ServicesReport,
} from '@/domain'

export type WorklistCounts = Record<'all' | ItemStatus, number>

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
  /** Sends ONE real SMS through the company's Xabarchi account (default recipient: company phone). */
  testSms(companyId: Id, to?: string): Promise<SmsTestResult>
  /** A branch's SMS texts (its own, or the company's while it has none). */
  getBranchSmsTemplates(branchId: Id): Promise<BranchSmsTemplates>
  /** Save the branch's own SMS texts; `applyToAll` (superadmin / company admin) writes them to every branch. */
  saveBranchSmsTemplates(branchId: Id, input: { templates: SmsTemplateOverrides; applyToAll?: boolean }): Promise<BranchSmsTemplates>
  /** Superadmin: what a reset of the company / branch would remove (nothing changes). */
  resetPreview(target: ResetTarget, id: Id): Promise<ResetPreview>
  /** Superadmin: IRREVERSIBLY reset the chosen parts; `confirm` = company slug / branch code. */
  reset(target: ResetTarget, id: Id, input: { parts: string[]; confirm: string }): Promise<ResetResult>
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
  /** `branchId` keeps every read inside one branch (list membership, visit statistics); the API also confines pinned employees itself. */
  list(companyId: Id, q: PageQuery & { tag?: string; branchId?: Id }): Promise<Page<Patient>>
  get(id: Id, q?: { branchId?: Id }): Promise<Patient>
  search(companyId: Id, query: string, limit?: number, branchId?: Id): Promise<Patient[]>
  create(companyId: Id, input: PatientUpsertInput): Promise<Patient>
  update(id: Id, input: Partial<PatientUpsertInput>): Promise<Patient>
  findDuplicates(companyId: Id, input: Partial<PatientUpsertInput>): Promise<Patient[]>
  countries(): Promise<Country[]>
  /** Regions of a country; without `countryId` the API returns the platform default country's (Uzbekistan). */
  regions(countryId?: Id): Promise<Region[]>
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
  /** Per-status counters for the same worklist filters (one round trip for all status tabs). */
  worklistCounts(companyId: Id, q: { branchId?: Id; categoryIds?: Id[]; dateFrom?: string; dateTo?: string; search?: string }): Promise<WorklistCounts>
  getItem(itemId: Id): Promise<OrderItem>
  saveValues(itemId: Id, employeeId: Id, values: ValueMap, labNote?: string): Promise<OrderItem>
  submitItem(itemId: Id, employeeId: Id): Promise<OrderItem>
  approveItem(itemId: Id, employeeId: Id, templateId?: Id): Promise<{ item: OrderItem; document: ResultDocument }>
  /**
   * Order-scoped approval: approve every `submitted` item of the order covered by an
   * order-scope template (its serviceTypeIds/categoryIds) and issue ONE document for them.
   * `itemIds` narrows the set (defaults to all matching items in submitted/approved state).
   */
  approveOrder(orderId: Id, employeeId: Id, templateId: Id, itemIds?: Id[]): Promise<{ items: OrderItem[]; document: ResultDocument }>
  /** Items an order-scope template would cover for this order (for preview / confirmation UI). */
  orderScopeItems(orderId: Id, templateId: Id): Promise<OrderItem[]>
  rejectItem(itemId: Id, employeeId: Id, reason: string): Promise<OrderItem>
  /** Doctor takes back an approved result: document withdrawn, result back to the lab (`items` = every item that changed). */
  revokeItem(itemId: Id, reason: string): Promise<{ item: OrderItem; items: OrderItem[]; documentId?: Id | null }>
  listDocuments(q: { orderId?: Id; patientId?: Id; branchId?: Id }): Promise<ResultDocument[]>
  getDocument(id: Id): Promise<ResultDocument>
  /** Re-send the result-ready SMS (with the result link); `dryRun` only returns the recipient and the text. */
  resendResultSms(documentId: Id, input?: { to?: string; dryRun?: boolean }): Promise<ResultSms>
}

export interface TemplateRepository {
  list(companyId: Id, q?: { status?: string; serviceTypeId?: Id; branchId?: Id; search?: string }): Promise<ResultTemplate[]>
  get(id: Id): Promise<ResultTemplate>
  save(input: Partial<ResultTemplate> & { companyId: Id; id?: Id }): Promise<ResultTemplate>
  setStatus(id: Id, status: ResultTemplate['status']): Promise<ResultTemplate>
  /** Draft copy; `name` / `branchIds` override the source (a branch importing another branch's template). */
  duplicate(id: Id, opts?: { name?: string; branchIds?: Id[] }): Promise<ResultTemplate>
  /** The standard cheque as a new draft receipt template (name / branches / paper / label language optional). */
  createDefaultReceipt(companyId: Id, input?: { name?: string; branchIds?: Id[]; paper?: 'Receipt80' | 'Receipt58'; language?: ResultTemplate['language'] }): Promise<ResultTemplate>
  delete(id: Id): Promise<void>
  listAssets(companyId: Id): Promise<TemplateAsset[]>
  uploadAsset(companyId: Id, asset: Omit<TemplateAsset, 'id' | 'companyId'>): Promise<TemplateAsset>
}

export interface MessagingRepository {
  listOutbox(companyId: Id, q: PageQuery & { status?: string; kind?: string; branchId?: Id }): Promise<Page<OutboxMessage>>
  /** Per-status counters for the same outbox filters (one request for all tabs). */
  outboxCounts(companyId: Id, q: { kind?: string; search?: string; branchId?: Id }): Promise<Record<'all' | MessageStatus | 'sending', number>>
  send(companyId: Id, input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string; branchId?: Id }): Promise<OutboxMessage[]>
  notifications(): Promise<Notification[]>
  markRead(id?: Id): Promise<void>
}

export interface ReportRepository {
  dashboard(companyId: Id, q: { branchId?: Id; dateFrom: string; dateTo: string }): Promise<DashboardSummary>
  breakdown(companyId: Id, q: { by: 'category' | 'service' | 'branch' | 'employee'; dateFrom: string; dateTo: string; branchId?: Id }): Promise<{ name: string; count: number; revenue: number }[]>
  /** Patients of the period: new / returning, demographics, districts, most frequent, debts (finance only). */
  patients(companyId: Id, q: ReportRange): Promise<PatientReport>
  /** Results of the period's cheques: ready, overdue, turnaround, received by the patient or not. */
  results(companyId: Id, q: ReportRange): Promise<ResultsReport>
  /** Rows behind `results`: results (not) received, or cheques still waiting — paged. */
  resultList(companyId: Id, q: ReportRange & { status: ResultListStatus; page: number; pageSize: number; search?: string }): Promise<Page<ResultRow>>
  /** Service usage vs the previous period; active services nobody ordered. */
  services(companyId: Id, q: ReportRange): Promise<ServicesReport>
}

/** Inclusive calendar days (`YYYY-MM-DD`, clinic timezone) + optional branch. */
export type ReportRange = { branchId?: Id; dateFrom: string; dateTo: string }

/** Public clinic card shown in the portal (letterhead data only — no settings/secrets). */
export type PortalCompany = Pick<Company, 'id' | 'name' | 'logoUrl' | 'phone' | 'address'>
/** Public branch card shown in the portal. */
export type PortalBranch = Pick<Branch, 'id' | 'companyId' | 'name' | 'address' | 'phone'>

/**
 * Patient portal — scoped by patient token; separate surface on purpose.
 * Every payload is self-contained (clinic/branch cards, assets, schemas travel with it) so portal
 * pages never call staff-only endpoints.
 */
export interface PortalRepository {
  overview(patientId: Id): Promise<{ patient: Patient; orders: Order[]; documents: ResultDocument[]; companies: PortalCompany[]; branches: PortalBranch[] }>
  order(patientId: Id, orderId: Id): Promise<{ order: Order; items: OrderItem[]; documents: ResultDocument[]; company: PortalCompany; branch?: PortalBranch | null }>
  document(patientId: Id, documentId: Id): Promise<{ document: ResultDocument; template: ResultTemplate; item?: OrderItem; order: Order; items: OrderItem[]; schemas: AttributeSchema[]; serviceCodes: Record<Id, string>; category?: Category; company: PortalCompany; branch?: PortalBranch | null; assets: TemplateAsset[] }>
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
