/**
 * Repository contracts. Pages/features depend ONLY on these interfaces.
 * `http/` implements them against the TibDaftari FastAPI backend.
 *
 * Scoping: the first argument of every scoped call is `scopeId` — the organisation unit the page works in
 * (a facility for the staff app, the administrator's unit for the admin panel). The API returns everything under
 * that unit; an optional `unitId` inside the query narrows further to one sub-unit.
 */
import type {
  AttributeSchema,
  Category,
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
  PatientPasswordChangeInput,
  PatientPasswordLoginInput,
  PatientSession,
  PatientUpsertInput,
  PortalAccessInput,
  PortalAccessResult,
  Payment,
  PayOrderInput,
  ChangePaymentMethodInput,
  RegionStats,
  RegionStatsQuery,
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
  OrderListFilters,
  OrderSummary,
  OrgUnit,
  UnitCreateInput,
  AssistantAccount,
  AssistantAccountInput,
  AssistantSendResult,
  AssistantStatus,
  AssistantTestResult,
  AssistantThread,
  AssistantThreadDetail,
  QuickStartInput,
  QuickStartPreview,
  QuickStartResult,
  UnitUpdateInput,
  UnitTreeQuery,
  UnitSms,
  UnitSmsInput,
  UnitSmsTemplates,
} from '@/domain'

export type WorklistCounts = Record<'all' | ItemStatus, number>

export interface AuthRepository {
  staffLogin(input: StaffLoginInput): Promise<StaffSession>
  staffMe(token: string): Promise<StaffSession>
  requestPatientOtp(input: PatientOtpRequestInput): Promise<{ challengeId: string; devCode?: string }>
  verifyPatientOtp(input: PatientOtpVerifyInput): Promise<PatientSession>
  /** portal login + password issued at reception — the session sees this patient only */
  patientPasswordLogin(input: PatientPasswordLoginInput): Promise<PatientSession>
  /** login sessions only; the patient's other login sessions end */
  changePatientPassword(input: PatientPasswordChangeInput): Promise<void>
  patientMe(token: string): Promise<PatientSession>
  logout(token: string): Promise<void>
}

/** The organisation tree: units of every level, their settings, SMS accounts / texts, Telegram bot, reset. */
export interface OrgRepository {
  /** every unit the caller may see (flat; build the tree with `buildUnitTree`) */
  tree(q?: UnitTreeQuery): Promise<OrgUnit[]>
  get(id: Id): Promise<OrgUnit>
  /** a child of `parentId` (level follows from the parent); no parent = a country node (platform) */
  create(input: UnitCreateInput): Promise<OrgUnit>
  update(id: Id, input: UnitUpdateInput): Promise<OrgUnit>
  /** The unit's SMS account: its own Xabarchi key, an inherited one, or off. */
  getSms(unitId: Id): Promise<UnitSms>
  saveSms(unitId: Id, input: UnitSmsInput): Promise<UnitSms>
  /** Sends ONE real SMS with the key the unit's messages use (default recipient: the unit's phone). */
  testSms(unitId: Id, to?: string): Promise<SmsTestResult>
  /** The unit's SMS texts (its own, or inherited). */
  getSmsTemplates(unitId: Id): Promise<UnitSmsTemplates>
  /** Save the unit's own texts; `applyToAll` writes them to every unit under it too. */
  saveSmsTemplates(unitId: Id, input: { templates: SmsTemplateOverrides; applyToAll?: boolean }): Promise<UnitSmsTemplates>
  /** Connect (token) / disconnect (null) the unit's own Telegram bot. */
  setTelegram(unitId: Id, botToken: string | null): Promise<OrgUnit>
  /** Superadmin: what a reset of the unit (and everything under it) would remove — nothing changes. */
  resetPreview(unitId: Id): Promise<ResetPreview>
  /** Superadmin: IRREVERSIBLY reset the chosen parts; `confirm` = facility code / unit name. */
  reset(unitId: Id, input: { parts: string[]; confirm: string }): Promise<ResetResult>
  /** Quick start preview under `parentId`: what a new facility would inherit, sample facilities, default roles. */
  quickStartPreview(parentId: Id, q?: { regionId?: Id; districtId?: Id }): Promise<QuickStartPreview>
  /** Quick start: ONE request creates a facility ready to work (nodes, staff, the sample's catalogue + templates, cheque). */
  quickStart(parentId: Id, input: QuickStartInput): Promise<QuickStartResult>
}

export interface AssistantRepository {
  /** whether the assistant works for the caller at `unitId`, with which model, and the tools they may use */
  status(unitId?: Id): Promise<AssistantStatus>
  listThreads(): Promise<AssistantThread[]>
  createThread(unitId?: Id, title?: string): Promise<AssistantThread>
  getThread(id: Id): Promise<AssistantThreadDetail>
  deleteThread(id: Id): Promise<void>
  /** the model answers, runs read tools, proposes writes (returned as `pending`) */
  send(threadId: Id, content: string, unitId?: Id): Promise<AssistantSendResult>
  confirm(actionId: Id): Promise<AssistantSendResult>
  cancel(actionId: Id): Promise<AssistantSendResult>
  /** the unit's model account (its own, inherited, or the platform's); save; one round-trip test */
  getAccount(unitId: Id): Promise<AssistantAccount>
  saveAccount(unitId: Id, input: AssistantAccountInput): Promise<AssistantAccount>
  testAccount(unitId: Id): Promise<AssistantTestResult>
  /** the platform account — entered once by a superadmin, used by every unit without a closer one */
  getPlatformAccount(): Promise<AssistantAccount>
  savePlatformAccount(input: AssistantAccountInput): Promise<AssistantAccount>
  testPlatformAccount(): Promise<AssistantTestResult>
}

export interface StaffRepository {
  listEmployees(scopeId: Id, q: PageQuery & { unitId?: Id; roleId?: Id; status?: string }): Promise<Page<Employee>>
  getEmployee(id: Id): Promise<Employee>
  /** create under `scopeId` (the employee's `unitId` defaults to it); update by `id` */
  saveEmployee(input: Partial<Employee> & { scopeId: Id; id?: Id; password?: string }): Promise<Employee>
  setOverrides(id: Id, overrides: PermissionOverrides): Promise<Employee>
  /** system roles + roles defined on the scope's path and subtree */
  listRoles(scopeId: Id): Promise<Role[]>
  saveRole(input: Partial<Role> & { scopeId: Id; id?: Id }): Promise<Role>
  deleteRole(id: Id): Promise<void>
}

export interface PatientRepository {
  /** `unitId` keeps the read inside one sub-unit (list membership, visit statistics). */
  list(scopeId: Id, q: PageQuery & { tag?: string; unitId?: Id }): Promise<Page<Patient>>
  get(id: Id, q?: { unitId?: Id }): Promise<Patient>
  search(scopeId: Id, query: string, limit?: number, unitId?: Id): Promise<Patient[]>
  create(scopeId: Id, input: PatientUpsertInput): Promise<Patient>
  update(id: Id, input: Partial<PatientUpsertInput>): Promise<Patient>
  findDuplicates(scopeId: Id, input: Partial<PatientUpsertInput>): Promise<Patient[]>
  /** issue / renew the portal login; the answer is the only time the password is shown */
  setPortalAccess(id: Id, input: PortalAccessInput): Promise<PortalAccessResult>
  removePortalAccess(id: Id): Promise<Patient>
  countries(): Promise<Country[]>
  /** Regions of a country; without `countryId` the API returns the platform default country's (Uzbekistan). */
  regions(countryId?: Id): Promise<Region[]>
  districts(regionId?: Id): Promise<District[]>
}

export interface CatalogRepository {
  listCategories(scopeId: Id): Promise<Category[]>
  saveCategory(input: Partial<Category> & { scopeId: Id; id?: Id }): Promise<Category>
  deleteCategory(id: Id): Promise<void>
  /** `unitId` = only what that unit offers, with `effectivePrice` / `available` filled in */
  listServiceTypes(scopeId: Id, q?: { categoryId?: Id; search?: string; activeOnly?: boolean; unitId?: Id }): Promise<ServiceType[]>
  getServiceType(id: Id): Promise<ServiceType>
  saveServiceType(input: Partial<ServiceType> & { scopeId: Id; id?: Id }): Promise<ServiceType>
  deleteServiceType(id: Id): Promise<void>
  listSchemas(scopeId: Id): Promise<AttributeSchema[]>
  getSchema(id: Id): Promise<AttributeSchema>
  saveSchema(input: Partial<AttributeSchema> & { scopeId: Id; id?: Id }): Promise<AttributeSchema>
  publishSchema(id: Id): Promise<AttributeSchema>
}

/** Cheque list query: paging + the basic filters + the extra ones. */
export type OrderListQuery = PageQuery & OrderListFilters & { unitId?: Id; status?: string; payment?: string; dateFrom?: string; dateTo?: string; patientId?: Id }

export interface OrderRepository {
  list(scopeId: Id, q: OrderListQuery): Promise<Page<Order>>
  /** Count, money and payments by method of the cheques the same filters select. */
  summary(scopeId: Id, q: Omit<OrderListQuery, 'page' | 'pageSize' | 'sortBy' | 'sortDir'>): Promise<OrderSummary>
  /** Every cheque the filters + sort select, as an Excel workbook (`caption` = the filters in the user's words). */
  exportXlsx(scopeId: Id, q: Omit<OrderListQuery, 'page' | 'pageSize'> & { lang: 'uz' | 'ru' | 'en'; caption?: string }): Promise<Blob>
  get(id: Id): Promise<{ order: Order; items: OrderItem[]; payments: Payment[] }>
  /** `scopeId` should be the facility; otherwise `input.unitId` names it */
  create(scopeId: Id, employeeId: Id, input: CreateOrderInput): Promise<{ order: Order; items: OrderItem[] }>
  addItems(orderId: Id, serviceTypeIds: Id[]): Promise<{ order: Order; items: OrderItem[] }>
  /** A pending service added by mistake — paid cheques too: `refunded` = what went back to the patient (0 otherwise). */
  removeItem(orderId: Id, itemId: Id, reason?: string): Promise<{ order: Order; items: OrderItem[]; refunded?: number }>
  pay(employeeId: Id, input: PayOrderInput): Promise<{ order: Order; payments: Payment[] }>
  /** Correct how a payment was taken (or split it) — amount, time and cashier stay. Reception within a day of it. */
  changePaymentMethod(paymentId: Id, input: ChangePaymentMethodInput): Promise<{ order: Order; payments: Payment[] }>
  cancel(orderId: Id, reason: string): Promise<Order>
  /** Soft-delete a cheque that never "happened": unpaid, no lab work started. Permission `reception.order.delete`. */
  delete(orderId: Id): Promise<Order>
  /** Lab worklist: items filtered by category/status/date */
  worklist(scopeId: Id, q: PageQuery & { unitId?: Id; categoryIds?: Id[]; status?: ItemStatus[]; dateFrom?: string; dateTo?: string }): Promise<Page<OrderItem & { orderNumber: string; patientName: string; patientPhone: string; patientGender?: 'male' | 'female'; patientBirthDate?: string }>>
  /** Per-status counters for the same worklist filters (one round trip for all status tabs). */
  worklistCounts(scopeId: Id, q: { unitId?: Id; categoryIds?: Id[]; dateFrom?: string; dateTo?: string; search?: string }): Promise<WorklistCounts>
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
  /** scoped to the current working unit (read from the staff session) */
  listDocuments(q: { orderId?: Id; patientId?: Id; unitId?: Id }): Promise<ResultDocument[]>
  getDocument(id: Id): Promise<ResultDocument>
  /** Re-send the result-ready SMS (with the result link); `dryRun` only returns the recipient and the text. */
  resendResultSms(documentId: Id, input?: { to?: string; dryRun?: boolean }): Promise<ResultSms>
}

export interface TemplateRepository {
  /** `unitId` = templates usable at that unit; without it, everything managed from the scope */
  list(scopeId: Id, q?: { status?: string; serviceTypeId?: Id; unitId?: Id; search?: string }): Promise<ResultTemplate[]>
  get(id: Id): Promise<ResultTemplate>
  save(input: Partial<ResultTemplate> & { scopeId: Id; id?: Id }): Promise<ResultTemplate>
  setStatus(id: Id, status: ResultTemplate['status']): Promise<ResultTemplate>
  /** Draft copy; `name` / `unitIds` override the source (a facility importing another facility's template). */
  duplicate(id: Id, opts?: { name?: string; unitIds?: Id[] }): Promise<ResultTemplate>
  /** The standard cheque as a new draft receipt template (name / units / paper / label language optional). */
  createDefaultReceipt(scopeId: Id, input?: { name?: string; unitIds?: Id[]; paper?: 'Receipt80' | 'Receipt58'; language?: ResultTemplate['language'] }): Promise<ResultTemplate>
  delete(id: Id): Promise<void>
  listAssets(scopeId: Id): Promise<TemplateAsset[]>
  uploadAsset(scopeId: Id, asset: Omit<TemplateAsset, 'id' | 'ownerUnitId'>): Promise<TemplateAsset>
  deleteAsset(scopeId: Id, assetId: Id): Promise<void>
}

export interface MessagingRepository {
  listOutbox(scopeId: Id, q: PageQuery & { status?: string; kind?: string; unitId?: Id }): Promise<Page<OutboxMessage>>
  /** Per-status counters for the same outbox filters (one request for all tabs). */
  outboxCounts(scopeId: Id, q: { kind?: string; search?: string; unitId?: Id }): Promise<Record<'all' | MessageStatus | 'sending', number>>
  /** `unitId` = the facility the message goes out from (default: the scope when it is a facility) */
  send(scopeId: Id, input: { to: string[]; text: string; kind: OutboxMessage['kind']; scheduledAt?: string; unitId?: Id }): Promise<OutboxMessage[]>
  notifications(): Promise<Notification[]>
  markRead(id?: Id): Promise<void>
}

/** Territory statistics folded by country / region / district / facility (numbers only). */
export interface PlatformRepository {
  regions(q: RegionStatsQuery): Promise<RegionStats>
}

export interface ReportRepository {
  dashboard(scopeId: Id, q: ReportRange): Promise<DashboardSummary>
  breakdown(scopeId: Id, q: { by: 'category' | 'service' | 'unit' | 'employee' } & ReportRange): Promise<{ name: string; count: number; revenue: number }[]>
  /** Patients of the period: new / returning, demographics, districts, most frequent, debts (finance only). */
  patients(scopeId: Id, q: ReportRange): Promise<PatientReport>
  /** Results of the period's cheques: ready, overdue, turnaround, received by the patient or not. */
  results(scopeId: Id, q: ReportRange): Promise<ResultsReport>
  /** Rows behind `results`: results (not) received, or cheques still waiting — paged. */
  resultList(scopeId: Id, q: ReportRange & { status: ResultListStatus; page: number; pageSize: number; search?: string }): Promise<Page<ResultRow>>
  /** Service usage vs the previous period; active services nobody ordered. */
  services(scopeId: Id, q: ReportRange): Promise<ServicesReport>
  /** The period as an Excel workbook: patients × analyses, labs and the other cuts. */
  exportXlsx(scopeId: Id, q: ReportRange & { lang?: string }): Promise<Blob>
}

/** Inclusive calendar days (`YYYY-MM-DD`, local time) + optional sub-unit. */
export type ReportRange = { unitId?: Id; dateFrom: string; dateTo: string }

/** Public organisation card shown in the portal (the facility's region / district / country node — letterhead data only). */
export type PortalOrg = Pick<OrgUnit, 'id' | 'name' | 'logoUrl' | 'phone' | 'address'>
/** Public facility card shown in the portal. */
export type PortalUnit = Pick<OrgUnit, 'id' | 'name' | 'address' | 'phone'> & { orgId?: Id | null }

/**
 * Patient portal — scoped by patient token; separate surface on purpose.
 * Every payload is self-contained (organisation / facility cards, assets, schemas travel with it) so portal
 * pages never call staff-only endpoints.
 */
export interface PortalRepository {
  overview(patientId: Id): Promise<{ patient: Patient; orders: Order[]; documents: ResultDocument[]; orgs: PortalOrg[]; units: PortalUnit[] }>
  order(patientId: Id, orderId: Id): Promise<{ order: Order; items: OrderItem[]; documents: ResultDocument[]; org: PortalOrg; unit?: PortalUnit | null }>
  document(patientId: Id, documentId: Id): Promise<{ document: ResultDocument; template: ResultTemplate; item?: OrderItem; order: Order; items: OrderItem[]; schemas: AttributeSchema[]; serviceCodes: Record<Id, string>; category?: Category; org: PortalOrg; unit?: PortalUnit | null; assets: TemplateAsset[] }>
}

export interface Repositories {
  auth: AuthRepository
  org: OrgRepository
  staff: StaffRepository
  patients: PatientRepository
  catalog: CatalogRepository
  orders: OrderRepository
  templates: TemplateRepository
  messaging: MessagingRepository
  reports: ReportRepository
  platform: PlatformRepository
  portal: PortalRepository
  assistant: AssistantRepository
}
