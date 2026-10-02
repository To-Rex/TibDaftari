/**
 * Superadmin reset ("like newborn") of a company or one branch. Shows what each part would remove (a preview from
 * the API), lets the superadmin choose the parts (dependencies follow automatically), and only resets after the
 * company slug / branch code is typed and the irreversibility is acknowledged. Irreversible by design.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { ResetPreview, ResetResult, ResetTarget } from '@/domain'
import { repos } from '@/data'
import { useAuth } from '@/features/auth/store'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtNumber } from '@/shared/lib/format'
import { Button, Checkbox, Field, Input, Modal, Skeleton, toast } from '@/shared/ui'

const R = 'admin.reset'

/** Selected parts + what they require (transitively). */
const withRequired = (keys: Set<string>, parts: ResetPreview['parts']): Set<string> => {
  const out = new Set(keys)
  let grew = true
  while (grew) {
    grew = false
    for (const p of parts) if (out.has(p.key)) for (const r of p.requires) if (!out.has(r)) { out.add(r); grew = true }
  }
  return out
}
/** Removing a part also removes every part that needs it. */
const withoutDependents = (keys: Set<string>, removed: string, parts: ResetPreview['parts']): Set<string> => {
  const out = new Set(keys)
  const drop = [removed]
  while (drop.length) {
    const k = drop.pop()!
    out.delete(k)
    for (const p of parts) if (out.has(p.key) && p.requires.includes(k)) drop.push(p.key)
  }
  return out
}

export function ResetDialog({ target, id, open, onClose, onDone }: {
  target: ResetTarget
  id: string | null
  open: boolean
  onClose: () => void
  onDone?: (r: ResetResult) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const preview = useQuery({ queryKey: ['reset-preview', target, id], queryFn: () => repos.tenant.resetPreview(target, id!), enabled: open && !!id, staleTime: 0, gcTime: 0 })
  const parts = useMemo(() => preview.data?.parts ?? [], [preview.data])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [word, setWord] = useState('')
  const [ack, setAck] = useState(false)
  const [result, setResult] = useState<ResetResult | null>(null)
  // a fresh dialog starts with everything selected — "like newborn" is what this is for
  useEffect(() => { if (open) { setWord(''); setAck(false); setResult(null) } }, [open, id])
  useEffect(() => { if (preview.data) setPicked(new Set(preview.data.parts.map((p) => p.key))) }, [preview.data])

  const run = useMutation({
    mutationFn: () => repos.tenant.reset(target, id!, { parts: [...picked], confirm: word.trim() }),
    onSuccess: async (r) => {
      setResult(r)
      toast.success(t(`${R}.done`))
      // a company without its branches: the stored branch choice points nowhere any more
      const auth = useAuth.getState()
      if (target === 'company' && r.parts.includes('branches') && auth.staff?.companyId === id) auth.setBranch(null)
      await qc.invalidateQueries()
      onDone?.(r)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })

  const name = preview.data?.name ?? ''
  const confirmWord = preview.data?.confirmWord ?? ''
  const wordOk = !!confirmWord && word.trim().toLowerCase() === confirmWord.toLowerCase()
  const canRun = wordOk && ack && picked.size > 0 && !run.isPending
  const toggle = (key: string, on: boolean) => setPicked((s) => (on ? withRequired(new Set([...s, key]), parts) : withoutDependents(s, key, parts)))
  const preset = (keys: string[]) => setPicked(withRequired(new Set(keys.filter((k) => parts.some((p) => p.key === k))), parts))
  const countLine = (counts: Record<string, number>) => Object.entries(counts).map(([k, v]) => t(`${R}.n.${k}`, { n: fmtNumber(v) })).join(' · ')
  const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0)
  const partLabel = (key: string) => t(`${R}.${target}.${key}.title`)

  return (
    <Modal open={open} onClose={() => !run.isPending && onClose()} size="lg"
      title={t(`${R}.${target}.title`, { name: name || '…' })}
      description={result ? undefined : t(`${R}.${target}.subtitle`)}
      footer={result
        ? <Button onClick={onClose}>{t('common.done')}</Button>
        : <>
            <Button variant="ghost" onClick={onClose} disabled={run.isPending}>{t('common.cancel')}</Button>
            <Button variant="danger" disabled={!canRun} loading={run.isPending} onClick={() => run.mutate()} data-reset-run>{t(`${R}.run`)}</Button>
          </>}>
      {result ? (
        <div className="flex flex-col gap-3" data-reset-result>
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ok"><CheckCircle2 className="size-5" />{t(`${R}.doneTitle`, { name })}</p>
          <p className="text-[13px] text-ink-2">{t(`${R}.doneParts`, { parts: result.parts.map(partLabel).join(', ') })}</p>
          <ul className="grid gap-1.5 rounded-[var(--radius)] border border-line bg-surface-2/40 p-3 text-[13px] sm:grid-cols-2">
            {Object.entries(result.counts).filter(([, v]) => v > 0).map(([k, v]) => <li key={k} className="tabular text-ink-2">{t(`${R}.n.${k}`, { n: fmtNumber(v) })}</li>)}
            {Object.values(result.counts).every((v) => !v) && <li className="text-ink-3">{t(`${R}.nothing`)}</li>}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3 rounded-[var(--radius)] border border-danger/40 bg-danger-soft/50 px-3 py-2.5 text-[13px] text-ink">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="font-semibold text-danger">{t(`${R}.irreversible`)}</p>
              <p className="text-ink-2">{t(`${R}.${target}.scopeNote`)}</p>
            </div>
          </div>

          {preview.isLoading ? <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            : preview.isError ? <p className="text-[13px] text-danger">{errorMessage(preview.error)}</p>
            : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                  <span className="text-ink-3">{t(`${R}.presets`)}:</span>
                  <Button size="xs" variant="secondary" onClick={() => preset(parts.map((p) => p.key))}>{t(`${R}.presetAll`)}</Button>
                  <Button size="xs" variant="secondary" onClick={() => preset(['orders', 'patients'])}>{t(`${R}.presetData`)}</Button>
                </div>
                <ul className="flex flex-col divide-y divide-line/70 rounded-[var(--radius)] border border-line" data-reset-parts>
                  {parts.map((p) => {
                    const on = picked.has(p.key)
                    const forcedBy = parts.filter((q) => picked.has(q.key) && q.requires.includes(p.key)).map((q) => partLabel(q.key))
                    return (
                      <li key={p.key} className={cn('flex items-start gap-3 px-3 py-2.5', on && 'bg-danger-soft/20')}>
                        <Checkbox checked={on} onChange={(e) => toggle(p.key, e.target.checked)} aria-label={partLabel(p.key)} data-part={p.key} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-semibold text-ink">{partLabel(p.key)}</p>
                          <p className="text-[12px] text-ink-3">{t(`${R}.${target}.${p.key}.hint`)}</p>
                          <p className={cn('mt-0.5 text-[12px] tabular', total(p.counts) ? 'text-ink-2' : 'text-ink-3')}>{total(p.counts) ? countLine(p.counts) : t(`${R}.empty`)}</p>
                          {on && forcedBy.length > 0 && <p className="mt-0.5 text-[11.5px] text-warn">{t(`${R}.requiredBy`, { parts: forcedBy.join(', ') })}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                <p className="flex items-start gap-2 text-[12px] text-ink-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" />{t(`${R}.${target}.kept`)}</p>
                <Field label={t(`${R}.typeToConfirm`, { word: confirmWord })}>
                  {(fid) => <Input id={fid} value={word} onChange={(e) => setWord(e.target.value)} placeholder={confirmWord} autoComplete="off" spellCheck={false} invalid={!!word && !wordOk} data-reset-confirm />}
                </Field>
                <Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)} label={<span className="text-[13px]">{t(`${R}.ack`)}</span>} data-reset-ack />
              </>
            )}
        </div>
      )}
    </Modal>
  )
}
