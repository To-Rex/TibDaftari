import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { ArrowDown, ArrowUp, Eye, EyeOff, Lock, Unlock } from 'lucide-react'
import type { TemplateElement } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { ELEMENT_ICONS, elementLabel } from './elementDefaults'
import { useEditorStore } from './useEditorStore'

/** Z-ordered list of elements (top = front). */
export function LayersPanel() {
  const { t } = useTranslation()
  const { elements, selectedIds } = useEditorStore(useShallow((s) => ({ elements: s.doc.elements, selectedIds: s.selectedIds })))
  const list = [...elements].reverse()
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('catalog.editor.layers')}</h3>
        <span className="text-[11.5px] tabular text-ink-3">{elements.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5 pb-2">
        {list.length === 0 && <p className="px-2 py-4 text-[12.5px] text-ink-3">{t('catalog.editor.noLayers')}</p>}
        {list.map((el, i) => <LayerRow key={el.id} el={el} selected={selectedIds.includes(el.id)} isTop={i === 0} isBottom={i === list.length - 1} />)}
      </div>
    </div>
  )
}

const LayerRow = memo(function LayerRow({ el, selected, isTop, isBottom }: { el: TemplateElement; selected: boolean; isTop: boolean; isBottom: boolean }) {
  const { t } = useTranslation()
  const { select, toggleSelect, patchElements, reorder } = useEditorStore.getState()
  const I = ELEMENT_ICONS[el.type]
  const ib = 'grid size-6 place-items-center rounded text-ink-3 hover:bg-surface-3 hover:text-ink [&>svg]:size-3.5 disabled:opacity-30'
  return (
    <div
      onClick={(e) => (e.shiftKey ? toggleSelect(el.id) : select([el.id]))}
      className={cn('group flex items-center gap-2 h-8 px-2 rounded-lg text-[12.5px] cursor-pointer transition-colors', selected ? 'bg-brand-soft text-brand-ink' : 'hover:bg-surface-2', el.hidden && 'opacity-50')}
    >
      <I className="size-3.5 shrink-0" />
      <span className="truncate flex-1">{elementLabel(el)}</span>
      <span className="hidden group-hover:flex items-center" onClick={(e) => e.stopPropagation()}>
        <button className={ib} disabled={isTop} onClick={() => reorder(el.id, 'up')} title={t('catalog.editor.bringForward')}><ArrowUp /></button>
        <button className={ib} disabled={isBottom} onClick={() => reorder(el.id, 'down')} title={t('catalog.editor.sendBackward')}><ArrowDown /></button>
      </span>
      <span className={cn('flex items-center', !(el.hidden || el.locked) && 'opacity-0 group-hover:opacity-100')} onClick={(e) => e.stopPropagation()}>
        <button className={ib} onClick={() => patchElements([el.id], (x) => ({ ...x, hidden: !x.hidden }))} title={t('catalog.editor.hidden')}>{el.hidden ? <EyeOff /> : <Eye />}</button>
        <button className={ib} onClick={() => patchElements([el.id], (x) => ({ ...x, locked: !x.locked }))} title={t('catalog.editor.locked')}>{el.locked ? <Lock /> : <Unlock />}</button>
      </span>
    </div>
  )
})
