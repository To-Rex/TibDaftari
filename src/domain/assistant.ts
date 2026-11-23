/**
 * The AI assistant («Yordamchi»): a chat that acts inside the employee's own rights. Every tool the model uses runs
 * on the server with the employee's principal; a write is proposed as an `AssistantAction` and runs only after the
 * employee confirms it. Wire contract: TibDaftari-Backend `app/modules/assistant`.
 */
import type { Id } from './common'

export type AssistantProvider = 'anthropic' | 'openai' | 'deepseek' | 'deploy' | 'custom' | 'none'
export type AssistantAccountMode = 'inherited' | 'own' | 'off'
export type AssistantToolKind = 'read' | 'write'
export type AssistantActionStatus = 'pending' | 'done' | 'failed' | 'cancelled' | 'expired'
export type AssistantRole = 'user' | 'assistant' | 'tool'

/** The model account in effect at a unit; the key never comes back, only its masked tail. */
export interface AssistantAccount {
  mode: AssistantAccountMode
  provider: AssistantProvider
  baseUrl?: string | null
  model?: string | null
  apiKeyMasked?: string | null
  effort?: string | null
  maxTokens?: number | null
  effectiveUnitId?: Id | null
  effectiveUnitName?: string | null
  /** the account in effect is the platform's — entered once by a superadmin for everyone */
  effectivePlatform?: boolean
  configured: boolean
}
export interface AssistantAccountInput {
  mode: AssistantAccountMode
  provider?: AssistantProvider
  baseUrl?: string
  model?: string
  /** write-only plaintext; omitted = keep the saved key */
  apiKey?: string
  effort?: 'low' | 'medium' | 'high'
  maxTokens?: number
}
export interface AssistantTestResult { ok: boolean; provider: AssistantProvider; model?: string | null; reply?: string | null; error?: string | null; latencyMs: number }

/** where a tool belongs in the "what I can do" list */
export type AssistantToolGroup = 'general' | 'units' | 'staff' | 'catalog' | 'templates' | 'reception' | 'lab' | 'results' | 'reports' | 'messaging' | 'files' | 'schedule'
export interface AssistantTool { name: string; title: string; kind: AssistantToolKind; group?: AssistantToolGroup; /** a write that cannot be taken back */ danger?: boolean; /** a write the employee can take back afterwards */ undoable?: boolean }
/** one step of the working unit's lineage (company → … → the unit) — what the assistant is told about where the employee works */
export interface AssistantContextStep { level: 'company' | 'country' | 'region' | 'district' | 'facility'; id: Id; name: string; code?: string | null }
export interface AssistantStatus {
  enabled: boolean
  configured: boolean
  provider?: AssistantProvider | null
  model?: string | null
  effectiveUnitName?: string | null
  effectivePlatform?: boolean
  tools: AssistantTool[]
  /** the working unit's lineage, company first */
  context?: AssistantContextStep[]
  rateLimit: number
  rateWindowSeconds: number
}

export interface AssistantThread { id: Id; title: string; unitId?: Id | null; lastMessageAt?: string | null; createdAt: string; /** the scheduled task whose runs land here */ scheduleId?: Id | null; /** a scheduled run left an answer the owner has not opened yet */ unread?: boolean }
/** a file a tool built (export_data / export_table) — downloaded by its owner from GET /assistant/files/{id} */
export interface AssistantFile { id: Id; name: string; contentType: string; size: number; rows?: number | null; expiresAt: string; createdAt: string }
export interface AssistantToolCall { id: string; name: string; title: string; kind: AssistantToolKind; summary: string; status: string; file?: AssistantFile | null }
export interface AssistantAction {
  id: Id
  threadId: Id
  tool: string
  title: string
  summary: string
  args: Record<string, unknown>
  status: AssistantActionStatus
  error?: string | null
  expiresAt: string
  createdAt: string
  /** what the write touches, ids resolved to names */
  details?: { label: string; value: string }[]
  /** cannot be taken back */
  danger?: boolean
  /** while pending: the word the employee must type to confirm an irreversible write */
  confirmWord?: string | null
  /** this kind of write has a way back (known before it runs) */
  undoable?: boolean
  /** once done: the way back, if this run left one */
  undo?: AssistantUndo | null
}
/** The way back of a done action: open right now, already used (`undoneAt`), or closed (the window passed). */
export interface AssistantUndo { available: boolean; label: string; until?: string | null; undoneAt?: string | null }
/** a question the assistant asked with ready answers — tapping one sends it as the next message */
export interface AssistantChoices { question: string; options: string[] }
export interface AssistantMessage {
  id: Id
  role: AssistantRole
  content: string
  toolCalls: AssistantToolCall[]
  toolName?: string | null
  isError: boolean
  /** the first write this turn proposed */
  action?: AssistantAction | null
  /** every write this turn proposed, in order — more than one is answered together (one card, one yes) */
  actions?: AssistantAction[]
  /** files the tools of this turn produced */
  files?: AssistantFile[]
  choices?: AssistantChoices | null
  /** the employee stopped the run here — the content is a note for the model, not an answer */
  stopped?: boolean
  /** this message reports that the action with this id was taken back */
  undoOf?: Id | null
  /** a user turn written by a scheduled task (its prompt), not typed by the employee */
  scheduled?: boolean
  createdAt: string
}
export interface AssistantThreadDetail { thread: AssistantThread; messages: AssistantMessage[]; pending: AssistantAction | null }
/**
 * A task the assistant repeats for its owner («Rejali topshiriq»): what to do (`prompt`) and when. Every run happens
 * with the owner's rights of that moment and read-only tools; the answer lands in the task's own conversation.
 */
export type AssistantScheduleKind = 'daily' | 'weekly' | 'monthly' | 'once'
export interface AssistantSchedule {
  id: Id
  title: string
  prompt: string
  kind: AssistantScheduleKind
  /** HH:MM in `timezone` */
  time: string
  /** weekly: 1 = Monday … 7 = Sunday */
  weekdays: number[]
  monthDay?: number | null
  /** once: YYYY-MM-DD */
  runDate?: string | null
  timezone: string
  /** the rule in words (Uzbek, from the server) */
  when: string
  unitId: Id
  unitName?: string | null
  threadId?: Id | null
  isActive: boolean
  /** why the system switched it off (errors in a row, lost rights) */
  pausedReason?: string | null
  /** a one-time task that has run */
  finished?: boolean
  nextRunAt?: string | null
  lastRunAt?: string | null
  lastStatus?: 'ok' | 'failed' | null
  lastError?: string | null
  runCount: number
  createdAt: string
}
export interface AssistantScheduleInput { title: string; prompt: string; kind: AssistantScheduleKind; time: string; weekdays?: number[]; monthDay?: number | null; runDate?: string | null; unitId?: Id; isActive?: boolean }
export interface AssistantScheduleList { items: AssistantSchedule[]; /** how many tasks one employee may keep */ limit: number; /** the worker that runs due tasks is on at this server */ running?: boolean }

/** The turns one request appended and the write waiting for a yes. */
export interface AssistantSendResult { messages: AssistantMessage[]; pending: AssistantAction | null; thread: AssistantThread }
