import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Eye, EyeOff, Rocket, Save } from 'lucide-react'
import type { AttributeSchema } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { usePublishSchema, useSaveSchema, useSchema } from '@/features/catalog/queries'
import { FieldList } from '@/features/schema-editor/FieldList'
import { FieldPropertyEditor } from '@/features/schema-editor/FieldPropertyEditor'
import { SchemaPreview } from '@/features/schema-editor/SchemaPreview'
import { useSchemaEditor } from '@/features/schema-editor/useSchemaEditor'
import { useLeavePrompt, useSaveShortcut } from '@/features/schema-editor/useLeavePrompt'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { cn } from '@/shared/lib/cn'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, IconButton, Kbd, Modal, Page, Skeleton, Textarea, toast } from '@/shared/ui'

const STATUS_TONE = { draft: 'warn', published: 'ok', archived: 'neutral' } as const

export default function SchemaEditorPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { schemaId } = useParams()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.schema.write')

  const schemaQ = useSchema(schemaId)
  const ed = useSchemaEditor(schemaQ.data)
  const save = useSaveSchema(companyId)
  const publish = usePublishSchema()
  const [preview, setPreview] = useState(true)
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  // <xl: the preview lives in a modal that is opened explicitly (not shown by default)
  const [previewSheet, setPreviewSheet] = useState(false)
  // <xl: property editor drawer — opened by an explicit user pick (not by the initial auto-selection)
  const [fieldSheet, setFieldSheet] = useState(false)
  const [publishAsk, setPublishAsk] = useState(false)

  const invalid = ed.state ? ed.state.fields.some((f, i, arr) => !f.label.trim() || !/^[a-z][a-z0-9_]*$/.test(f.key) || arr.findIndex((x) => x.key === f.key) !== i) : false

  const doSave = useCallback(async (): Promise<AttributeSchema | null> => {
    if (!ed.state || !schemaId || !canWrite) return null
    if (!ed.state.name.trim()) { toast.error(t('catalog.schemas.nameRequired')); return null }
    if (invalid) { toast.error(t('catalog.schemas.invalidFields')); return null }
    try {
      const s = await save.mutateAsync({ id: schemaId, name: ed.state.name.trim(), description: ed.state.description || undefined, fields: ed.state.fields })
      ed.markSaved(s)
      toast.success(t('catalog.schemas.saved'))
      return s
    } catch (e) { toast.error(errorMessage(e)); return null }
  }, [ed, schemaId, canWrite, invalid, save, t])

  useSaveShortcut(() => void doSave(), ed.dirty)
  const blocker = useLeavePrompt(ed.dirty)

  const doPublish = async () => {
    const s = ed.dirty ? await doSave() : schemaQ.data
    if (!s) return
    try { await publish.mutateAsync(s.id); toast.success(t('catalog.schemas.published')); setPublishAsk(false) } catch (e) { toast.error(errorMessage(e)) }
  }

  if (schemaQ.isLoading || !ed.state) {
    return <Page width="full"><Skeleton className="h-10 w-72 mb-6" /><div className="grid xl:grid-cols-[300px_1fr_360px] gap-4"><Skeleton className="h-96" /><Skeleton className="h-96" /><Skeleton className="h-96" /></div></Page>
  }
  if (schemaQ.isError || !schemaQ.data) return <Page><EmptyState title={t('common.error')} description={errorMessage(schemaQ.error)} action={<Button onClick={() => nav(routes.admin.schemas)}>{t('common.back')}</Button>} /></Page>
  const schema = schemaQ.data
  const st = ed.state

  return (
    <Page width="full" className="pb-10">
      {/* header */}
      <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0">
          <IconButton label={t('common.back')} onClick={() => nav(routes.admin.schemas)} className="mt-0.5"><ArrowLeft /></IconButton>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={st.name}
                onChange={(e) => ed.setMeta({ name: e.target.value })}
                readOnly={!canWrite}
                placeholder={t('catalog.schemas.namePh')}
                className="bg-transparent text-[20px] sm:text-[24px] font-semibold tracking-tight outline-none rounded-md px-1 -mx-1 min-w-0 w-full sm:w-[min(100%,520px)] hover:bg-surface-2 focus:bg-surface-2 focus:ring-2 focus:ring-brand/30 transition-colors placeholder:text-ink-3"
              />
              <Badge tone={STATUS_TONE[schema.status]} dot>{t(`common.${schema.status}`)}</Badge>
              <Badge>v{schema.version}</Badge>
              <AnimatePresence>{ed.dirty && <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><Badge tone="warn" size="sm">{t('common.unsaved')}</Badge></motion.span>}</AnimatePresence>
            </div>
            <Textarea value={st.description} onChange={(e) => ed.setMeta({ description: e.target.value })} readOnly={!canWrite} placeholder={t('catalog.schemas.descriptionPh')} rows={1} className="mt-1 min-h-0 h-auto py-1 px-1 -mx-1 border-transparent bg-transparent shadow-none text-[13.5px] text-ink-2 hover:border-line focus:border-brand max-w-2xl resize-none" />
            {schema.status === 'published' && <p className="mt-1 text-[12.5px] text-info flex items-center gap-1.5">{t('catalog.schemas.publishedEditHint')}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap max-xl:pl-10 max-sm:pl-0">
          <span className="hidden xl:inline-flex items-center gap-1 text-[12px] text-ink-3 mr-1"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd></span>
          <Button variant="ghost" size="sm" leftIcon={isDesktop && preview ? <EyeOff className="size-4" /> : <Eye className="size-4" />} onClick={() => (isDesktop ? setPreview((p) => !p) : setPreviewSheet(true))}>{t('common.preview')}</Button>
          {canWrite && <Button variant="secondary" leftIcon={<Save className="size-4" />} loading={save.isPending} disabled={!ed.dirty} onClick={() => void doSave()}>{t('common.save')}</Button>}
          {canWrite && schema.status !== 'published' && <Button leftIcon={<Rocket className="size-4" />} onClick={() => setPublishAsk(true)} disabled={st.fields.length === 0}>{t('catalog.schemas.publish')}</Button>}
        </div>
      </div>

      {(() => {
        const propsEditor = ed.selected ? (
          <motion.div key={st.fields.indexOf(ed.selected)} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[15px] font-semibold">{t('catalog.schemas.fieldProps')}</h3>
              <span className="text-[12px] font-mono text-ink-3 truncate max-w-full">values.{ed.selected.key}</span>
            </div>
            <FieldPropertyEditor field={ed.selected} siblings={st.fields} onChange={(f) => ed.updateField(ed.selected!.key, f)} readOnly={!canWrite} />
          </motion.div>
        ) : null
        const previewCard = (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('catalog.schemas.livePreview')}</h3>
              <Badge size="sm">{t('catalog.schemas.nFields', { n: st.fields.length })}</Badge>
            </div>
            <SchemaPreview fields={st.fields} selectedKey={ed.selectedKey} onSelect={(k) => { ed.setSelectedKey(k); if (!isDesktop) setPreviewSheet(false) }} />
          </>
        )
        if (!isDesktop) {
          // phones / tablets: field list full width; property editor in a drawer; preview in a modal
          return (
            <>
              <Card padded={false} className="overflow-hidden flex flex-col">
                <FieldList fields={st.fields} selectedKey={ed.selectedKey} onSelect={(k) => { ed.setSelectedKey(k); setFieldSheet(true) }} onAdd={(ft) => { ed.addField(ft); setFieldSheet(true) }} onMove={ed.moveField} onDuplicate={(k) => { ed.duplicateField(k); setFieldSheet(true) }} onRemove={ed.removeField} readOnly={!canWrite} />
              </Card>
              <Drawer open={fieldSheet && !!ed.selected} onClose={() => setFieldSheet(false)} width="max-w-full sm:max-w-xl" title={t('catalog.schemas.fieldProps')} description={ed.selected ? <span className="font-mono">values.{ed.selected.key}</span> : undefined}
                footer={<Button onClick={() => setFieldSheet(false)}>{t('common.done')}</Button>}>
                {ed.selected && <FieldPropertyEditor field={ed.selected} siblings={st.fields} onChange={(f) => ed.updateField(ed.selected!.key, f)} readOnly={!canWrite} />}
              </Drawer>
              <Modal open={previewSheet} onClose={() => setPreviewSheet(false)} title={t('catalog.schemas.livePreview')} size="lg">
                <div className="mb-3 flex items-center justify-between"><Badge size="sm">{t('catalog.schemas.nFields', { n: st.fields.length })}</Badge></div>
                <SchemaPreview fields={st.fields} selectedKey={ed.selectedKey} onSelect={(k) => { ed.setSelectedKey(k); setPreviewSheet(false); setFieldSheet(true) }} />
              </Modal>
            </>
          )
        }
        return (
          <div className={cn('grid gap-4 items-start', preview ? 'xl:grid-cols-[260px_minmax(0,1fr)_300px] 2xl:grid-cols-[300px_minmax(0,1fr)_360px] 3xl:grid-cols-[340px_minmax(0,1fr)_440px]' : 'xl:grid-cols-[300px_minmax(0,1fr)] 3xl:grid-cols-[340px_minmax(0,1fr)]')}>
            <Card padded={false} className="xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6.5rem)] overflow-hidden flex flex-col">
              <FieldList fields={st.fields} selectedKey={ed.selectedKey} onSelect={ed.setSelectedKey} onAdd={ed.addField} onMove={ed.moveField} onDuplicate={ed.duplicateField} onRemove={ed.removeField} readOnly={!canWrite} />
            </Card>

            <Card className="min-w-0">
              <AnimatePresence mode="wait">
                {propsEditor ?? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <EmptyState title={t('catalog.schemas.selectField')} description={t('catalog.schemas.selectFieldHint')} />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>

            <AnimatePresence>
              {preview && (
                <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }} className="xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6.5rem)] overflow-y-auto min-w-0">
                  <Card>{previewCard}</Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })()}

      <ConfirmDialog open={publishAsk} onClose={() => setPublishAsk(false)} title={t('catalog.schemas.publishTitle')} description={t('catalog.schemas.publishHint')} confirmText={t('catalog.schemas.publish')} cancelText={t('common.cancel')} loading={publish.isPending || save.isPending} onConfirm={() => void doPublish()} />
      <ConfirmDialog open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title={t('common.unsaved')} description={t('common.leaveConfirm')} confirmText={t('catalog.schemas.leave')} cancelText={t('common.cancel')} danger onConfirm={() => blocker.proceed?.()} />

    </Page>
  )
}
