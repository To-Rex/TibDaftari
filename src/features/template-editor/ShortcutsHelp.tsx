import { useTranslation } from 'react-i18next'
import { Keyboard } from 'lucide-react'
import { IconButton, Kbd, Modal } from '@/shared/ui'
import { useState } from 'react'

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ['Ctrl', 'S'], label: 'save' },
  { keys: ['Ctrl', 'Z'], label: 'undo' },
  { keys: ['Ctrl', 'Y'], label: 'redo' },
  { keys: ['Ctrl', 'D'], label: 'duplicate' },
  { keys: ['Ctrl', 'C'], label: 'copy' },
  { keys: ['Ctrl', 'V'], label: 'paste' },
  { keys: ['Ctrl', 'A'], label: 'selectAll' },
  { keys: ['Del'], label: 'delete' },
  { keys: ['←↑→↓'], label: 'nudge' },
  { keys: ['Shift', '←↑→↓'], label: 'nudge10' },
  { keys: ['Shift', 'Click'], label: 'multiSelect' },
  { keys: ['Alt', 'Drag'], label: 'noSnap' },
  { keys: ['Shift', 'Resize'], label: 'keepRatio' },
  { keys: ['[', ']'], label: 'zOrder' },
  { keys: ['L'], label: 'lock' },
  { keys: ['H'], label: 'hide' },
  { keys: ['Ctrl', 'G'], label: 'grid' },
  { keys: ['Ctrl', '+ / −'], label: 'zoom' },
  { keys: ['Esc'], label: 'deselect' },
  { keys: ['Dbl-click'], label: 'editText' },
]

export function ShortcutsHelp() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton label={t('catalog.editor.shortcuts')} size="sm" onClick={() => setOpen(true)}><Keyboard /></IconButton>
      <Modal open={open} onClose={() => setOpen(false)} title={t('catalog.editor.shortcuts')} size="md">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {ROWS.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 h-8 text-[13px]">
              <span className="text-ink-2">{t(`catalog.editor.sc.${r.label}`)}</span>
              <span className="flex items-center gap-1">{r.keys.map((k, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-ink-3">+</span>}<Kbd>{k}</Kbd></span>)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
