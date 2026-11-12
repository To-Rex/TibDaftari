/** HTTP AssistantRepository — the AI assistant (`app/modules/assistant`). */
import type { AssistantAccount, AssistantSendResult, AssistantStatus, AssistantTestResult, AssistantThread, AssistantThreadDetail } from '@/domain'
import type { AssistantRepository } from '../repositories'
import { api, compact } from './client'

export const assistantHttp: AssistantRepository = {
  status: (unitId) => api.get<AssistantStatus>('/assistant/status', { query: { unitId } }),
  listThreads: () => api.get<AssistantThread[]>('/assistant/threads'),
  createThread: (unitId, title) => api.post<AssistantThread>('/assistant/threads', compact({ title }), { query: { unitId } }),
  getThread: (id) => api.get<AssistantThreadDetail>(`/assistant/threads/${id}`),
  deleteThread: (id) => api.delete<void>(`/assistant/threads/${id}`),
  send: (threadId, content, unitId) => api.post<AssistantSendResult>(`/assistant/threads/${threadId}/messages`, compact({ content, unitId })),
  confirm: (actionId) => api.post<AssistantSendResult>(`/assistant/actions/${actionId}/confirm`, {}),
  cancel: (actionId) => api.post<AssistantSendResult>(`/assistant/actions/${actionId}/cancel`, {}),
  downloadFile: (fileId) => api.get<Blob>(`/assistant/files/${fileId}`, { blob: true }),
  getAccount: (unitId) => api.get<AssistantAccount>(`/units/${unitId}/assistant`),
  saveAccount: (unitId, input) => api.put<AssistantAccount>(`/units/${unitId}/assistant`, compact({ ...input })),
  testAccount: (unitId) => api.post<AssistantTestResult>(`/units/${unitId}/assistant/test`, {}),
  getPlatformAccount: () => api.get<AssistantAccount>('/assistant/platform-account'),
  savePlatformAccount: (input) => api.put<AssistantAccount>('/assistant/platform-account', compact({ ...input })),
  testPlatformAccount: () => api.post<AssistantTestResult>('/assistant/platform-account/test', {}),
}
