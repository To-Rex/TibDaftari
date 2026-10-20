import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, TriangleAlert } from 'lucide-react'
import type { TemplateDoc } from '@/domain'
import { Badge, Button, EmptyState, Modal } from '@/shared/ui'
import { transliterateDoc } from './transliterate'

export function LatinizeModal({ open, onClose, doc, onApply }: {
  open: boolean
  onClose: () => void
  doc: TemplateDoc
  onApply: (doc: TemplateDoc) => void
}) {
  const { t } = useTranslation()
  // do the (cloned) conversion only while the dialog is open — the editor is rendered with this modal all the time
  const result = useMemo(() => (open ? transliterateDoc(doc) : null), [open, doc])
  const changes = result?.changes ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('catalog.editor.latinizeTitle')}
      description={t('catalog.editor.latinizeHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button leftIcon={<Languages className="size-4" />} disabled={!changes.length} onClick={() => result && onApply(result.doc)}>
            {t('catalog.editor.latinizeApply')}
          </Button>
        </>
      }
    >
      {changes.length === 0 ? (
        <EmptyState icon={<Languages />} title={t('catalog.editor.latinizeEmpty')} description={t('catalog.editor.latinizeEmptyHint')} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Badge tone="brand" dot>{t('catalog.editor.latinizeCount', { n: changes.length })}</Badge>
            <span className="text-[12px] text-ink-3">{t('catalog.editor.latinizePreserved')}</span>
          </div>

          <ul className="max-h-[48vh] divide-y divide-line/70 overflow-y-auto rounded-[var(--radius)] border border-line" data-latinize-changes>
            {changes.map((change, i) => (
              <li key={`${change.where}-${i}`} className="px-3 py-3">
                <p className="mb-2 truncate font-mono text-[11px] text-ink-3">{change.where}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">{t('catalog.editor.latinizeBefore')}</p>
                    <p data-latinize-before className="whitespace-pre-wrap break-words rounded-md border border-line/60 bg-surface-2/50 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink-2">{change.before}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-ink">{t('catalog.editor.latinizeAfter')}</p>
                    <p data-latinize-after className="whitespace-pre-wrap break-words rounded-md border border-brand/20 bg-brand-soft/40 px-2.5 py-1.5 text-[12.5px] leading-relaxed text-ink">{change.after}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 rounded-[var(--radius)] border border-warn/30 bg-warn-soft/40 px-3 py-2 text-[12px] leading-relaxed text-ink-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>{t('catalog.editor.latinizeNote')}</span>
          </p>
          <p className="text-[11.5px] text-ink-3">{t('catalog.editor.latinizeScope')}</p>
        </div>
      )}
    </Modal>
  )
}
