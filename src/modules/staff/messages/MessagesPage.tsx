/** SMS outbox — status tabs, search, server pagination, compose drawer, live refresh. */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { Info, MessageSquare, Plus, Settings2 } from 'lucide-react'
import type { MessageStatus, OutboxMessage } from '@/domain'
import { repos } from '@/data'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { ComposeDrawer } from '@/features/messaging/ComposeDrawer'
import { MESSAGE_STATUSES, MessageStatusBadge } from '@/features/messaging/MessageStatusBadge'
import { useOutbox } from '@/features/messaging/queries'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { fmtDateTime, fmtPhone, fmtRelative } from '@/shared/lib/format'
import { Badge, Button, Card, DataTable, EmptyState, Page, PageHeader, Pagination, SearchInput, Tabs, Toolbar, type Column } from '@/shared/ui'

type Tab = 'all' | MessageStatus

export default function MessagesPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [compose, setCompose] = useState(false)
  const q = useDebounce(search.trim(), 300)
  useEffect(() => setPage(1), [tab, q, pageSize])

  const params = { status: tab === 'all' ? undefined : tab, search: q || undefined, page, pageSize }
  const [live, setLive] = useState(false)
  const list = useOutbox(companyId, params, live ? 3000 : 30_000)
  const rows = useMemo(() => list.data?.items ?? [], [list.data])
  useEffect(() => setLive(rows.some((m) => m.status === 'queued' || m.status === 'sent')), [rows])

  const counts = useQueries({
    queries: MESSAGE_STATUSES.map((s) => ({
      queryKey: ['outbox-count', companyId, s, q],
      queryFn: () => repos.messaging.listOutbox(companyId, { status: s, search: q || undefined, page: 1, pageSize: 1 }),
      select: (d: { total: number }) => d.total,
      refetchInterval: live ? 3000 : 30_000,
    })),
  })
  const countOf = useMemo(() => Object.fromEntries(MESSAGE_STATUSES.map((s, i) => [s, counts[i]?.data])) as Record<MessageStatus, number | undefined>, [counts])

  const columns: Column<OutboxMessage>[] = [
    { key: 'to', header: t('common.phone'), width: '170px', cell: (m) => <span className="font-mono text-[13px] tabular">{fmtPhone(m.to)}</span> },
    { key: 'text', header: t('clinical.messages.text'), cell: (m) => <div className="max-w-[560px] truncate text-ink-2" title={m.text}>{m.text}</div> },
    { key: 'kind', header: t('clinical.messages.kind'), hideBelow: 'lg', width: '140px', cell: (m) => <Badge size="sm">{t(`clinical.messages.kind_${m.kind}`)}</Badge> },
    { key: 'status', header: t('common.status'), width: '150px', cell: (m) => (
      <div className="flex flex-col gap-0.5">
        <MessageStatusBadge status={m.status} />
        {m.error && <span className="truncate text-[11.5px] text-danger" title={m.error}>{m.error}</span>}
      </div>
    ) },
    { key: 'time', header: t('common.date'), hideBelow: 'md', width: '160px', align: 'right', cell: (m) => (
      <div className="text-[12.5px] tabular leading-5">
        <div className="text-ink-2">{m.status === 'scheduled' && m.scheduledAt ? fmtDateTime(m.scheduledAt) : fmtDateTime(m.sentAt ?? m.createdAt)}</div>
        <div className="text-ink-3">{fmtRelative(m.sentAt ?? m.createdAt)}</div>
      </div>
    ) },
  ]

  const data = list.data
  return (
    <Page>
      <PageHeader
        title={t('clinical.messages.title')}
        description={t('clinical.messages.subtitle')}
        actions={can(['messaging.send', 'messaging.broadcast']) && <Button leftIcon={<Plus className="size-4" />} onClick={() => setCompose(true)}>{t('clinical.messages.newMessage')}</Button>}
      />

      <div className="mb-4 flex items-start gap-3 rounded-[var(--radius)] border border-info/25 bg-info-soft/60 px-4 py-3 text-[13px] text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <span className="flex-1">{t('clinical.messages.providerBanner')}</span>
        {can('admin.settings.write') && <Link to={routes.admin.sms} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-info hover:underline"><Settings2 className="size-3.5" />{t('clinical.messages.openSettings')}</Link>}
      </div>

      <Tabs<Tab>
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'all', label: t('common.all'), count: data?.total != null && tab === 'all' ? data.total : undefined },
          ...MESSAGE_STATUSES.map((s) => ({ value: s, label: t(`clinical.messages.status_${s}`), count: countOf[s] })),
        ]}
      />
      <Toolbar actions={live && <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-3"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-brand" /></span>{t('clinical.messages.live')}</span>}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('clinical.messages.searchPlaceholder')} className="h-9 w-full sm:w-80" />
      </Toolbar>

      <Card padded={false} className="overflow-hidden">
        <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} loading={list.isLoading}
          empty={<EmptyState icon={<MessageSquare />} title={t('clinical.messages.empty')} description={t('common.emptyHint')} />} />
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={setPageSize} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>

      <ComposeDrawer open={compose} onClose={() => setCompose(false)} companyId={companyId} canBroadcast={can('messaging.broadcast')} />
    </Page>
  )
}
