import { useTranslation } from 'react-i18next'
import { Keyboard } from 'lucide-react'
import { Button, Kbd, Modal } from '@/shared/ui'

const K = 'staff.reception.shortcuts'

/** Keyboard reference for the front desk — page shortcuts and the patient-form flow. */
export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const groups: { title: string; rows: { keys: string[]; text: string }[] }[] = [
    { title: t(`${K}.groupPage`), rows: [
      { keys: ['/'], text: t(`${K}.search`) },
      { keys: ['↑', '↓', 'Enter'], text: t(`${K}.pick`) },
      { keys: ['N'], text: t(`${K}.newPatient`) },
      { keys: ['C'], text: t(`${K}.newOrder`) },
      { keys: ['?'], text: t(`${K}.help`) },
    ] },
    { title: t(`${K}.groupForm`), rows: [
      { keys: ['Enter'], text: t(`${K}.next`) },
      { keys: ['Ctrl', 'Enter'], text: t(`${K}.submit`) },
      { keys: ['←', '→'], text: t(`${K}.gender`) },
      { keys: ['Esc'], text: t(`${K}.close`) },
      { keys: ['⟶'], text: t(`${K}.auto`) },
    ] },
  ]
  return (
    <Modal open={open} onClose={onClose} title={t(`${K}.title`)} size="md" footer={<Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>}>
      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-3">{g.title}</h3>
            <ul className="divide-y divide-line/70 rounded-[var(--radius)] border border-line">
              {g.rows.map((r) => (
                <li key={r.text} className="flex items-center gap-3 px-3 py-2 text-[13.5px]">
                  <span className="flex w-36 shrink-0 flex-wrap items-center gap-1">{r.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</span>
                  <span className="text-ink-2">{r.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}

export function ShortcutsButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return <Button variant="ghost" size="sm" leftIcon={<Keyboard className="size-4" />} onClick={onClick} className="max-md:hidden">{t(`${K}.button`)}</Button>
}
