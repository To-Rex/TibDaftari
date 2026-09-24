import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard } from 'lucide-react'
import { Button, IconButton, Kbd, Modal } from '@/shared/ui'
import { hasPagination, pageHotkeys, type NavHotkey } from './useGlobalHotkeys'

const K = 'common.hotkeys'
type Row = { keys: string[]; text: string }

/** Keyboard reference: global keys, "G + letter" navigation, this page's actions (read from the DOM), form flow. */
export function HotkeysHelp({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: NavHotkey[] }) {
  const { t } = useTranslation()
  // discovered when the dialog opens — actions differ per page
  const page = useMemo(() => (open ? { actions: pageHotkeys(), pagination: hasPagination() } : { actions: [], pagination: false }), [open])
  const groups: { title: string; rows: Row[] }[] = [
    { title: t(`${K}.groupGlobal`), rows: [
      { keys: ['?'], text: t(`${K}.help`) },
      { keys: ['/'], text: t(`${K}.search`) },
      { keys: ['Esc'], text: t(`${K}.close`) },
      ...(page.pagination ? [{ keys: ['[', ']'], text: t(`${K}.pages`) }] : []),
    ] },
    { title: t(`${K}.groupNav`), rows: nav.map((n) => ({ keys: ['G', n.key.toUpperCase()], text: n.label })) },
    { title: t(`${K}.groupPage`), rows: page.actions.map((a) => ({ keys: [a.key.toUpperCase()], text: a.label })) },
    { title: t(`${K}.groupForm`), rows: [
      { keys: ['Enter'], text: t(`${K}.next`) },
      { keys: ['Ctrl', 'Enter'], text: t(`${K}.submit`) },
      { keys: ['←', '→'], text: t(`${K}.tiles`) },
      { keys: ['⟶'], text: t(`${K}.auto`) },
    ] },
  ]
  return (
    <Modal open={open} onClose={onClose} title={t(`${K}.title`)} size="lg" footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="grid gap-5 sm:grid-cols-2">
        {groups.map((g) => (
          <section key={g.title} className="min-w-0">
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{g.title}</h3>
            {g.rows.length === 0 ? (
              <p className="rounded-[var(--radius)] border border-dashed border-line px-3 py-2 text-[13px] text-ink-3">{t(`${K}.none`)}</p>
            ) : (
              <ul className="divide-y divide-line/70 rounded-[var(--radius)] border border-line">
                {g.rows.map((r) => (
                  <li key={r.text + r.keys.join()} className="flex items-start gap-3 px-3 py-1.5 text-[13px]">
                    <span className="flex w-24 shrink-0 flex-wrap items-center gap-1 pt-0.5">{r.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                    <span className="min-w-0 break-words text-ink-2">{r.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Modal>
  )
}

export function HotkeysButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return <IconButton label={t(`${K}.button`)} onClick={onClick} className="max-sm:hidden"><Keyboard /></IconButton>
}
