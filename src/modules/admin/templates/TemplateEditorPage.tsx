import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Braces, Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { TemplateAsset } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { useCategories, useSaveTemplate, useServiceTypes, useTemplate, useTemplateStatus } from '@/features/catalog/queries'
import { useLeavePrompt } from '@/features/schema-editor/useLeavePrompt'
import { AssetPickerModal } from '@/features/template-editor/AssetPickerModal'
import { BindingsFields, type Bindings } from '@/features/template-editor/BindingsFields'
import { EditorCanvas } from '@/features/template-editor/EditorCanvas'
import { EditorTopBar, PreviewAsSelect } from '@/features/template-editor/EditorTopBar'
import { buildTemplateFile, downloadTemplateFile } from '@/features/template-editor/transfer'
import { LayersPanel } from '@/features/template-editor/LayersPanel'
import { PlaceholderPalette } from '@/features/template-editor/PlaceholderPalette'
import { PrintPortal } from '@/features/template-editor/PrintPortal'
import { PropertiesPanel } from '@/features/template-editor/PropertiesPanel'
import { Toolbar } from '@/features/template-editor/Toolbar'
import { createElement } from '@/features/template-editor/elementDefaults'
import { useAutosaveDraft } from '@/features/template-editor/useAutosaveDraft'
import { useEditorShortcuts } from '@/features/template-editor/useEditorShortcuts'
import { useEditorStore, useIsDirty } from '@/features/template-editor/useEditorStore'
import { useTemplateSchema } from '@/features/template-editor/useTemplateSchema'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { storage } from '@/shared/lib/storage'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { Button, ConfirmDialog, Drawer, EmptyState, Modal, Skeleton, Tabs, toast } from '@/shared/ui'

export default function TemplateEditorPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { templateId } = useParams()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.template.write')
  const canPublish = can('admin.template.publish')

  const tplQ = useTemplate(templateId)
  const serviceTypes = useServiceTypes(companyId, {})
  const categories = useCategories(companyId)
  const save = useSaveTemplate(companyId)
  const setStatus = useTemplateStatus()

  const loaded = useEditorStore((s) => s.template?.id)
  const previewStId = useEditorStore((s) => s.previewServiceTypeId)
  const doc = useEditorStore((s) => s.doc)
  const preview = useEditorStore((s) => s.preview)
  const dirty = useIsDirty()
  const { schema, ctx, assets, services } = useTemplateSchema(previewStId, companyId)

  // load into store when template arrives (once per id)
  useEffect(() => {
    if (tplQ.data && loaded !== tplQ.data.id) useEditorStore.getState().load(tplQ.data)
  }, [tplQ.data, loaded])
  useEffect(() => () => useEditorStore.getState().reset(), [])

  const [leftOpen, setLeftOpen] = useState(() => storage.get('clinic.tpl.left', true))
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  // <xl: side panels become sheets opened from the tool strip (the app sidebar leaves too little room for 3 panes below that)
  const [panelsSheet, setPanelsSheet] = useState(false)
  const [propsSheet, setPropsSheet] = useState(false)
  const [leftTab, setLeftTab] = useState<'layers' | 'placeholders'>('layers')
  const [fitSignal, setFitSignal] = useState(0)
  const [assetPick, setAssetPick] = useState<null | 'new' | string>(null)
  const [bindingsOpen, setBindingsOpen] = useState(false)
  const [bindDraft, setBindDraft] = useState<Bindings | null>(null)
  const [activateAsk, setActivateAsk] = useState(false)
  const [printing, setPrinting] = useState(false)
  useEffect(() => {
    if (!printing) return
    const done = () => setPrinting(false)
    window.addEventListener('afterprint', done, { once: true })
    const tm = setTimeout(() => window.print(), 80)
    return () => { clearTimeout(tm); window.removeEventListener('afterprint', done) }
  }, [printing])
  useEffect(() => storage.set('clinic.tpl.left', leftOpen), [leftOpen])
  const tplId = tplQ.data?.id
  useEffect(() => { if (tplId) setTimeout(() => setFitSignal((n) => n + 1), 50) }, [tplId])

  const doSave = useCallback(async () => {
    const s = useEditorStore.getState()
    if (!s.template || !canWrite) return null
    if (!s.meta.name.trim()) { toast.error(t('catalog.templates.nameRequired')); return null }
    try {
      const saved = await save.mutateAsync({ id: s.template.id, name: s.meta.name.trim(), doc: s.doc, serviceTypeIds: s.meta.serviceTypeIds, categoryIds: s.meta.categoryIds, scope: s.meta.scope, language: s.meta.language })
      s.markSaved(saved)
      toast.success(t('catalog.templates.saved'))
      return saved
    } catch (e) { toast.error(errorMessage(e)); return null }
  }, [canWrite, save, t])

  useEditorShortcuts(() => void doSave(), !!loaded)
  const blocker = useLeavePrompt(dirty)
  const draft = useAutosaveDraft(templateId, tplQ.data?.updatedAt)

  const activate = async () => {
    const s = useEditorStore.getState()
    const saved = dirty ? await doSave() : s.template
    if (!saved) return
    try { const tpl = await setStatus.mutateAsync({ id: saved.id, status: 'active' }); s.markSaved(tpl); toast.success(t('catalog.templates.activated')); setActivateAsk(false) } catch (e) { toast.error(errorMessage(e)) }
  }
  const pickAsset = (a: TemplateAsset) => {
    const s = useEditorStore.getState()
    if (assetPick === 'new') {
      const ratio = a.width && a.height ? a.height / a.width : 1
      const w = Math.min(160, a.width || 160)
      s.addElement(createElement('image', s.doc.margin, s.doc.margin, { assetId: a.id, w, h: Math.round(w * ratio) }))
    } else if (assetPick) s.patchElements([assetPick], (e) => (e.type === 'image' ? { ...e, assetId: a.id, src: undefined } : e))
    setAssetPick(null)
  }

  if (tplQ.isLoading || !loaded) {
    return <div className="h-[calc(100dvh-4rem)] flex flex-col"><Skeleton className="h-14 rounded-none" /><div className="flex-1 flex gap-4 p-6"><Skeleton className="w-64" /><Skeleton className="flex-1" /><Skeleton className="w-80" /></div></div>
  }
  if (tplQ.isError || !tplQ.data) return <div className="p-10"><EmptyState title={t('common.error')} description={errorMessage(tplQ.error)} action={<Button onClick={() => nav(routes.admin.templates)}>{t('common.back')}</Button>} /></div>

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100dvh-4rem)] flex flex-col overflow-hidden">
      <EditorTopBar serviceTypes={serviceTypes.data ?? []} canWrite={canWrite} canPublish={canPublish} saving={save.isPending}
        onExport={async () => {
          const st = useEditorStore.getState()
          if (!st.template) return
          try {
            const file = await buildTemplateFile({ ...st.template, ...st.meta, doc: st.doc }, assets, serviceTypes.data ?? [], categories.data ?? [])
            downloadTemplateFile(file)
            toast.success(t('catalog.templates.exported'))
          } catch (e) { toast.error(errorMessage(e)) }
        }}
        onBack={() => nav(routes.admin.templates)} onSave={() => void doSave()} onActivate={() => setActivateAsk(true)}
        onBindings={() => { setBindDraft({ ...useEditorStore.getState().meta }); setBindingsOpen(true) }} onPrint={() => setPrinting(true)} />

      {(() => {
        const insertPlaceholder = (key: string) => { const s = useEditorStore.getState(); const isV = key.startsWith('values.'); s.addElement(isV ? createElement('field', s.doc.margin, s.doc.margin + 120, { fieldKey: key.slice(7) }) : createElement('text', s.doc.margin, s.doc.margin + 120, { text: `{${key}}` })); setPanelsSheet(false) }
        const panelTabs = <Tabs size="sm" value={leftTab} onChange={setLeftTab} className="px-2" items={[{ value: 'layers', label: t('catalog.editor.layers'), icon: <Layers /> }, { value: 'placeholders', label: t('catalog.editor.placeholders'), icon: <Braces /> }]} />
        const panelBody = leftTab === 'layers' ? <LayersPanel /> : <PlaceholderPalette schema={schema} services={services} onInsert={insertPlaceholder} />
        const propsPanel = <PropertiesPanel schema={schema} assets={assets} onPickImage={() => { const id = useEditorStore.getState().selectedIds[0]; if (id) setAssetPick(id) }} />
        const canvas = <EditorCanvas ctx={ctx} assets={assets} fitSignal={fitSignal} />

        if (!isDesktop) {
          return (
            <div className="flex-1 min-h-0 flex flex-col">
              {!preview && <Toolbar onPickImage={() => setAssetPick('new')} onFit={() => setFitSignal((n) => n + 1)} onOpenPanels={() => setPanelsSheet(true)} onOpenProps={() => setPropsSheet(true)} />}
              {canvas}
              <Drawer open={panelsSheet && !preview} onClose={() => setPanelsSheet(false)} side="left" width="max-w-full sm:max-w-sm" title={leftTab === 'layers' ? t('catalog.editor.layers') : t('catalog.editor.placeholders')} className="[&>div:nth-child(2)]:p-0 [&>div:nth-child(2)]:flex [&>div:nth-child(2)]:flex-col">
                <div className="px-3 pt-3"><PreviewAsSelect serviceTypes={serviceTypes.data ?? []} /></div>
                {panelTabs}
                <div className="flex-1 min-h-0 flex flex-col">{panelBody}</div>
              </Drawer>
              <Drawer open={propsSheet && !preview} onClose={() => setPropsSheet(false)} side="right" width="max-w-full sm:max-w-sm" title={t('catalog.editor.properties')} className="[&>div:nth-child(2)]:p-0">
                {propsPanel}
              </Drawer>
            </div>
          )
        }

        return (
          <div className="flex-1 min-h-0 flex">
            {!preview && <Toolbar onPickImage={() => setAssetPick('new')} onFit={() => setFitSignal((n) => n + 1)} />}

            {/* left panel */}
            <AnimatePresence initial={false}>
              {leftOpen && !preview && (
                <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 260, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="shrink-0 border-r border-line bg-surface overflow-hidden flex flex-col">
                  <div className="w-[260px] flex flex-col h-full min-h-0">
                    {panelTabs}
                    <div className="flex-1 min-h-0">{panelBody}</div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
            {!preview && (
              <button onClick={() => setLeftOpen((o) => !o)} className={cn('self-start mt-2 -ml-px z-10 grid size-6 place-items-center rounded-r-md border border-l-0 border-line bg-surface text-ink-3 hover:text-ink')} title={t('catalog.editor.togglePanel')}>
                {leftOpen ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
              </button>
            )}

            {canvas}

            {!preview && (
              <aside className="w-[300px] xl:w-[320px] shrink-0 border-l border-line bg-surface min-h-0 flex flex-col">
                {propsPanel}
              </aside>
            )}
          </div>
        )
      })()}

      <AssetPickerModal open={!!assetPick} onClose={() => setAssetPick(null)} assets={assets} companyId={companyId} onPick={pickAsset} />

      <Modal open={bindingsOpen} onClose={() => setBindingsOpen(false)} title={t('catalog.editor.bindings')} description={t('catalog.editor.bindingsHint')} size="lg"
        footer={<><Button variant="ghost" onClick={() => setBindingsOpen(false)}>{t('common.cancel')}</Button><Button onClick={() => { if (bindDraft) useEditorStore.getState().setMeta(bindDraft); setBindingsOpen(false) }}>{t('common.done')}</Button></>}>
        {bindDraft && <BindingsFields value={bindDraft} onChange={setBindDraft} serviceTypes={serviceTypes.data ?? []} categories={categories.data ?? []} />}
      </Modal>

      <ConfirmDialog open={activateAsk} onClose={() => setActivateAsk(false)} loading={setStatus.isPending || save.isPending} title={t('catalog.templates.activateTitle', { name: useEditorStore.getState().meta.name })} description={t('catalog.templates.activateHint')} confirmText={t('catalog.templates.activate')} cancelText={t('common.cancel')} onConfirm={() => void activate()} />
      <ConfirmDialog open={!!draft.pending} onClose={draft.dismiss} title={t('catalog.editor.draftTitle')} description={t('catalog.editor.draftHint')} confirmText={t('catalog.editor.draftRestore')} cancelText={t('catalog.editor.draftDiscard')} onConfirm={draft.restore} />
      <ConfirmDialog open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title={t('common.unsaved')} description={t('common.leaveConfirm')} confirmText={t('catalog.schemas.leave')} cancelText={t('common.cancel')} danger onConfirm={() => blocker.proceed?.()} />

      {printing && <PrintPortal doc={doc} ctx={ctx} assets={assets} />}
    </motion.div>
  )
}
