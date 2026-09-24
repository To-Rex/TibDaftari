/**
 * "Boshqa filialdan olish": pick templates that belong to other branches (or to none) and copy them into
 * the current branch — each copy is a draft owned by this branch, free to edit without touching the source.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch, LayoutTemplate, Search } from 'lucide-react'
import type { Branch, Id, ResultTemplate } from '@/domain'
import { useDuplicateTemplate } from '@/features/catalog/queries'
import { errorMessage } from '@/shared/lib/errors'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, Checkbox, EmptyState, Input, Modal, toast } from '@/shared/ui'

export function ImportFromBranchModal({ open, onClose, branchId, branches, templates, onImported }: {
  open: boolean; onClose: () => void; branchId: Id; branches: Branch[]; templates: ResultTemplate[]; onImported?: (copies: ResultTemplate[]) => void
}) {
  const { t } = useTranslation()
  const dup = useDuplicateTemplate()
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Set<Id>>(new Set())
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setQ(''); setPicked(new Set()) } }, [open])
  const branchName = (id: Id) => branches.find((b) => b.id === id)?.name ?? '…'
  // everything this branch does not already have
  const candidates = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return templates
      .filter((x) => !x.branchIds.includes(branchId))
      .filter((x) => !needle || x.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [templates, branchId, q])
  const toggle = (id: Id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const all = candidates.length > 0 && candidates.every((x) => picked.has(x.id))

  const run = async () => {
    const chosen = candidates.filter((x) => picked.has(x.id))
    if (!chosen.length) return
    setBusy(true)
    const copies: ResultTemplate[] = []
    try {
      for (const x of chosen) copies.push(await dup.mutateAsync({ id: x.id, name: x.name, branchIds: [branchId] }))
      toast.success(t('catalog.templates.fromBranchDone', { n: copies.length }))
      onImported?.(copies)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e), copies.length ? t('catalog.templates.fromBranchPartial', { n: copies.length }) : undefined)
    } finally { setBusy(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('catalog.templates.fromBranchTitle', { branch: branchName(branchId) })} description={t('catalog.templates.fromBranchHint')} size="lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={run} loading={busy} disabled={picked.size === 0}>{t('catalog.templates.fromBranchImport', { n: picked.size })}</Button></>}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('catalog.templates.searchPh')} leftIcon={<Search />} className="flex-1 min-w-[200px]" />
          {candidates.length > 0 && <Checkbox checked={all} onChange={(e) => setPicked(e.target.checked ? new Set(candidates.map((x) => x.id)) : new Set())} label={<span className="text-[13px]">{t('catalog.templates.selectAll')}</span>} />}
        </div>
        {candidates.length === 0 ? (
          <EmptyState icon={<LayoutTemplate />} title={t('catalog.templates.fromBranchEmpty')} className="py-8" />
        ) : (
          <ul className="max-h-[52vh] divide-y divide-line/70 overflow-y-auto rounded-[var(--radius)] border border-line">
            {candidates.map((x) => {
              const on = picked.has(x.id)
              return (
                <li key={x.id}>
                  {/* the row toggles the choice; the checkbox has its own label, so the row must not be one (nested labels double-toggle) */}
                  <div role="checkbox" aria-checked={on} tabIndex={0} onClick={() => toggle(x.id)} onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(x.id) } }}
                    className={cn('flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40', on && 'bg-brand-soft/30')}>
                    <span onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={() => toggle(x.id)} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-medium">{x.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                        <Badge size="sm" tone={x.status === 'active' ? 'ok' : x.status === 'archived' ? 'neutral' : 'warn'} dot>{t(`catalog.templates.status.${x.status}`)}</Badge>
                        <span className="inline-flex items-center gap-1"><GitBranch className="size-3.5" />{x.branchIds.length ? x.branchIds.map(branchName).join(' · ') : t('catalog.templates.allBranches')}</span>
                        <span>· v{x.version}</span>
                      </span>
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}
