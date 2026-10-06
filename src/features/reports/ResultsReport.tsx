/**
 * Reports › Results: are the period's results ready, and did the patients get them? "Received" = the patient opened
 * it (SMS link / portal), staff printed it for them, or Telegram delivered the PDF. The list behind it lets staff
 * re-send the SMS or print the result right away.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AlarmClock, BadgeCheck, CheckCheck, Clock, Download, FileClock, FileWarning, Info } from 'lucide-react'
import type { Id, ResultListStatus, ResultRow } from '@/domain'
import type { ReportRange } from '@/data/repositories'
import { repos } from '@/data'
import { usePermissions } from '@/features/auth/store'
import { ResendSmsButton } from '@/features/confirm/ResendSmsButton'
import { PrintDocumentButton } from '@/features/printing/PrintDocumentButton'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate, fmtDateTime, fmtNumber, fmtPhone } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, DataTable, EmptyState, Pagination, SearchInput, Skeleton, Stat, Tabs, toast, type Column, type Tone } from '@/shared/ui'
import { downloadCsv } from './csv'
import { useChartPalette } from './palette'
import { useResultList, useResultsReport } from './queries'
import { BarList, fmtDuration, pct } from './reportKit'

const R = 'clinical.reports.res'
const SMS_TONE: Record<string, Tone> = { queued: 'neutral', sent: 'info', delivered: 'info', failed: 'danger' }
const daysSince = (iso?: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)) : 0)

export function ResultsReport({ companyId, range, canExport }: { companyId: Id; range: ReportRange; canExport: boolean }) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const palette = useChartPalette()
  const canResend = can(['confirm.result.approve', 'messaging.send'])
  const q = useResultsReport(companyId, range)
  const d = q.data
  const [status, setStatus] = useState<ResultListStatus>('not_received')
  const [search, setSearch] = useState('')
  const dSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  useEffect(() => setPage(1), [status, dSearch, range.dateFrom, range.dateTo, range.branchId])
  const listQ = { ...range, status, page, pageSize, search: dSearch.trim() || undefined }
  const list = useResultList(companyId, listQ)
  const [exporting, setExporting] = useState(false)

  const stat = (label: string, v: string | undefined, icon: React.ReactNode, tone: Tone, sub?: string) => (
    <Stat label={label} value={v ?? <Skeleton className="h-7 w-20" />} icon={icon} tone={tone} sub={sub} />
  )
  const n = (v: number | undefined) => (d && v != null ? fmtNumber(v) : undefined)

  const channels = useMemo(() => d && [
    { key: 'viewed', label: t(`${R}.viewed`), value: d.viewed, color: palette[0] },
    { key: 'printed', label: t(`${R}.printed`), value: d.printed, color: palette[2] },
    { key: 'telegram', label: t(`${R}.telegram`), value: d.telegram, color: palette[4] },
    { key: 'sms', label: t(`${R}.smsSent`), value: d.smsSent, color: palette[1] },
  ], [d, t, palette])

  const statusBadges = (r: ResultRow) => {
    if (r.kind === 'order') {
      return (
        <span className="flex flex-wrap gap-1">
          {r.waiting > 0 && <Badge size="sm" tone="warn">{t(`${R}.inLab`, { n: r.waiting })}</Badge>}
          {r.submitted > 0 && <Badge size="sm" tone="info">{t(`${R}.atApproval`, { n: r.submitted })}</Badge>}
          {r.overdue && <Badge size="sm" tone="danger" dot>{t(`${R}.late`)}</Badge>}
        </span>
      )
    }
    const got = !!(r.viewedAt || r.printedAt || r.telegram)
    return (
      <span className="flex flex-wrap gap-1">
        {r.viewedAt && <span title={`${fmtDateTime(r.viewedAt)} · ×${r.viewCount}`}><Badge size="sm" tone="ok" dot>{t(`${R}.stViewed`)}</Badge></span>}
        {r.printedAt && <span title={`${fmtDateTime(r.printedAt)} · ×${r.printCount}`}><Badge size="sm" tone="ok" dot>{t(`${R}.stPrinted`)}</Badge></span>}
        {r.telegram && <Badge size="sm" tone="ok" dot>{t(`${R}.stTelegram`)}</Badge>}
        {r.sms && <Badge size="sm" tone={SMS_TONE[r.sms] ?? 'neutral'}>{t(`${R}.sms.${r.sms}`)}</Badge>}
        {!got && !r.sms && <Badge size="sm" tone="warn">{t(`${R}.stNothing`)}</Badge>}
      </span>
    )
  }
  const waited = (iso?: string | null) => {
    const days = daysSince(iso)
    return days === 0 ? t(`${R}.today`) : t(`${R}.daysN`, { n: days })
  }

  const columns: Column<ResultRow>[] = [
    {
      key: 'patient', header: t(`${R}.patient`), card: 'title',
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <Link to={routes.app.patient(r.patientId)} className="truncate font-medium text-ink hover:text-brand-ink hover:underline">{r.patientName}</Link>
          <span className="tabular text-[12.5px] text-ink-3">{fmtPhone(r.patientPhone)}</span>
        </span>
      ),
    },
    { key: 'order', header: t(`${R}.order`), card: 'meta', cell: (r) => <Link to={routes.app.order(r.orderId)} className="font-mono text-[12.5px] text-brand-ink hover:underline" title={t(`${R}.openOrder`)}>{r.orderNumber}</Link> },
    { key: 'title', header: status === 'waiting' ? t(`${R}.services`) : t(`${R}.result`), cell: (r) => <span className="line-clamp-2 min-w-0 break-words text-ink-2">{r.title}</span> },
    {
      key: 'at', header: status === 'waiting' ? t(`${R}.orderedAt`) : t(`${R}.readyAt`), hideBelow: 'lg',
      cell: (r) => <span className="tabular whitespace-nowrap text-ink-2">{fmtDateTime(r.kind === 'order' ? r.orderedAt : r.readyAt)}</span>,
    },
    ...(status !== 'received' ? [{ key: 'wait', header: t(`${R}.waitingFor`), align: 'right' as const, cell: (r: ResultRow) => <span className="tabular whitespace-nowrap font-medium">{waited(r.kind === 'order' ? r.orderedAt : r.readyAt)}</span> }] : []),
    { key: 'status', header: t(`${R}.status`), cell: statusBadges },
    ...(status !== 'waiting' ? [{
      key: 'actions', header: '', align: 'right' as const, card: 'actions' as const,
      cell: (r: ResultRow) => r.documentId ? (
        <span className="inline-flex items-center justify-end gap-1">
          <PrintDocumentButton variant="icon" size="sm" doc={{ id: r.documentId, title: r.title }} />
          {canResend && <ResendSmsButton variant="icon" size="sm" documentId={r.documentId} />}
        </span>
      ) : null,
    }] : []),
  ]

  const exportList = async () => {
    setExporting(true)
    try {
      const rows: ResultRow[] = []
      for (let p = 1; p <= 25; p++) {
        const res = await repos.reports.resultList(companyId, { ...listQ, page: p, pageSize: 200 })
        rows.push(...res.items)
        if (p >= res.totalPages) break
      }
      if (!rows.length) return toast.info(t('common.empty'))
      const waiting = status === 'waiting'
      downloadCsv(
        `results-${status}-${range.dateFrom}_${range.dateTo}`,
        [t(`${R}.patient`), t(`${R}.patient`) + ' · tel', t(`${R}.order`), waiting ? t(`${R}.services`) : t(`${R}.result`), waiting ? t(`${R}.orderedAt`) : t(`${R}.readyAt`), t(`${R}.status`)],
        rows.map((r) => [
          r.patientName, r.patientPhone, r.orderNumber, r.title, fmtDateTime(r.kind === 'order' ? r.orderedAt : r.readyAt),
          r.kind === 'order'
            ? [r.waiting ? t(`${R}.inLab`, { n: r.waiting }) : '', r.submitted ? t(`${R}.atApproval`, { n: r.submitted }) : '', r.overdue ? t(`${R}.late`) : ''].filter(Boolean).join(', ')
            : [r.viewedAt && t(`${R}.stViewed`), r.printedAt && t(`${R}.stPrinted`), r.telegram && t(`${R}.stTelegram`), r.sms && t(`${R}.sms.${r.sms}`)].filter(Boolean).join(', ') || t(`${R}.stNothing`),
        ]),
      )
      toast.success(t('clinical.reports.exported'))
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setExporting(false)
    }
  }

  const empty = { not_received: t(`${R}.emptyNotReceived`), waiting: t(`${R}.emptyWaiting`), received: t(`${R}.emptyReceived`) }[status]
  const data = list.data

  return (
    <div className="flex flex-col gap-5" data-report="results">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 max-xs:grid-cols-1">
        {stat(t(`${R}.ready`), n(d?.documents), <BadgeCheck />, 'brand', d ? t(`${R}.readySub`, { items: fmtNumber(d.items), ready: fmtNumber(d.itemsReady) }) : undefined)}
        {stat(t(`${R}.received`), n(d?.received), <CheckCheck />, 'ok', d ? t(`${R}.receivedSub`, { pct: pct(d.received, d.documents), patients: fmtNumber(d.receivedPatients) }) : undefined)}
        {stat(t(`${R}.notReceived`), n(d?.notReceived), <FileWarning />, 'warn', d ? t(`${R}.notReceivedSub`, { patients: fmtNumber(d.notReceivedPatients) }) : undefined)}
        {stat(t(`${R}.waiting`), d ? fmtNumber(d.itemsWaiting + d.itemsSubmitted) : undefined, <FileClock />, 'info', d ? t(`${R}.waitingSub`, { lab: fmtNumber(d.itemsWaiting), approval: fmtNumber(d.itemsSubmitted) }) : undefined)}
        {stat(t(`${R}.overdue`), n(d?.itemsOverdue), <AlarmClock />, 'danger', d ? t(`${R}.overdueSub`, { patients: fmtNumber(d.patientsWaiting) }) : undefined)}
        {stat(t(`${R}.avgTime`), d ? fmtDuration(d.avgHours, t) : undefined, <Clock />, 'neutral', d ? t(`${R}.onTimeSub`, { pct: pct(d.onTime, d.itemsReady) }) : undefined)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title={t(`${R}.channels`)} description={t(`${R}.channelsHint`)} />
          <BarList rows={channels} total={d?.documents} loading={q.isLoading} empty={t('clinical.reports.emptyHint')} />
          {d && (
            <p className="mt-4 flex items-start gap-2 rounded-[var(--radius)] bg-surface-2/60 px-3 py-2 text-[12.5px] text-ink-3" data-tracking-note>
              <Info className="mt-0.5 size-3.5 shrink-0" />{t(`${R}.trackingNote`, { date: fmtDate(d.trackingSince) })}
            </p>
          )}
        </Card>
        <Card padded={false} className="min-w-0 overflow-hidden">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5"><CardHeader title={t(`${R}.turnaround`)} description={t(`${R}.turnaroundHint`)} /></div>
          <DataTable columns={[
            { key: 'name', header: t(`${R}.category`), card: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
            { key: 'approved', header: t(`${R}.approved`), align: 'right', cell: (r) => <span className="tabular">{fmtNumber(r.approved)}</span> },
            { key: 'avg', header: t(`${R}.avg`), align: 'right', cell: (r) => <span className="tabular whitespace-nowrap">{fmtDuration(r.avgHours, t)}</span> },
            { key: 'onTime', header: t(`${R}.onTime`), align: 'right', cell: (r) => <span className="tabular">{pct(r.onTime, r.approved)}%</span> },
          ]} rows={d?.turnaround ?? []} rowKey={(r) => r.name} loading={q.isLoading} dense stickyHeader={false}
            empty={<p className="py-8 text-center text-[13px] text-ink-3">{t('clinical.reports.emptyHint')}</p>} />
        </Card>
      </div>

      <Card padded={false} className="min-w-0 overflow-hidden" data-result-list={status}>
        <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
          <CardHeader className="mb-0 max-sm:flex-col max-sm:items-start" title={t(`${R}.list`)} description={t(`${R}.listHint`)}
            actions={canExport && <Button size="sm" variant="ghost" leftIcon={<Download className="size-3.5" />} loading={exporting} onClick={() => void exportList()}>{t('clinical.reports.export')}</Button>} />
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <Tabs<ResultListStatus> size="sm" className="min-w-0 border-b-0" value={status} onChange={setStatus} items={[
              { value: 'not_received', label: <>{t(`${R}.tabNotReceived`)}{d ? <span className="ml-1.5 tabular text-ink-3">{fmtNumber(d.notReceived)}</span> : null}</> },
              { value: 'waiting', label: t(`${R}.tabWaiting`) },
              { value: 'received', label: <>{t(`${R}.tabReceived`)}{d ? <span className="ml-1.5 tabular text-ink-3">{fmtNumber(d.received)}</span> : null}</> },
            ]} />
            <SearchInput value={search} onChange={setSearch} placeholder={t(`${R}.search`)} className="md:w-72" data-result-search />
          </div>
        </div>
        <div className="mt-3 border-t border-line">
          <DataTable<ResultRow> columns={columns} rows={data?.items ?? []} rowKey={(r) => r.documentId ?? r.orderId} loading={list.isLoading || list.isFetching} dense stickyHeader={false}
            empty={<EmptyState icon={<CheckCheck />} title={empty} description={dSearch ? t('common.emptyHint') : undefined} />} />
        </div>
        {data && data.total > 0 && (
          <div className="border-t border-line px-4 py-3">
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1) }}
              labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
          </div>
        )}
      </Card>
    </div>
  )
}
