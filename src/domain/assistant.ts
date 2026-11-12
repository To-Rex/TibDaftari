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

export interface AssistantTool { name: string; title: string; kind: AssistantToolKind }
export interface AssistantStatus {
  enabled: boolean
  configured: boolean
  provider?: AssistantProvider | null
  model?: string | null
  effectiveUnitName?: string | null
  effectivePlatform?: boolean
  tools: AssistantTool[]
  rateLimit: number
  rateWindowSeconds: number
}

export interface AssistantThread { id: Id; title: string; unitId?: Id | null; lastMessageAt?: string | null; createdAt: string }
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
}
export interface AssistantMessage {
  id: Id
  role: AssistantRole
  content: string
  toolCalls: AssistantToolCall[]
  toolName?: string | null
  isError: boolean
  action?: AssistantAction | null
  /** files the tools of this turn produced */
  files?: AssistantFile[]
  createdAt: string
}
export interface AssistantThreadDetail { thread: AssistantThread; messages: AssistantMessage[]; pending: AssistantAction | null }
/** The turns one request appended and the write waiting for a yes. */
export interface AssistantSendResult { messages: AssistantMessage[]; pending: AssistantAction | null; thread: AssistantThread }
