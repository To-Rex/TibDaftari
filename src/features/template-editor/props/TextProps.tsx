import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Braces } from 'lucide-react'
import type { AttributeSchema, TextElement } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { inputBase } from '@/shared/ui'
import { PlaceholderPalette } from '../PlaceholderPalette'
import { useEditorStore } from '../useEditorStore'
import { NumInput, PropRow, PropSection } from './inputs'
import { TextStyleFields } from './TextStyleFields'

export function TextProps({ el, schema }: { el: TextElement; schema: AttributeSchema | null }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const set = (p: Partial<TextElement>) => patch([el.id], (e) => ({ ...e, ...p }) as TextElement)
  const insert = (key: string) => {
    const ta = ref.current
    const token = `{${key}}`
    const start = ta?.selectionStart ?? el.text.length
    const end = ta?.selectionEnd ?? el.text.length
    const next = el.text.slice(0, start) + token + el.text.slice(end)
    set({ text: next })
    setOpen(false)
    requestAnimationFrame(() => { ta?.focus(); ta?.setSelectionRange(start + token.length, start + token.length) })
  }
  return (
    <>
      <PropSection title={t('catalog.editor.text')}>
        <div className="relative">
          <textarea ref={ref} value={el.text} onChange={(e) => set({ text: e.target.value })} rows={4} spellCheck={false}
            className={cn(inputBase, 'h-auto min-h-[88px] py-2 text-[13px] leading-relaxed resize-y font-mono')} />
          <button type="button" onClick={() => setOpen((o) => !o)} className={cn('absolute right-1.5 bottom-1.5 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] border transition-colors', open ? 'bg-brand-soft border-brand/40 text-brand-ink' : 'bg-surface border-line text-ink-2 hover:bg-surface-2')}>
            <Braces className="size-3.5" />{t('catalog.editor.insertPlaceholder')}
          </button>
        </div>
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 260 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
              <PlaceholderPalette schema={schema} onInsert={insert} compact />
            </motion.div>
          )}
        </AnimatePresence>
        <PropRow label={t('catalog.editor.padding')}><NumInput value={el.padding ?? 0} min={0} max={80} onChange={(v) => set({ padding: v || undefined })} suffix="px" /></PropRow>
      </PropSection>
      <PropSection title={t('catalog.editor.style')}>
        <TextStyleFields value={el.style} onChange={(style) => set({ style })} />
      </PropSection>
    </>
  )
}
