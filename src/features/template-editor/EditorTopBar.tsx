import { useTranslation } from 'react-i18next'
import { useShallow } from 'zustand/react/shallow'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, CheckCircle2, Eye, Link2, Pencil, Printer, Redo2, Save, Undo2 } from 'lucide-react'
import type { ServiceType } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Badge, Button, IconButton, Select, Tooltip } from '@/shared/ui'
import { ShortcutsHelp } from './ShortcutsHelp'
import { useEditorStore, useIsDirty } from './useEditorStore'

const TONE = { draft: 'warn', active: 'ok', archived: 'neutral' } as const

export function EditorTopBar({ serviceTypes, canWrite, canPublish, saving, onBack, onSave, onActivate, onBindings, onPrint }: {
  serviceTypes: ServiceType[]; canWrite: boolean; canPublish: boolean; saving: boolean
  onBack: () => void; onSave: () => void; onActivate: () => void; onBindings: () => void; onPrint: () => void
}) {
  const { t } = useTranslation()
  const { template, meta, preview, previewServiceTypeId, canUndo, canRedo } = useEditorStore(useShallow((s) => ({ template: s.template, meta: s.meta, preview: s.preview, previewServiceTypeId: s.previewServiceTypeId, canUndo: s.past.length > 0, canRedo: s.future.length > 0 })))
  const { setMeta, setPreview, setPreviewServiceType, undo, redo } = useEditorStore.getState()
  const dirty = useIsDirty()
  if (!template) return null
  const boundSts = meta.serviceTypeIds.map((id) => serviceTypes.find((s) => s.id === id)).filter(Boolean) as ServiceType[]
  const previewOptions = boundSts.length ? boundSts : serviceTypes.filter((s) => s.schemaId)

  return (
    <div className="h-14 shrink-0 flex items-center gap-2 px-3 border-b border-line bg-surface">
      <IconButton label={t('common.back')} size="sm" onClick={onBack}><ArrowLeft /></IconButton>
      <div className="flex items-center gap-2 min-w-0">
        <input value={meta.name} onChange={(e) => setMeta({ name: e.target.value })} readOnly={!canWrite}
          className="bg-transparent text-[15px] font-semibold outline-none rounded-md px-1.5 h-8 min-w-[120px] w-[min(40vw,320px)] hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-brand/30 transition-colors truncate" />
        <Badge tone={TONE[template.status]} dot size="sm">{t(`catalog.templates.status.${template.status}`)}</Badge>
        <Badge size="sm">v{template.version}</Badge>
        <AnimatePresence>{dirty && <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><span className="inline-flex items-center gap-1 text-[12px] text-warn"><span className="size-1.5 rounded-full bg-warn" />{t('common.unsaved')}</span></motion.span>}</AnimatePresence>
      </div>

      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-1.5">
        <span className="text-[12px] text-ink-3">{t('catalog.editor.previewAs')}</span>
        <Select value={previewServiceTypeId ?? ''} onChange={(e) => setPreviewServiceType(e.target.value || null)} className="h-8 text-[12.5px] w-52 py-0">
          <option value="">{t('catalog.editor.noSchema')}</option>
          {previewOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>
      <div className="w-px h-6 bg-line mx-1 hidden md:block" />
      <Tooltip label={`${t('catalog.editor.undo')} (Ctrl+Z)`} side="bottom"><IconButton label={t('catalog.editor.undo')} size="sm" onClick={undo} disabled={!canUndo}><Undo2 /></IconButton></Tooltip>
      <Tooltip label={`${t('catalog.editor.redo')} (Ctrl+Y)`} side="bottom"><IconButton label={t('catalog.editor.redo')} size="sm" onClick={redo} disabled={!canRedo}><Redo2 /></IconButton></Tooltip>
      <ShortcutsHelp />
      <Tooltip label={t('common.print')} side="bottom"><IconButton label={t('common.print')} size="sm" onClick={onPrint}><Printer /></IconButton></Tooltip>
      <Button size="sm" variant="ghost" leftIcon={<Link2 className="size-4" />} onClick={onBindings}>{t('catalog.editor.bindings')}</Button>
      <Button size="sm" variant={preview ? 'soft' : 'ghost'} leftIcon={preview ? <Pencil className="size-4" /> : <Eye className="size-4" />} onClick={() => setPreview(!preview)} className={cn(preview && 'ring-1 ring-brand/30')}>{preview ? t('common.edit') : t('common.preview')}</Button>
      {canWrite && <Button size="sm" variant="secondary" leftIcon={<Save className="size-4" />} loading={saving} disabled={!dirty} onClick={onSave}>{t('common.save')}</Button>}
      {canPublish && template.status !== 'active' && <Button size="sm" leftIcon={<CheckCircle2 className="size-4" />} onClick={onActivate}>{t('catalog.templates.activate')}</Button>}
    </div>
  )
}
