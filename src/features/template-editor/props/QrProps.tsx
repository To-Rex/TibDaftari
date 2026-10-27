import { useTranslation } from 'react-i18next'
import type { QrElement } from '@/domain'
import { useEditorStore } from '../useEditorStore'
import { ColorInput, PropRow, PropSection, TextInput } from './inputs'

/** QR code props: what it encodes (a template expression, default {doc.link}) and its colours. */
export function QrProps({ el }: { el: QrElement }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const set = (p: Partial<QrElement>) => patch([el.id], (e) => ({ ...e, ...p }) as QrElement)
  return (
    <PropSection title={t('catalog.editor.qr')}>
      <PropRow label={t('catalog.editor.qrValue')}>
        <TextInput value={el.value ?? '{doc.link}'} mono placeholder="{doc.link}" onChange={(v) => set({ value: v || undefined })} />
      </PropRow>
      <PropRow label={t('catalog.editor.qrValueHint')}>
        <span className="text-[11.5px] text-ink-3 leading-snug">&#123;doc.link&#125; — hujjat tekshiruv havolasi</span>
      </PropRow>
      <PropRow label={t('catalog.editor.fill')}>
        <ColorInput value={el.dark} onChange={(v) => set({ dark: v })} />
      </PropRow>
      <PropRow label={t('catalog.editor.qrLight')}>
        <ColorInput value={el.light} onChange={(v) => set({ light: v })} />
      </PropRow>
    </PropSection>
  )
}
