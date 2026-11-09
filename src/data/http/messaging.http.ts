/**
 * HTTP MessagingRepository — outbox (SMS/Telegram), manual send, in-app notifications.
 * Wire contract: TibDaftari-Backend `app/modules/messaging` (router.py / schemas.py).
 */
import type { Notification, OutboxMessage, Page } from '@/domain'
import type { MessagingRepository } from '@/data/repositories'
import { api, compact } from './client'

export const messagingHttp: MessagingRepository = {
  outboxCounts: (scopeId, q) => api.get(`/units/${scopeId}/outbox/counts`, { query: { kind: q.kind, search: q.search, unitId: q.unitId } }),

  /** Sort is fixed server-side (createdAt desc); sortBy/sortDir are forwarded but ignored. */
  listOutbox: (scopeId, q) =>
    api.get<Page<OutboxMessage>>(`/units/${scopeId}/outbox`, {
      query: {
        page: q.page,
        pageSize: q.pageSize,
        search: q.search,
        sortBy: q.sortBy,
        sortDir: q.sortDir,
        status: q.status,
        kind: q.kind,
        unitId: q.unitId,
      },
    }),

  send: (scopeId, input) =>
    api.post<OutboxMessage[]>(
      `/units/${scopeId}/messages/send`,
      compact({ to: input.to, text: input.text, kind: input.kind, scheduledAt: input.scheduledAt, unitId: input.unitId }),
    ),

  notifications: () => api.get<Notification[]>('/notifications'),

  /** No `id` → mark all as read. */
  markRead: async (id) => {
    await api.post<{ ok: boolean }>('/notifications/read', id ? { id } : {})
  },
}
