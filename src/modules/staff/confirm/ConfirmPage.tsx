/** Doctor's confirmation queue — master/detail with live document preview. */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { CategoryTabs, type CategorySelection } from '@/features/lab/CategoryTabs'
import { DateRangeFilter, initialRange, type RangeState } from '@/features/lab/DateRangeFilter'
import { useApproveItem, useLabCategories, useRejectItem, useWorklist } from '@/features/lab/queries'
import { ConfirmList } from '@/features/confirm/ConfirmList'
import { ConfirmDetail } from '@/features/confirm/ConfirmDetail'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Card, ConfirmDialog, Field, Modal, Page, PageHeader, Pagination, SearchInput, Segmented, Textarea, Toolbar, toast } from '@/shared/ui'

type Queue = 'submitted' | 'approved'

export default function ConfirmPage() {
  const { t } = useTranslation()
  const { companyId, employeeId, branchId } = useStaffSession()
  const { can } = usePermissions()
  const [sp, setSp] = useSearchParams()
  const selectedId = sp.get('item')
  const select = useCallback((id: string | null) => setSp((p) => { if (id) p.set('item', id); else p.delete('item'); return p }, { replace: true }), [setSp])

  const [queue, setQueue] = useState<Queue>('submitted')
  const [cat, setCat] = useState<CategorySelection>({ rootId: 'all', childId: null })
  const [range, setRange] = useState<RangeState>(() => initialRange('last7'))
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search.trim(), 300)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [approveOpen, setApproveOpen] = useState<{ templateId?: string } | null>(null)
  const [justApproved, setJustApproved] = useState<string | null>(null)

  const cats = useLabCategories(companyId, employeeId)
  const categoryIds = useMemo(() => {
    if (!cats.data) return undefined
    if (cat.rootId === 'all') return cats.data.allIds
    if (cat.childId) return cats.data.descendants(cat.childId)
    return cats.data.roots.find((r) => r.root.id === cat.rootId)?.ids
  }, [cats.data, cat])
  useEffect(() => setPage(1), [cat, queue, range, q])

  const list = useWorklist(companyId, { branchId: branchId ?? undefined, categoryIds, status: [queue], dateFrom: range.range.from, dateTo: range.range.to, search: q || undefined, page, pageSize: 20 }, { refetchInterval: 30_000, enabled: !!cats.data })
  const rows = useMemo(() => list.data?.items ?? [], [list.data])

  const approve = useApproveItem()
  const reject = useRejectItem()

  const moveSelection = useCallback((dir: 1 | -1) => {
    if (!rows.length) return
    const i = rows.findIndex((r) => r.id === selectedId)
    const next = rows[Math.min(rows.length - 1, Math.max(0, i + dir))] ?? rows[0]
    if (next) { select(next.id); document.querySelector(`[data-item-id="${next.id}"]`)?.scrollIntoView({ block: 'nearest' }) }
  }, [rows, selectedId, select])

  const doApprove = async (templateId?: string) => {
    if (!selectedId) return
    try {
      const res = await approve.mutateAsync({ itemId: selectedId, employeeId, templateId })
      setApproveOpen(null)
      setJustApproved(res.item.id)
      toast.success(t('clinical.messages.approved'), res.document.title)
      setTimeout(() => {
        setJustApproved(null)
        // advance to the next pending item in the list
        const i = rows.findIndex((r) => r.id === res.item.id)
        const next = rows[i + 1] ?? rows[i - 1]
        select(next?.id ?? null)
      }, 900)
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const doReject = async () => {
    if (!selectedId || !reason.trim()) return
    try {
      await reject.mutateAsync({ itemId: selectedId, employeeId, reason: reason.trim() })
      setRejectOpen(false); setReason('')
      toast.info(t('clinical.messages.rejected'))
      const i = rows.findIndex((r) => r.id === selectedId)
      select(rows[i + 1]?.id ?? rows[i - 1]?.id ?? null)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  // keyboard: J/K move, A approve
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'j' || e.key === 'J') moveSelection(1)
      else if (e.key === 'k' || e.key === 'K') moveSelection(-1)
      else if ((e.key === 'a' || e.key === 'A') && selectedId && queue === 'submitted' && can('confirm.result.approve') && !rejectOpen && !approveOpen) setApproveOpen({})
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [moveSelection, selectedId, queue, can, rejectOpen, approveOpen])

  const data = list.data

  return (
    <Page width="full">
      <PageHeader title={t('clinical.confirm.title')} description={t('clinical.confirm.subtitle')} />
      <div className="mb-4"><CategoryTabs roots={cats.data?.roots} loading={cats.isLoading} value={cat} onChange={setCat} /></div>
      <Toolbar actions={<DateRangeFilter value={range} onChange={setRange} size="sm" />}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('clinical.lab.searchPlaceholder')} className="h-9 w-full sm:w-64" />
        <Segmented<Queue> size="sm" value={queue} onChange={setQueue} items={[
          { value: 'submitted', label: t('clinical.confirm.queueSubmitted') },
          { value: 'approved', label: t('clinical.confirm.queueApproved') },
        ]} />
      </Toolbar>

      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card padded={false} className="overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto">
          <ConfirmList rows={rows} loading={list.isLoading || cats.isLoading} selectedId={selectedId} onSelect={select} categoryColor={(id) => cats.data?.colors[id]} />
          {data && data.totalPages > 1 && (
            <div className="border-t border-line px-3 py-2.5">
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPage={setPage} labels={{ perPage: t('common.perPage'), of: t('common.of'), rows: t('common.rows') }} />
            </div>
          )}
        </Card>
        <ConfirmDetail companyId={companyId} itemId={selectedId} onApprove={(tid) => setApproveOpen({ templateId: tid })} onReject={() => setRejectOpen(true)} approving={approve.isPending} justApproved={justApproved} />
      </div>

      <ConfirmDialog open={!!approveOpen} onClose={() => setApproveOpen(null)} onConfirm={() => void doApprove(approveOpen?.templateId)} loading={approve.isPending} title={t('clinical.confirm.approveTitle')} description={t('clinical.confirm.approveHint')} confirmText={t('clinical.confirm.approve')} cancelText={t('common.cancel')} />

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('clinical.confirm.rejectTitle')} description={t('clinical.confirm.rejectHint')} size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="danger" onClick={() => void doReject()} loading={reject.isPending} disabled={!reason.trim()}>{t('clinical.confirm.reject')}</Button>
        </>}>
        <Field label={t('clinical.confirm.reason')} required>
          {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('clinical.confirm.reasonPlaceholder')} autoFocus />}
        </Field>
      </Modal>
    </Page>
  )
}
