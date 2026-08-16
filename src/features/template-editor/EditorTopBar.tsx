import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, Eye, Keyboard, Link2, MoreHorizontal, Pencil, Printer, Redo2, Save, Undo2 } from 'lucide-react'
import type { ServiceType } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { Badge, Button, IconButton, Menu, Select, Tooltip } from '@/shared/ui'
import { ShortcutsHelp, ShortcutsModal } from './ShortcutsHelp'
import { useEditorStore, useIsDirty } from './useEditorStore'

const TONE = { draft: 'warn', active: 'ok', archived: 'neutral' } as const

/** "Preview as" service-type selector (in the top bar on ≥xl, inside the panels sheet on smaller screens). */
export function PreviewAsSelect({ serviceTypes, className, showLabel = true }: { serviceTypes: ServiceType[]; className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const { meta, previewServiceTypeId } = useEditorStore(useShallow((s) => ({ meta: s.meta, previewServiceTypeId: s.previewServiceTypeId })))
  const setPreviewServiceType = useEditorStore((s) => s.setPreviewServiceType)
  const boundSts = meta.serviceTypeIds.map((id) => serviceTypes.find((s) => s.id === id)).filter(Boolean) as ServiceType[]
  const previewOptions = boundSts.length ? boundSts : serviceTypes.filter((s) => s.schemaId)
  return (
    <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
      {showLabel && <span className="text-[12px] text-ink-3 whitespace-nowrap">{t('catalog.editor.previewAs')}</span>}
      <Select value={previewServiceTypeId ?? ''} onChange={(e) => setPreviewServiceType(e.target.value || null)} className="h-8 text-[12.5px] w-full min-w-0 py-0">
        <option value="">{t('catalog.editor.noSchema')}</option>
        {previewOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </div>
  )
}

/**
 * Top bar. ≥2xl: everything inline. xl–2xl: bindings/print/shortcuts move into an overflow menu.
 * <xl: only back · name · save · overflow (undo/redo live in the tool strip; preview/activate/bindings/print in the menu).
 */
export function EditorTopBar({ serviceTypes, canWrite, canPublish, saving, onBack, onSave, onActivate, onBindings, onPrint }: {
  serviceTypes: ServiceType[]; canWrite: boolean; canPublish: boolean; saving: boolean
  onBack: () => void; onSave: () => void; onActivate: () => void; onBindings: () => void; onPrint: () => void
}) {
  const { t } = useTranslation()
  const { template, meta, preview, canUndo, canRedo } = useEditorStore(useShallow((s) => ({ template: s.template, meta: s.meta, preview: s.preview, canUndo: s.past.length > 0, canRedo: s.future.length > 0 })))
  const { setMeta, setPreview, undo, redo } = useEditorStore.getState()
  const dirty = useIsDirty()
  const lg = useMediaQuery('(min-width: 1280px)') // inline editor layout (3 panes)
  const xl = useMediaQuery('(min-width: 1536px)') // room for every action inline
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  if (!template) return null

  const canActivate = canPublish && template.status !== 'active'
  const overflow = [
    ...(!lg ? [
      { key: 'preview', label: preview ? t('common.edit') : t('common.preview'), icon: preview ? <Pencil /> : <Eye />, onSelect: () => setPreview(!preview) },
      ...(canActivate ? [{ key: 'activate', label: t('catalog.templates.activate'), icon: <CheckCircle2 />, onSelect: onActivate }] : []),
    ] : []),
    { key: 'bindings', label: t('catalog.editor.bindings'), icon: <Link2 />, onSelect: onBindings, separatorBefore: !lg },
    { key: 'print', label: t('common.print'), icon: <Printer />, onSelect: onPrint },
    { key: 'shortcuts', label: t('catalog.editor.shortcuts'), icon: <Keyboard />, onSelect: () => setShortcutsOpen(true) },
  ]

  return (
    <div className="h-14 shrink-0 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 border-b border-line bg-surface">
      <IconButton label={t('common.back')} size="sm" onClick={onBack} className="shrink-0"><ArrowLeft /></IconButton>
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 xl:flex-initial">
        <input value={meta.name} onChange={(e) => setMeta({ name: e.target.value })} readOnly={!canWrite}
          className="bg-transparent text-[14px] sm:text-[15px] font-semibold outline-none rounded-md px-1.5 h-8 min-w-0 flex-1 xl:flex-none xl:w-[min(16vw,320px)] 2xl:w-[min(24vw,320px)] hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-brand/30 transition-colors truncate" />
        <Badge tone={TONE[template.status]} dot size="sm" className="max-xs:hidden shrink-0">{t(`catalog.templates.status.${template.status}`)}</Badge>
        <Badge size="sm" className="hidden md:inline-flex xl:hidden 2xl:inline-flex shrink-0">v{template.version}</Badge>
        <AnimatePresence>{dirty && <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="shrink-0"><span className="inline-flex items-center gap-1 text-[12px] text-warn"><span className="size-1.5 rounded-full bg-warn" /><span className="hidden sm:inline">{t('common.unsaved')}</span></span></motion.span>}</AnimatePresence>
      </div>

      <div className="hidden xl:block flex-1" />

      {lg && (
        <>
          <PreviewAsSelect serviceTypes={serviceTypes} showLabel={xl} className="w-40 2xl:w-64" />
          <div className="w-px h-6 bg-line mx-1" />
          <Tooltip label={`${t('catalog.editor.undo')} (Ctrl+Z)`} side="bottom"><IconButton label={t('catalog.editor.undo')} size="sm" onClick={undo} disabled={!canUndo}><Undo2 /></IconButton></Tooltip>
          <Tooltip label={`${t('catalog.editor.redo')} (Ctrl+Y)`} side="bottom"><IconButton label={t('catalog.editor.redo')} size="sm" onClick={redo} disabled={!canRedo}><Redo2 /></IconButton></Tooltip>
          {xl && (
            <>
              <ShortcutsHelp />
              <Tooltip label={t('common.print')} side="bottom"><IconButton label={t('common.print')} size="sm" onClick={onPrint}><Printer /></IconButton></Tooltip>
              <Button size="sm" variant="ghost" leftIcon={<Link2 className="size-4" />} onClick={onBindings}>{t('catalog.editor.bindings')}</Button>
            </>
          )}
          <Button size="sm" variant={preview ? 'soft' : 'ghost'} leftIcon={preview ? <Pencil className="size-4" /> : <Eye className="size-4" />} onClick={() => setPreview(!preview)} className={cn(preview && 'ring-1 ring-brand/30')}>{preview ? t('common.edit') : t('common.preview')}</Button>
          {canWrite && <Button size="sm" variant="secondary" leftIcon={<Save className="size-4" />} loading={saving} disabled={!dirty} onClick={onSave}>{t('common.save')}</Button>}
          {canActivate && <Button size="sm" leftIcon={<CheckCircle2 className="size-4" />} onClick={onActivate}>{t('catalog.templates.activate')}</Button>}
        </>
      )}
      {!lg && canWrite && (
        <Button size="sm" variant="secondary" leftIcon={<Save className="size-4" />} loading={saving} disabled={!dirty} onClick={onSave} className="shrink-0 max-sm:px-2.5" aria-label={t('common.save')}>
          <span className="hidden sm:inline">{t('common.save')}</span>
        </Button>
      )}
      {!xl && (
        <Menu align="end" trigger={() => <span className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink" title={t('common.actions')}><MoreHorizontal className="size-[18px]" /></span>} items={overflow} className="shrink-0" />
      )}
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}
