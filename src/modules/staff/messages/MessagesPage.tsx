/**
 * SMS journal — status tabs, search, kind and period filters, the whole text of every message right in the list,
 * a reading pane with the message's way and actions (`?m=<id>`), compose drawer, live refresh.
 * Where the list itself has room (its own width, not the screen's — the sidebar may be open or folded) it is a table;
 * narrower, a list of cards made for a thumb. Both open the same pane.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { subDays } from 'date-fns'
import { Copy, Eye, FilterX, History, Info, MessageSquare, MoreHorizontal, PenLine, Plus, Rows3, Settings2, WrapText } from 'lucide-react'
import type { MessageKind, MessageStatus, OutboxMessage } from '@/domain'
import { useWorkspace } from '@/app/layouts/AppShell'
import { copyText } from '@/features/assistant/CopyButton'
import { usePermissions, useStaffScope } from '@/features/auth/store'
import { ComposeDrawer } from '@/features/messaging/ComposeDrawer'
import { MessageDrawer, type ComposeSeed } from '@/features/messaging/MessageDrawer'
import { MESSAGE_STATUSES, MessageStatusBadge } from '@/features/messaging/MessageStatusBadge'
import { useOutbox, useOutboxCounts } from '@/features/messaging/queries'
import { MessageText, failureReason, messageMoment, phoneLabel } from '@/features/messaging/text'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/lib/cn'
import { fmtDateTime, fmtNumber, fmtPhone, fmtRelative, isoDay } from '@/shared/lib/format'
import { storage } from '@/shared/lib/storage'
import { Badge, Button, Card, DataTable, EmptyState, IconButton, Input, Menu, Page, PageHeader, Pagination, SearchInput, Segmented, Select, Skeleton, Tabs, toast, type Column, type MenuItem } from '@/shared/ui'

type Tab = 'all' | MessageStatus
type Period = 'all' | 'today' | '7d' | '30d' | 'custom'
type View = 'full' | 'compact'

const M = 'clinical.messages'
const KINDS: MessageKind[] = ['payment_receipt', 'result_ready', 'reminder', 'broadcast', 'otp', 'portal_access']
const PERIODS: Period[] = ['all', 'today', '7d', '30d', 'custom']
/** how the texts are shown in the list — the reader's own choice, kept in this browser */
const VIEW_KEY = 'clinic.messages.view'

/** Under the status: how many SMS it took, what it cost, what the provider says — and, in red, why it failed. */
function StatusMeta({ m, className }: { m: OutboxMessage; className?: string }) {
  const { t } = useTranslation()
  const facts = [m.parts ? t(`${M}.parts`, { n: m.parts }) : null, m.cost != null ? `${fmtNumber(Math.round(m.cost))} ${t('common.sum')}` : null, m.providerStatus && m.status !== 'delivered' ? m.providerStatus : null].filter(Boolean).join(' · ')
  const why = m.status === 'failed' || m.status === 'queued' ? failureReason(t, m.error) : null
  if (!facts && !why) return null
  return (
    <span className={cn('flex min-w-0 flex-col gap-0.5 text-[11.5px] leading-4', className)}>
      {facts && <span className="break-words text-ink-3" data-sms-detail>{facts}</span>}
      {why && <span className={cn('line-clamp-2 break-words', m.status === 'failed' ? 'text-danger' : 'text-warn')} title={why.raw ?? why.text}>{why.text}</span>}
    </span>
  )
}

/** One message on a phone: the number and where it stands on top, the text in the middle, the facts underneath. */
function MessageCard({ m, full, showUnit, selected, dim, onOpen, menu }: { m: OutboxMessage; full: boolean; showUnit: boolean; selected: boolean; dim: boolean; onOpen: () => void; menu: ReactNode }) {
  const { t } = useTranslation()
  const onKey = (e: KeyboardEvent) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpen() } }
  return (
    <li>
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKey} data-message-card={m.id}
        className={cn('app-row-card cursor-pointer rounded-[var(--radius)] border border-line bg-surface p-3.5 shadow-1 outline-none transition-[background-color,border-color,box-shadow] focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15 active:bg-surface-2/70', selected && 'border-brand bg-brand-soft/30', dim && 'opacity-60')}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="break-all font-mono text-[14px] font-medium leading-5 tabular">{phoneLabel(m)}</div>
            {m.patientName && <div className="truncate text-[12.5px] leading-5 text-ink-3">{m.patientName}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-0.5" data-tour="messages-status">
            <MessageStatusBadge status={m.status} />
            <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} className="-mr-1.5">{menu}</span>
          </div>
        </div>
        <MessageText text={m.text} links={false} className={cn('mt-2 text-[14px] leading-[1.55] text-ink', !full && 'line-clamp-3')} />
        <StatusMeta m={m} className="mt-1.5" />
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line/70 pt-2.5 text-[12px] text-ink-3">
          <Badge size="sm">{t(`${M}.kind_${m.kind}`)}</Badge>
          {m.countryCode && m.countryCode !== 'UZ' && <Badge size="sm" tone="info">{m.countryCode}</Badge>}
          {showUnit && m.unitName && <span className="min-w-0 truncate">{m.unitName}</span>}
          <time dateTime={messageMoment(m)} className="ml-auto whitespace-nowrap tabular">{fmtDateTime(messageMoment(m))}</time>
        </div>
      </div>
    </li>
  )
}

export default function MessagesPage() {
  const { t } = useTranslation()
  const { scopeId } = useStaffScope()
  const { shape } = useWorkspace()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const openId = params.get('m')

  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<'' | MessageKind>('')
  const [period, setPeriod] = useState<Period>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [view, setView] = useState<View>(() => (storage.get<View>(VIEW_KEY, 'full') === 'compact' ? 'compact' : 'full'))
  const [compose, setCompose] = useState<{ seed?: ComposeSeed } | null>(null)
  const full = view === 'full'
  const q = useDebounce(search.trim(), 300)

  // calendar days as the reader sees them; the server counts them in Tashkent time
  const range = useMemo<{ dateFrom?: string; dateTo?: string }>(() => {
    const today = new Date()
    if (period === 'today') return { dateFrom: isoDay(today), dateTo: isoDay(today) }
    if (period === '7d') return { dateFrom: isoDay(subDays(today, 6)) }
    if (period === '30d') return { dateFrom: isoDay(subDays(today, 29)) }
    if (period === 'custom') return { dateFrom: from || undefined, dateTo: to || undefined }
    return {}
  }, [period, from, to])
  useEffect(() => setPage(1), [tab, q, kind, range, pageSize, scopeId])

  // the outbox of the scope unit — the facility the staff app works in (messages are stamped with the facility of their cheque / sender)
  const filters = { kind: kind || undefined, search: q || undefined, ...range }
  const [live, setLive] = useState(false)
  const list = useOutbox(scopeId, { ...filters, status: tab === 'all' ? undefined : tab, page, pageSize }, live ? 3000 : 30_000)
  const rows = useMemo(() => list.data?.items ?? [], [list.data])
  useEffect(() => setLive(rows.some((m) => m.status === 'queued' || m.status === 'sent')), [rows])

  // one GROUP BY request for every status tab
  const countsQ = useOutboxCounts(scopeId, filters, live ? 3000 : 30_000)
  const countOf = useMemo(() => Object.fromEntries(MESSAGE_STATUSES.map((s) => [s, countsQ.data?.[s]])) as Record<MessageStatus, number | undefined>, [countsQ.data])

  // only a scope above facility level (no facility chosen under it) mixes facilities — then say which one sent each message
  const scopeUnit = shape.byId.get(scopeId)
  const showUnit = !!scopeUnit && scopeUnit.level !== 'facility'
  const canSend = can(['messaging.send', 'messaging.broadcast'])
  const filtered = !!q || !!kind || period !== 'all' || tab !== 'all'
  const clearFilters = () => { setSearch(''); setKind(''); setPeriod('all'); setFrom(''); setTo(''); setTab('all') }

  /* ---- the reading pane lives in the address (`?m=`): Back closes it — on a phone that is how a sheet is closed —
     and a link to one message can be kept or passed on ---- */
  const pushed = !!(location.state as { pane?: boolean } | null)?.pane
  const openMessage = useCallback((id: string) => {
    const next = new URLSearchParams(location.search)
    const had = next.has('m')
    next.set('m', id)
    // going from one message to another stays one step of history: Back still closes the pane
    navigate({ search: `?${next}` }, { replace: had, state: had ? location.state : { pane: true } })
  }, [location.search, location.state, navigate])
  const closeMessage = useCallback(() => {
    if (pushed) { navigate(-1); return }
    const next = new URLSearchParams(location.search)
    next.delete('m')
    navigate({ search: next.size ? `?${next}` : '' }, { replace: true })
  }, [pushed, location.search, navigate])

  // ← → in the pane walk the list, across pages too: the next page opens on its first row, the previous on its last
  const idx = openId ? rows.findIndex((r) => r.id === openId) : -1
  const total = list.data?.total ?? 0
  const totalPages = list.data?.totalPages ?? 1
  const edge = useRef<'first' | 'last' | null>(null)
  useEffect(() => {
    if (!edge.current || list.isPlaceholderData || rows.length === 0) return
    const target = edge.current === 'first' ? rows[0] : rows[rows.length - 1]
    edge.current = null
    if (target) openMessage(target.id)
  }, [rows, list.isPlaceholderData, openMessage])
  const turn = (side: 'first' | 'last') => () => { edge.current = side; setPage((p) => p + (side === 'first' ? 1 : -1)) }
  const before = idx > 0 ? rows[idx - 1] : undefined
  const after = idx >= 0 ? rows[idx + 1] : undefined
  const onPrev = before ? () => openMessage(before.id) : idx === 0 && page > 1 ? turn('last') : undefined
  const onNext = after ? () => openMessage(after.id) : idx >= 0 && idx === rows.length - 1 && page < totalPages ? turn('first') : undefined
  const position = idx >= 0 && total > 0 ? `${fmtNumber(((list.data?.page ?? page) - 1) * (list.data?.pageSize ?? pageSize) + idx + 1)} / ${fmtNumber(total)}` : undefined

  const showAll = (number: string) => { setTab('all'); setKind(''); setPeriod('all'); setFrom(''); setTo(''); setSearch(fmtPhone(number)); closeMessage() }
  const composeFrom = (seed: ComposeSeed) => { closeMessage(); setCompose({ seed }) }
  const changeView = (v: View) => { setView(v); storage.set(VIEW_KEY, v) }

  // the chosen status stays in sight when the strip scrolls (phones show three of the seven at a time)
  const tabsBox = useRef<HTMLDivElement>(null)
  const firstTab = useRef(true)
  useEffect(() => {
    if (firstTab.current) { firstTab.current = false; return }
    tabsBox.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [tab])

  const menuFor = (m: OutboxMessage): MenuItem[] => [
    { key: 'open', label: t(`${M}.open`), icon: <Eye />, onSelect: () => openMessage(m.id) },
    { key: 'copy', label: t(`${M}.copyText`), icon: <Copy />, onSelect: () => void copyText(m.text).then((ok) => ok && toast.success(t(`${M}.copied`))) },
    ...(canSend && m.channel === 'sms' ? [{ key: 'write', label: m.secret ? t(`${M}.writeTo`) : t(`${M}.editAndSend`), icon: <PenLine />, onSelect: () => setCompose({ seed: { to: m.to, text: m.secret ? undefined : m.text, countryCode: m.countryCode } }) }] : []),
    { key: 'number', label: t(`${M}.byNumber`), icon: <History />, separatorBefore: true, onSelect: () => showAll(m.to) },
  ]
  const rowMenu = (m: OutboxMessage) => (
    <Menu items={menuFor(m)} trigger={() => <IconButton label={t(`${M}.actions`)} size="sm"><MoreHorizontal /></IconButton>} />
  )
  // a click that ends a text selection is not a click on the row
  const openRow = (m: OutboxMessage) => { if (!window.getSelection()?.toString()) openMessage(m.id) }

  const top = 'align-top'
  const columns: Column<OutboxMessage>[] = [
    { key: 'to', header: t(`${M}.recipient`), width: '168px', className: top, cell: (m) => (
      <div className="min-w-0">
        <div className="whitespace-nowrap font-mono text-[13px] leading-6 tabular">{phoneLabel(m)}</div>
        {m.patientName && <div className="max-w-[168px] truncate text-[12px] text-ink-3" title={m.patientName}>{m.patientName}</div>}
      </div>
    ) },
    { key: 'text', header: t(`${M}.text`), className: top, cell: (m) => (
      full
        ? <MessageText text={m.text} links={false} className="max-w-[78ch] leading-6 text-ink-2" />
        // one line, cut by the column — never `nowrap`, which would let a long text push the other columns off the card
        : <div className="line-clamp-1 max-w-[78ch] break-all leading-6 text-ink-2" title={m.text}>{m.text}</div>
    ) },
    ...(showUnit ? [{ key: 'unit', header: t(`${M}.unit`), width: '150px', className: cn(top, '@max-[80rem]:hidden'), cell: (m) => <span className="line-clamp-2 break-words leading-6 text-ink-2" title={m.unitName ?? ''}>{m.unitName ?? '—'}</span> } as Column<OutboxMessage>] : []),
    { key: 'kind', header: t(`${M}.kind`), width: '132px', className: cn(top, '@max-[68rem]:hidden'), cell: (m) => <Badge size="sm" className="mt-0.5">{t(`${M}.kind_${m.kind}`)}</Badge> },
    { key: 'status', header: t('common.status'), width: '150px', className: top, cell: (m) => (
      <div data-tour="messages-status" className="flex min-w-0 flex-col gap-1">
        <span className="inline-flex flex-wrap items-center gap-1">
          <MessageStatusBadge status={m.status} />
          {m.countryCode && m.countryCode !== 'UZ' && <Badge size="sm" tone="info">{m.countryCode}</Badge>}
        </span>
        <StatusMeta m={m} />
      </div>
    ) },
    { key: 'time', header: t('common.date'), width: '128px', align: 'right', className: top, cell: (m) => (
      <div className="whitespace-nowrap text-[12.5px] leading-5 tabular">
        <div className="text-ink-2">{fmtDateTime(messageMoment(m))}</div>
        <div className="text-ink-3">{fmtRelative(m.sentAt ?? m.createdAt)}</div>
      </div>
    ) },
    { key: 'more', header: <span className="sr-only">{t(`${M}.actions`)}</span>, width: '36px', align: 'right', className: cn(top, '!px-2'), cell: (m) => <span onClick={(e) => e.stopPropagation()} className="-mt-1 inline-flex">{rowMenu(m)}</span> },
  ]

  const data = list.data
  const loadingFirst = list.isLoading && rows.length === 0
  const empty = (
    <EmptyState icon={<MessageSquare />} title={t(filtered ? `${M}.emptyFiltered` : `${M}.empty`)} description={filtered ? undefined : t('common.emptyHint')}
      action={filtered ? <Button variant="secondary" size="sm" leftIcon={<FilterX className="size-4" />} onClick={clearFilters}>{t(`${M}.clearFilters`)}</Button> : undefined} />
  )

  return (
    <Page>
      <PageHeader
        title={t(`${M}.title`)}
        description={t(`${M}.subtitle`)}
        actions={canSend && <Button data-hotkey="n" data-tour="messages-new" leftIcon={<Plus className="size-4" />} onClick={() => setCompose({})}>{t(`${M}.newMessage`)}</Button>}
      />

      <div className="mb-4 flex flex-wrap items-start gap-x-3 gap-y-2 rounded-[var(--radius)] border border-info/25 bg-info-soft/60 px-4 py-3 text-[13px] text-ink-2">
        <Info className="mt-0.5 size-4 shrink-0 text-info" />
        <span className="min-w-0 flex-1 basis-40 break-words">{t(`${M}.providerBanner`)}</span>
        {can('admin.settings.write') && <Link to={routes.admin.sms} className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-info hover:underline"><Settings2 className="size-3.5" />{t(`${M}.openSettings`)}</Link>}
      </div>

      <div ref={tabsBox}>
        <Tabs<Tab>
          tour="messages-tabs"
          className="mb-4"
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: t('common.all'), count: countsQ.data?.all },
            ...MESSAGE_STATUSES.map((s) => ({ value: s, label: t(`${M}.status_${s}`), count: countOf[s] })),
          ]}
        />
      </div>

      {/* filters on the left, the list's own switches on the right; they stack as soon as one row is too tight */}
      <div className="app-toolbar mb-4 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {/* the input sits in a wrapper of its own — the width goes on the wrapper, or a phone gets half a field */}
          <div className="w-full sm:w-64 xl:w-56 2xl:w-72" data-tour="messages-search">
            <SearchInput value={search} onChange={setSearch} placeholder={t(`${M}.searchPlaceholder`)} className="h-9" />
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:w-44 sm:flex-none">
            <Select value={kind} onChange={(e) => setKind(e.target.value as '' | MessageKind)} aria-label={t(`${M}.kind`)} className="h-9 text-[13.5px]" data-messages-kind>
              <option value="">{t(`${M}.allKinds`)}</option>
              {KINDS.map((k) => <option key={k} value={k}>{t(`${M}.kind_${k}`)}</option>)}
            </Select>
          </div>
          <div className="min-w-[9.5rem] flex-1 sm:w-44 sm:flex-none">
            <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label={t(`${M}.period`)} className="h-9 text-[13.5px]" data-messages-period>
              {PERIODS.map((p) => <option key={p} value={p}>{t(`${M}.period_${p}`)}</option>)}
            </Select>
          </div>
          {period === 'custom' && (
            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={t(`${M}.dateFrom`)} className="h-9 min-w-0 flex-1 px-2 text-[13px] tabular sm:w-[9.25rem] sm:flex-none" />
              <span aria-hidden className="text-ink-3">–</span>
              <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={t(`${M}.dateTo`)} className="h-9 min-w-0 flex-1 px-2 text-[13px] tabular sm:w-[9.25rem] sm:flex-none" />
            </div>
          )}
          {filtered && <Button variant="ghost" size="sm" leftIcon={<FilterX className="size-4" />} onClick={clearFilters} className="max-sm:w-full">{t(`${M}.clearFilters`)}</Button>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 xl:shrink-0 xl:justify-end">
          {live && <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-3"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" /><span className="relative inline-flex size-2 rounded-full bg-brand" /></span>{t(`${M}.live`)}</span>}
          <span className="ml-auto" title={t(`${M}.viewLabel`)}>
            <Segmented<View> size="sm" value={view} onChange={changeView} items={[
              { value: 'full', label: t(`${M}.viewFull`), icon: <WrapText /> },
              { value: 'compact', label: t(`${M}.viewCompact`), icon: <Rows3 /> },
            ]} />
          </span>
        </div>
      </div>

      <Card data-tour="messages-list" padded={false} className="@container overflow-hidden">
        {/* room for the columns AND a readable text between them: a table whose text column takes all that is left */}
        <div className="hidden @min-[56rem]:block">
          <DataTable columns={columns} rows={rows} rowKey={(m) => m.id} loading={list.isLoading || list.isPlaceholderData} onRowClick={openRow} selectedKey={openId ?? undefined} cardBelow="never" empty={empty} />
        </div>
        {/* less than that (a phone, a tablet, a small laptop with the sidebar open): cards */}
        <div className="p-2.5 @min-[56rem]:hidden sm:p-3">
          {loadingFirst
            ? <div className="space-y-2.5">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="space-y-2.5 rounded-[var(--radius)] border border-line bg-surface p-3.5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-4/5" /></div>)}</div>
            : rows.length === 0
              ? empty
              : <ul className="grid grid-cols-1 gap-2.5">{rows.map((m) => <MessageCard key={m.id} m={m} full={full} showUnit={showUnit} selected={m.id === openId} dim={list.isPlaceholderData} onOpen={() => openMessage(m.id)} menu={rowMenu(m)} />)}</ul>}
        </div>
        {data && data.total > 0 && (
          <div className="overflow-x-auto no-scrollbar border-t border-line px-3 py-3 sm:px-4">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={setPageSize} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>

      <MessageDrawer scopeId={scopeId} id={openId} seed={idx >= 0 ? rows[idx] : undefined} onClose={closeMessage} onOpen={openMessage}
        onPrev={onPrev} onNext={onNext} position={position} onCompose={canSend ? composeFrom : undefined} onShowAll={showAll} showUnit={showUnit} />
      <ComposeDrawer open={!!compose} onClose={() => setCompose(null)} scopeId={scopeId} canBroadcast={can('messaging.broadcast')} seed={compose?.seed} />
    </Page>
  )
}
