import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { AlignHorizontalJustifyCenter, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, AlignStartHorizontal, AlignEndHorizontal } from 'lucide-react'
import type { AttributeSchema, Orientation, PaperSize, TemplateAsset, TemplateElement } from '@/domain'
import { PAPER_PX } from '@/domain'
import { Badge } from '@/shared/ui'
import { ELEMENT_ICONS } from './elementDefaults'
import { boundingRect } from './geometry'
import { useEditorStore, useSelectedElements } from './useEditorStore'
import { CommonProps } from './props/CommonProps'
import { FieldProps } from './props/FieldProps'
import { ColorInput, NumInput, PropRow, PropSection, SelectInput, ToggleChip } from './props/inputs'
import { ImageProps, LineProps, RectProps } from './props/ShapeProps'
import { TableProps } from './props/TableProps'
import { TextProps } from './props/TextProps'

export function PropertiesPanel({ schema, assets, onPickImage }: { schema: AttributeSchema | null; assets: TemplateAsset[]; onPickImage: () => void }) {
  const { t } = useTranslation()
  const selected = useSelectedElements()
  const el = selected.length === 1 ? selected[0] : undefined
  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={el?.id ?? (selected.length ? 'multi' : 'doc')} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.16 }}>
          {el ? <ElementProps el={el} schema={schema} assets={assets} onPickImage={onPickImage} /> : selected.length > 1 ? <MultiProps els={selected} /> : <DocProps />}
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">{t('catalog.editor.properties')}</span>
    </div>
  )
}

function ElementProps({ el, schema, assets, onPickImage }: { el: TemplateElement; schema: AttributeSchema | null; assets: TemplateAsset[]; onPickImage: () => void }) {
  const { t } = useTranslation()
  const I = ELEMENT_ICONS[el.type]
  return (
    <>
      <div className="px-3 h-11 flex items-center gap-2 border-b border-line">
        <span className="grid size-7 place-items-center rounded-md bg-brand-soft text-brand-ink"><I className="size-4" /></span>
        <span className="text-[13px] font-semibold">{t(`catalog.editor.el.${el.type}`)}</span>
        {el.locked && <Badge size="sm">{t('catalog.editor.locked')}</Badge>}
      </div>
      {el.type === 'text' && <TextProps el={el} schema={schema} />}
      {el.type === 'field' && <FieldProps el={el} schema={schema} />}
      {(el.type === 'rect' || el.type === 'ellipse') && <RectProps el={el} />}
      {el.type === 'line' && <LineProps el={el} />}
      {el.type === 'image' && <ImageProps el={el} onPick={onPickImage} assetName={assets.find((a) => a.id === el.assetId)?.name} />}
      {el.type === 'table' && <TableProps el={el} schema={schema} />}
      <CommonProps el={el} schema={schema} />
    </>
  )
}

function MultiProps({ els }: { els: TemplateElement[] }) {
  const { t } = useTranslation()
  const patch = useEditorStore((s) => s.patchElements)
  const ids = els.map((e) => e.id)
  const b = boundingRect(els)
  const align = (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => patch(ids, (e) => {
    switch (how) {
      case 'left': return { ...e, x: b.x }
      case 'hcenter': return { ...e, x: Math.round(b.x + b.w / 2 - e.w / 2) }
      case 'right': return { ...e, x: b.x + b.w - e.w }
      case 'top': return { ...e, y: b.y }
      case 'vcenter': return { ...e, y: Math.round(b.y + b.h / 2 - e.h / 2) }
      case 'bottom': return { ...e, y: b.y + b.h - e.h }
    }
  })
  return (
    <>
      <div className="px-3 h-11 flex items-center gap-2 border-b border-line"><span className="text-[13px] font-semibold">{t('catalog.editor.nSelected', { n: els.length })}</span></div>
      <PropSection title={t('catalog.editor.alignment')}>
        <PropRow label={t('catalog.editor.horizontal')}>
          <ToggleChip active={false} onClick={() => align('left')}><AlignStartVertical /></ToggleChip>
          <ToggleChip active={false} onClick={() => align('hcenter')}><AlignHorizontalJustifyCenter /></ToggleChip>
          <ToggleChip active={false} onClick={() => align('right')}><AlignEndVertical /></ToggleChip>
        </PropRow>
        <PropRow label={t('catalog.editor.vertical')}>
          <ToggleChip active={false} onClick={() => align('top')}><AlignStartHorizontal /></ToggleChip>
          <ToggleChip active={false} onClick={() => align('vcenter')}><AlignVerticalJustifyCenter /></ToggleChip>
          <ToggleChip active={false} onClick={() => align('bottom')}><AlignEndHorizontal /></ToggleChip>
        </PropRow>
        <PropRow label={t('catalog.editor.state')}>
          <button className="h-8 px-2.5 rounded-md border border-line text-[12px] hover:bg-surface-2" onClick={() => patch(ids, (e) => ({ ...e, locked: true }))}>{t('catalog.editor.lockAll')}</button>
          <button className="h-8 px-2.5 rounded-md border border-line text-[12px] hover:bg-surface-2" onClick={() => patch(ids, (e) => ({ ...e, locked: undefined }))}>{t('catalog.editor.unlockAll')}</button>
        </PropRow>
      </PropSection>
    </>
  )
}

function DocProps() {
  const { t } = useTranslation()
  const doc = useEditorStore((s) => s.doc)
  const setDocProps = useEditorStore((s) => s.setDocProps)
  return (
    <>
      <div className="px-3 h-11 flex items-center gap-2 border-b border-line"><span className="text-[13px] font-semibold">{t('catalog.editor.document')}</span></div>
      <PropSection title={t('catalog.editor.page')}>
        <PropRow label={t('catalog.editor.paper')}>
          <SelectInput value={doc.paper} onChange={(v: PaperSize) => setDocProps({ paper: v })} options={(Object.keys(PAPER_PX) as PaperSize[]).map((p) => ({ value: p, label: `${p} · ${PAPER_PX[p].w}×${PAPER_PX[p].h}` }))} />
        </PropRow>
        <PropRow label={t('catalog.editor.orientation')}>
          <SelectInput value={doc.orientation} onChange={(v: Orientation) => setDocProps({ orientation: v })} options={[{ value: 'portrait', label: t('catalog.editor.portrait') }, { value: 'landscape', label: t('catalog.editor.landscape') }]} />
        </PropRow>
        <PropRow label={t('catalog.editor.margin')}><NumInput value={doc.margin} min={0} max={200} onChange={(v) => setDocProps({ margin: v })} suffix="px" /></PropRow>
        <PropRow label={t('catalog.editor.background')}><ColorInput value={doc.background} onChange={(v) => setDocProps({ background: v ?? '#ffffff' })} /></PropRow>
      </PropSection>
      <div className="p-3 text-[12px] text-ink-3 leading-relaxed">{t('catalog.editor.docHint')}</div>
    </>
  )
}
