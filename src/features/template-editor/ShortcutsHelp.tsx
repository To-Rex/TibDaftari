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

/** The shortcuts modal alone — used by the top-bar overflow menu on small screens. */
export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} title={t('catalog.editor.shortcuts')} size="md">
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {ROWS.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 min-h-8 text-[13px]">
            <span className="text-ink-2 min-w-0">{t(`catalog.editor.sc.${r.label}`)}</span>
            <span className="flex items-center gap-1 shrink-0">{r.keys.map((k, i) => <span key={i} className="flex items-center gap-1">{i > 0 && <span className="text-ink-3">+</span>}<Kbd>{k}</Kbd></span>)}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function ShortcutsHelp({ className }: { className?: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <>
      <IconButton label={t('catalog.editor.shortcuts')} size="sm" onClick={() => setOpen(true)} className={className}><Keyboard /></IconButton>
      <ShortcutsModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
