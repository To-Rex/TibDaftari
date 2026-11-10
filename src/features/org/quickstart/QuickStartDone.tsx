/**
 * The result sheet of a quick start: the facility, the nodes created on the way, the sign-in details to hand out
 * (copy / print), what was inherited and copied, the cheque.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Copy, Printer, ReceiptText } from 'lucide-react'
import type { QuickStartResult } from '@/domain'
import { Badge, Button, toast } from '@/shared/ui'
import { UnitIcon, useUnitLabels } from '../unitUi'
import { countsSummary } from './draft'

type CountKey = 'categories' | 'serviceTypes' | 'schemas' | 'templates' | 'receipts'

function credentialsText(r: QuickStartResult, labels: { role: string; login: string; password: string }): string {
  const head = `${r.facility.name} (${r.facility.code ?? ''})\n${r.facility.path}\n\n`
  const rows = r.employees.map((e) => `${e.roleName} — ${e.fullName}\n  ${labels.login}: ${e.login}\n  ${labels.password}: ${e.password}`).join('\n\n')
  return head + rows
}

function printSheet(r: QuickStartResult, t: (k: string, o?: Record<string, unknown>) => string) {
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  const rows = r.employees.map((e) => `<tr><td>${esc(e.roleName)}</td><td>${esc(e.fullName)}</td><td class="m">${esc(e.login)}</td><td class="m">${esc(e.password)}</td></tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t('admin.quickStart.printTitle', { name: r.facility.name }))}</title>
<style>body{font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 16px;color:#555}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:8px 10px;text-align:left}th{background:#f3f3f3;font-size:12px;text-transform:uppercase;letter-spacing:.04em}.m{font-family:ui-monospace,Menlo,monospace}.hint{margin-top:16px;font-size:12px;color:#666}</style></head>
<body><h1>${esc(r.facility.name)} <span class="m">${esc(r.facility.code ?? '')}</span></h1><p>${esc(r.facility.path)}</p>
<table><thead><tr><th>${esc(t('admin.quickStart.role'))}</th><th>${esc(t('admin.quickStart.fullName'))}</th><th>${esc(t('admin.quickStart.login'))}</th><th>${esc(t('auth.password'))}</th></tr></thead><tbody>${rows}</tbody></table>
<p class="hint">${esc(t('admin.quickStart.printHint'))}</p><script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open('', '_blank', 'width=800,height=600')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
}

export function QuickStartDone({ result: r }: { result: QuickStartResult }) {
  const { t } = useTranslation()
  const labels = useUnitLabels()
  const label = (k: CountKey) => t(`admin.quickStart.counts.${k}`)
  const [copied, setCopied] = useState(false)
  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(credentialsText(r, { role: t('admin.quickStart.role'), login: t('admin.quickStart.login'), password: t('auth.password') }))
      setCopied(true)
      toast.success(t('admin.quickStart.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('common.error'))
    }
  }
  const created = [r.region, r.district].filter((u): u is NonNullable<typeof u> => !!u)
  return (
    <div className="flex flex-col gap-5" data-qs-done>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><CheckCircle2 className="size-6" /></span>
        <div className="min-w-0">
          <div className="text-[17px] font-semibold">{t('admin.quickStart.doneTitle')}</div>
          <p className="mt-0.5 text-[13px] text-ink-2">{t('admin.quickStart.doneSubtitle', { name: r.facility.name })}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-line bg-surface/60 px-3.5 py-3" data-qs-done-facility>
        <span className="grid size-9 place-items-center rounded-lg bg-ok-soft text-ok"><UnitIcon unit={r.facility} className="size-[18px]" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-[14px] font-semibold"><span className="truncate">{r.facility.name}</span><span className="font-mono text-[12px] font-normal text-ink-3">{r.facility.code}</span><Badge size="sm" tone="ok">{labels.of(r.facility)}</Badge></div>
          <div className="truncate text-[12px] text-ink-3">{r.facility.path}</div>
        </div>
        {created.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-line/70 pt-2 text-[12px] text-ink-3 sm:w-auto sm:border-0 sm:pt-0">
            <span>{t('admin.quickStart.createdNodes')}:</span>
            {created.map((u) => <Badge key={u.id} size="sm" tone="info"><UnitIcon unit={u} className="size-3" />{u.name}</Badge>)}
          </div>
        )}
      </div>

      <section data-qs-credentials>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[14px] font-semibold">{t('admin.quickStart.credentials')}</div>
          {r.employees.length > 0 && (
            <div className="flex gap-1.5">
              <Button size="xs" variant="secondary" leftIcon={<Copy className="size-3.5" />} onClick={() => void copyAll()} data-qs-copy>{copied ? t('admin.quickStart.copied') : t('admin.quickStart.copyAll')}</Button>
              <Button size="xs" variant="secondary" leftIcon={<Printer className="size-3.5" />} onClick={() => printSheet(r, t)}>{t('admin.quickStart.print')}</Button>
            </div>
          )}
        </div>
        {r.employees.length ? (
          <div className="overflow-hidden rounded-[var(--radius)] border border-line">
            <table className="w-full text-[13.5px]">
              <thead className="bg-surface/70 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                <tr><th className="px-3 py-2">{t('admin.quickStart.role')}</th><th className="px-3 py-2 max-sm:hidden">{t('admin.quickStart.fullName')}</th><th className="px-3 py-2">{t('admin.quickStart.login')}</th><th className="px-3 py-2">{t('auth.password')}</th></tr>
              </thead>
              <tbody>
                {r.employees.map((e) => (
                  <tr key={e.id} className="border-t border-line/70" data-qs-cred={e.roleKey}>
                    <td className="px-3 py-2 font-medium">{e.roleName}</td>
                    <td className="px-3 py-2 text-ink-2 max-sm:hidden">{e.fullName}</td>
                    <td className="px-3 py-2 font-mono text-brand-ink">{e.login}</td>
                    <td className="px-3 py-2 font-mono">{e.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-ink-3">{t('admin.quickStart.noEmployees')}</p>}
      </section>

      <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2" data-qs-done-catalog>
        <div className="rounded-[var(--radius)] border border-line px-3.5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('admin.quickStart.inheritedTitle')}</div>
          <div className="mt-0.5">{countsSummary(r.catalog.inherited, label) || '—'}</div>
        </div>
        <div className="rounded-[var(--radius)] border border-line px-3.5 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('admin.quickStart.copiedTitle')}{r.catalog.sampleName && <span className="normal-case tracking-normal"> · {r.catalog.sampleName}</span>}</div>
          <div className="mt-0.5">{countsSummary(r.catalog.copied, label) || '—'}</div>
        </div>
      </div>
      <p className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3"><ReceiptText className="size-3.5" />{r.receipt ? t('admin.quickStart.receiptActive', { name: r.receipt.name }) : t('admin.quickStart.noReceipt')}</p>
    </div>
  )
}
