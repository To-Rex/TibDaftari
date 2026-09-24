/**
 * "Natijani chop etish" for an approved result: main action prints per the device's settings (TPrints
 * on the A4 printer, else the browser), the menu forces one path or opens the printer settings.
 * `variant="icon"` is the compact form for list rows.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Globe, Printer, Settings2 } from 'lucide-react'
import { Button, IconButton, Menu } from '@/shared/ui'
import { printDocument, type PrintableDocument } from './printDocument'
import { PrintSettingsModal } from './PrintSettingsModal'

export function PrintDocumentButton({ doc, variant = 'button', size = 'md', className, hotkey }: { doc: PrintableDocument; variant?: 'button' | 'icon'; size?: 'sm' | 'md'; className?: string; hotkey?: string }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [settings, setSettings] = useState(false)
  const run = async (force?: 'service' | 'browser') => {
    setBusy(true)
    try { await printDocument(doc, t, force) } catch { /* reported by printDocument */ } finally { setBusy(false) }
  }
  const P = 'staff.reception.printing'
  const items = [
    { key: 'service', label: t(`${P}.viaServiceA4`), icon: <Printer />, onSelect: () => void run('service') },
    { key: 'browser', label: t(`${P}.viaBrowserPdf`), icon: <Globe />, onSelect: () => void run('browser') },
    { key: 'settings', label: t(`${P}.settings`), icon: <Settings2 />, onSelect: () => setSettings(true), separatorBefore: true },
  ]
  return (
    <>
      {variant === 'icon' ? (
        <Menu align="end" className={className} trigger={() => <IconButton label={t(`${P}.printResult`)} size={size} data-hotkey={hotkey} onClick={undefined}><Printer /></IconButton>}
          items={[{ key: 'auto', label: t(`${P}.printResult`), icon: <Printer />, onSelect: () => void run() }, ...items]} />
      ) : (
        <span className={className ? `inline-flex items-center gap-1 ${className}` : 'inline-flex items-center gap-1'}>
          <Button variant="secondary" size={size} data-hotkey={hotkey} leftIcon={<Printer className="size-4" />} loading={busy} onClick={() => void run()}>{t(`${P}.printResult`)}</Button>
          <Menu align="end" trigger={() => <Button variant="secondary" size={size} className="px-2" aria-label={t(`${P}.printResult`)}><ChevronDown className="size-4" /></Button>} items={items} />
        </span>
      )}
      <PrintSettingsModal open={settings} onClose={() => setSettings(false)} />
    </>
  )
}
