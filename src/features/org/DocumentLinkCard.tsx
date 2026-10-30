/**
 * "Natija havolasi" — for how many days after a result is issued its SMS link opens the PDF without an SMS code
 * (`company.documentFreeViewDays`; 0 = a code every time, the default). After that the link asks for the code as
 * before. The backend reads the setting on every request, so a shorter period (or 0) closes open links at once.
 * The QR printed on the document is not affected: it only checks authenticity.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { addDays } from 'date-fns'
import { CalendarClock, LockKeyhole, LockKeyholeOpen, QrCode, ShieldAlert } from 'lucide-react'
import type { Company } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { fmtDate } from '@/shared/lib/format'
import { Badge, Button, Card, CardHeader, Input, toast } from '@/shared/ui'
import { useSaveCompany } from './queries'

/** same cap as the backend (`DOCUMENT_FREE_VIEW_MAX_DAYS`) */
export const DOCUMENT_FREE_VIEW_MAX_DAYS = 90
const PRESETS = [0, 1, 3, 7, 14, 30]

export function DocumentLinkCard({ company, readOnly }: { company: Company; readOnly?: boolean }) {
  const { t } = useTranslation()
  const save = useSaveCompany()
  const saved = company.documentFreeViewDays ?? 0
  const [days, setDays] = useState(saved)
  // "Boshqa": any number of days the presets do not offer
  const [custom, setCustom] = useState(!PRESETS.includes(saved))
  useEffect(() => { setDays(saved); setCustom(!PRESETS.includes(saved)) }, [saved])

  const valid = Number.isInteger(days) && days >= (custom ? 1 : 0) && days <= DOCUMENT_FREE_VIEW_MAX_DAYS
  const dirty = days !== saved
  const label = (n: number) => (n === 1 ? t('admin.docLink.oneDay') : t('admin.docLink.days', { n }))

  const submit = async () => {
    if (!valid || !dirty) return
    try {
      await save.mutateAsync({ id: company.id, documentFreeViewDays: days })
      toast.success(t('admin.docLink.saved'))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  const option = (key: string, active: boolean, onClick: () => void, text: string) => (
    <button key={key} type="button" role="radio" aria-checked={active} onClick={onClick} data-doc-link-option={key}
      className={cn('h-9 rounded-full border px-3.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed',
        active ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-surface-2')}>
      {text}
    </button>
  )

  return (
    <Card data-doc-link-card>
      <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.docLink.title')} description={t('admin.docLink.subtitle')}
        actions={saved > 0
          ? <Badge tone="warn" dot>{t('admin.docLink.badgeOn', { n: saved })}</Badge>
          : <Badge tone="ok" dot>{t('admin.docLink.badgeOff')}</Badge>} />
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('admin.docLink.title')}>
          {PRESETS.map((n) => option(String(n), !custom && days === n, () => { setCustom(false); setDays(n) }, n === 0 ? t('admin.docLink.always') : label(n)))}
          {option('custom', custom, () => { setCustom(true); if (!(days >= 1)) setDays(1) }, t('admin.docLink.custom'))}
        </div>

        {custom && (
          <div className="flex flex-wrap items-center gap-3">
            <Input type="number" inputMode="numeric" min={1} max={DOCUMENT_FREE_VIEW_MAX_DAYS} step={1} mono value={Number.isNaN(days) ? '' : days} className="h-10 w-36"
              aria-label={t('admin.docLink.customLabel')} invalid={!valid} data-doc-link-days
              onChange={(e) => setDays(e.target.value === '' ? Number.NaN : Math.trunc(Number(e.target.value)))}
              rightSlot={<span className="pr-1 text-[12px] text-ink-3">{t('common.days')}</span>} />
            {!valid && <span className="text-[12.5px] text-danger" role="alert">{t('admin.docLink.range', { max: DOCUMENT_FREE_VIEW_MAX_DAYS })}</span>}
          </div>
        )}

        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-line bg-surface-2/40 p-3.5 text-[13px] text-ink-2" data-doc-link-explain={valid && days > 0 ? 'on' : 'off'}>
          <span className={cn('grid size-8 shrink-0 place-items-center rounded-lg [&>svg]:size-4', valid && days > 0 ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok')}>
            {valid && days > 0 ? <LockKeyholeOpen /> : <LockKeyhole />}
          </span>
          <p className="min-w-0 leading-relaxed">
            {valid && days > 0
              ? t('admin.docLink.explainOn', { n: days, date: fmtDate(addDays(new Date(), days).toISOString()) })
              : t('admin.docLink.explainOff')}
          </p>
        </div>

        {valid && days > 0 && (
          <p className="flex items-start gap-2 rounded-[var(--radius)] border border-warn/30 bg-warn-soft/50 px-3.5 py-2.5 text-[12.5px] text-ink-2" data-doc-link-warn>
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />{t('admin.docLink.warn')}
          </p>
        )}
        <p className="flex items-start gap-2 text-[12.5px] text-ink-3">
          <QrCode className="mt-0.5 size-4 shrink-0" />{t('admin.docLink.qrNote')}
        </p>

        {!readOnly && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {dirty && <span className="mr-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-3"><CalendarClock className="size-3.5" />{t('admin.docLink.unsaved')}</span>}
            <Button className="max-sm:w-full" onClick={() => void submit()} loading={save.isPending} disabled={!dirty || !valid} data-doc-link-save>{t('common.save')}</Button>
          </div>
        )}
      </fieldset>
    </Card>
  )
}
