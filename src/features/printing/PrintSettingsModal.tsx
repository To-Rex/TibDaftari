/**
 * Per-device print settings: how "Chop etish" prints a cheque on THIS computer — via the TPrints
 * service (thermal/ESC-POS or any Windows printer) or the browser dialog. Stored in localStorage.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Plug, Printer, XCircle } from 'lucide-react'
import { Button, Field, Input, Modal, Segmented, Select, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { loadPrintSettings, savePrintSettings, tprintsStatus, tprintsTest, type PrintMode, type PrintSettings } from './tprints'

export function PrintSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const [s, setS] = useState<PrintSettings>(loadPrintSettings)
  const [check, setCheck] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; printers: string[]; defaultPrinter?: string; error?: string }>({ state: 'idle', printers: [] })
  const [testing, setTesting] = useState(false)
  useEffect(() => { if (open) { setS(loadPrintSettings()); setCheck({ state: 'idle', printers: [] }) } }, [open])
  const patch = (p: Partial<PrintSettings>) => setS((v) => ({ ...v, ...p }))

  const probe = async () => {
    setCheck({ state: 'busy', printers: [] })
    try {
      const r = await tprintsStatus(s)
      setCheck({ state: 'ok', ...r })
    } catch (e) {
      setCheck({ state: 'fail', printers: [], error: errorMessage(e) })
    }
  }
  const test = async () => {
    setTesting(true)
    try { await tprintsTest(s); toast.success(t('staff.reception.printing.testSent')) } catch (e) { toast.error(t('staff.reception.printing.failed'), errorMessage(e)) } finally { setTesting(false) }
  }
  const save = () => { savePrintSettings({ ...s, url: s.url.trim().replace(/\/+$/, '') || 'http://127.0.0.1:9100', copies: Math.min(20, Math.max(1, s.copies || 1)) }); toast.success(t('staff.reception.printing.saved')); onClose() }
  const printerKnown = !s.printer || check.printers.includes(s.printer)
  const P = 'staff.reception.printing'

  return (
    <Modal open={open} onClose={onClose} title={t(`${P}.title`)} description={t(`${P}.hint`)} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={save}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label={t(`${P}.mode`)}>
          {() => (
            <Segmented<PrintMode> block value={s.mode} onChange={(mode) => patch({ mode })}
              items={[{ value: 'auto', label: t(`${P}.modeAuto`) }, { value: 'service', label: t(`${P}.modeService`) }, { value: 'browser', label: t(`${P}.modeBrowser`) }]} />
          )}
        </Field>
        <fieldset disabled={s.mode === 'browser'} className="flex flex-col gap-4 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Field label={t(`${P}.url`)} hint={t(`${P}.urlHint`)}>
              {(id) => <Input id={id} mono value={s.url} onChange={(e) => patch({ url: e.target.value })} placeholder="http://127.0.0.1:9100" leftIcon={<Plug />} />}
            </Field>
            <Field label={t(`${P}.apiKey`)} optionalText={t('common.optional')}>
              {(id) => <Input id={id} mono type="password" autoComplete="off" value={s.apiKey} onChange={(e) => patch({ apiKey: e.target.value })} />}
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" loading={check.state === 'busy'} onClick={probe} leftIcon={<Plug className="size-4" />}>{t(`${P}.check`)}</Button>
            {check.state === 'ok' && <span className="inline-flex items-center gap-1.5 text-[13px] text-ok"><CheckCircle2 className="size-4" />{t(`${P}.connected`, { n: check.printers.length })}</span>}
            {check.state === 'fail' && <span className="inline-flex items-center gap-1.5 text-[13px] text-danger"><XCircle className="size-4" />{t(`${P}.notConnected`)}{check.error ? ` · ${check.error}` : ''}</span>}
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Field label={t(`${P}.printer`)}>
              {(id) => (
                <Select id={id} value={s.printer} onChange={(e) => patch({ printer: e.target.value })}>
                  <option value="">{t(`${P}.defaultPrinter`)}{check.defaultPrinter ? ` — ${check.defaultPrinter}` : ''}</option>
                  {!printerKnown && <option value={s.printer}>{s.printer}</option>}
                  {check.printers.map((p) => <option key={p} value={p}>{p}</option>)}
                </Select>
              )}
            </Field>
            <Field label={t(`${P}.copies`)}>
              {(id) => <Input id={id} type="number" min={1} max={20} value={s.copies} onChange={(e) => patch({ copies: Number(e.target.value) || 1 })} />}
            </Field>
          </div>
          <Field label={t(`${P}.paper`)}>
            {() => (
              <Segmented<'0' | '58' | '80'> value={String(s.paper) as '0' | '58' | '80'} onChange={(v) => patch({ paper: Number(v) as 0 | 58 | 80 })}
                items={[{ value: '0', label: t(`${P}.paperAuto`) }, { value: '58', label: '58 mm' }, { value: '80', label: '80 mm' }]} />
            )}
          </Field>
          <div>
            <Button type="button" variant="soft" size="sm" loading={testing} onClick={test} leftIcon={<Printer className="size-4" />}>{t(`${P}.testPrint`)}</Button>
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
