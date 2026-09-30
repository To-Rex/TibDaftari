/**
 * Template gallery shared by the two admin pages: result documents (`kind="result"`: item/order scope,
 * /admin/templates) and cashier cheques (`kind="receipt"`: /admin/receipts). The list, the counts, the copy
 * sources of "new template", "from another branch" and the JSON import all stay inside the page's kind, so
 * the two libraries never mix — while the branch scoping, statuses and actions behave the same on both.
 */
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Info, LayoutTemplate, Plus, ReceiptText, Sparkles, Upload } from 'lucide-react'
import type { ResultTemplate } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useBranches } from '@/features/org/queries'
import { useStaffSession } from '@/features/session/useSession'
import { useCategories, useCreateDefaultReceipt, useDeleteTemplate, useDuplicateTemplate, useSaveTemplate, useServiceTypes, useTemplateAssets, useTemplateStatus, useTemplates } from '@/features/catalog/queries'
import { NewTemplateModal, type NewTemplateInput } from '@/features/template-editor/NewTemplateModal'
import { ImportFromBranchModal } from '@/features/template-editor/ImportFromBranchModal'
import { TemplateCard } from '@/features/template-editor/TemplateCard'
import { templateEditorRoute, templateKind, type TemplateKind } from '@/features/template-editor/kind'
import { buildTemplateFile, downloadTemplateFile, importTemplateFile, parseTemplateFile, TemplateFileError } from '@/features/template-editor/transfer'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { errorMessage } from '@/shared/lib/errors'
import { Button, ConfirmDialog, EmptyState, Page, PageHeader, SearchInput, Segmented, Skeleton, Toolbar, toast } from '@/shared/ui'
import { MotionList, stagger } from '@/shared/ui/Page'

type StatusFilter = 'all' | ResultTemplate['status']

export function TemplateGallery({ kind }: { kind: TemplateKind }) {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { companyId, branchId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.template.write')
  const canPublish = can('admin.template.publish')
  // page texts: result documents → catalog.templates.*, cheques → catalog.receipts.*
  const K = kind === 'receipt' ? 'catalog.receipts' : 'catalog.templates'

  const [search, setSearch] = useState('')
  const dSearch = useDebounce(search)
  const [status, setStatus] = useState<StatusFilter>('all')
  // the top-bar branch switcher scopes the gallery: a branch sees the templates bound to it (see `inScope`)
  const q = useMemo(() => ({ status: status === 'all' ? undefined : status, search: dSearch || undefined, branchId: branchId ?? undefined }), [status, dSearch, branchId])

  const templates = useTemplates(companyId, q)
  const allQ = useTemplates(companyId, {})
  const serviceTypes = useServiceTypes(companyId, {})
  const categories = useCategories(companyId)
  const branches = useBranches(companyId)
  const save = useSaveTemplate(companyId)
  const dup = useDuplicateTemplate()
  const setStatusM = useTemplateStatus()
  const del = useDeleteTemplate()
  const mkDefault = useCreateDefaultReceipt(companyId)

  const [creating, setCreating] = useState(false)
  const [fromBranch, setFromBranch] = useState(false)
  const assets = useTemplateAssets(companyId)
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  // every template of this page's kind (all branches, all statuses): counts, copy sources, "from another branch"
  const all = useMemo(() => (allQ.data ?? []).filter((x) => templateKind(x) === kind), [allQ.data, kind])
  const exportTpl = async (tpl: ResultTemplate) => {
    try {
      const file = await buildTemplateFile(tpl, assets.data ?? [], serviceTypes.data ?? [], categories.data ?? [])
      downloadTemplateFile(file)
      toast.success(t('catalog.templates.exported'))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const onImportFile = async (f: File | undefined) => {
    if (!f) return
    setImporting(true)
    try {
      const parsed = await parseTemplateFile(f)
      const res = await importTemplateFile(companyId, parsed, { assets: assets.data ?? [], serviceTypes: serviceTypes.data ?? [], categories: categories.data ?? [], existingNames: (allQ.data ?? []).map((x) => x.name) })
      await qc.invalidateQueries({ queryKey: ['templates'] })
      await qc.invalidateQueries({ queryKey: ['template-assets'] })
      await qc.invalidateQueries({ queryKey: ['templateAssets'] })
      const unresolved = [...res.unresolvedServiceCodes, ...res.unresolvedCategoryCodes]
      toast.success(t('catalog.templates.imported'), unresolved.length ? t('catalog.templates.importUnresolved', { codes: unresolved.join(', ') }) : undefined)
      // a file of the other kind still imports — it just opens in (and lists on) its own page
      nav(templateEditorRoute(res.template))
    } catch (e) {
      toast.error(e instanceof TemplateFileError ? t(e.message === 'invalid_json' ? 'catalog.templates.importInvalidJson' : 'catalog.templates.importInvalid') : errorMessage(e))
    } finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }
  const [toDelete, setToDelete] = useState<ResultTemplate | null>(null)
  const [toActivate, setToActivate] = useState<ResultTemplate | null>(null)

  // templates belong to branches: with a branch selected in the top bar only its own templates are listed
  // (others are brought in with "from another branch"); "all branches" (admins) lists everything
  const inScope = useMemo(() => (x: ResultTemplate) => (!branchId || x.branchIds.includes(branchId)) && templateKind(x) === kind, [branchId, kind])
  const counts = useMemo(() => { const c = { all: 0, draft: 0, active: 0, archived: 0 }; for (const x of all.filter(inScope)) { c.all++; c[x.status]++ } return c }, [all, inScope])

  // the standard cheque (labels in the interface language), bound to the selected branch, opened in the editor
  const addDefault = async (name?: string, branchIds?: string[]) => {
    const language = (['uz', 'ru', 'en'].includes(i18n.language) ? i18n.language : 'uz') as ResultTemplate['language']
    try {
      const tpl = await mkDefault.mutateAsync({ name, branchIds: branchIds ?? (branchId ? [branchId] : []), language })
      setCreating(false)
      toast.success(t('catalog.receipts.defaultAdded'))
      nav(templateEditorRoute(tpl))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const create = async (input: NewTemplateInput) => {
    if (kind === 'receipt' && input.startFrom === 'default') return addDefault(input.name, input.branchIds)
    try {
      const tpl = await save.mutateAsync({ name: input.name, doc: input.doc, serviceTypeIds: input.serviceTypeIds, categoryIds: input.categoryIds, branchIds: input.branchIds, scope: input.scope, language: input.language })
      setCreating(false)
      nav(templateEditorRoute(tpl))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  // a copy made inside a branch belongs to that branch only — the way to get a branch-specific variant of a shared template
  const duplicate = async (tpl: ResultTemplate) => { try { await dup.mutateAsync({ id: tpl.id, branchIds: branchId ? [branchId] : undefined }); toast.success(t('catalog.templates.duplicated')) } catch (e) { toast.error(errorMessage(e)) } }
  const setSt = async (tpl: ResultTemplate, s: ResultTemplate['status']) => {
    try { await setStatusM.mutateAsync({ id: tpl.id, status: s }); toast.success(s === 'active' ? t('catalog.templates.activated') : t('catalog.templates.archived')); setToActivate(null) } catch (e) { toast.error(errorMessage(e)) }
  }

  const list = useMemo(() => (templates.data ?? []).filter(inScope), [templates.data, inScope])
  const emptyIcon = kind === 'receipt' ? <ReceiptText /> : <LayoutTemplate />
  return (
    <Page>
      <PageHeader title={t(`${K}.title`)} description={t(`${K}.subtitle`)}
        actions={canWrite && (
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImportFile(e.target.files?.[0])} />
            <Button variant="secondary" leftIcon={<Upload className="size-4" />} loading={importing} onClick={() => fileRef.current?.click()} title={t('catalog.templates.importHint')}>{t('catalog.templates.import')}</Button>
            {branchId && <Button variant="secondary" leftIcon={<ArrowDownToLine className="size-4" />} onClick={() => setFromBranch(true)} title={t('catalog.templates.fromBranchHint')}>{t('catalog.templates.fromBranch')}</Button>}
            {kind === 'receipt' && <Button variant="secondary" leftIcon={<Sparkles className="size-4" />} loading={mkDefault.isPending} onClick={() => void addDefault()} title={t('catalog.receipts.addDefaultHint')}>{t('catalog.receipts.addDefault')}</Button>}
            <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t(`${K}.new`)}</Button>
          </>
        )} />
      <Toolbar actions={<Segmented size="sm" className="max-w-full overflow-x-auto no-scrollbar" value={status} onChange={setStatus} items={(['all', 'draft', 'active', 'archived'] as const).map((s) => ({ value: s, label: `${s === 'all' ? t('common.all') : t(`catalog.templates.status.${s}`)} · ${counts[s]}` }))} />}>
        <SearchInput value={search} onChange={setSearch} placeholder={t(`${K}.searchPh`)} className="w-full sm:w-72" />
      </Toolbar>
      {kind === 'receipt' && allQ.data && !all.some((x) => x.status === 'active' && (!branchId || !x.branchIds.length || x.branchIds.includes(branchId))) && (
        <p className="flex items-start gap-2 rounded-[var(--radius)] border border-dashed border-line bg-surface-2/40 px-3 py-2 text-[12.5px] text-ink-2"><Info className="mt-0.5 size-4 shrink-0 text-ink-3" />{t('catalog.receipts.noActive')}</p>
      )}

      {templates.isLoading ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-[var(--radius-lg)]" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={emptyIcon} title={t(`${K}.emptyTitle`)} description={search || status !== 'all' ? t('common.emptyHint') : t(`${K}.emptyHint`)}
          action={canWrite && !search && status === 'all' && (kind === 'receipt'
            ? <div className="flex flex-wrap justify-center gap-2"><Button leftIcon={<Sparkles className="size-4" />} loading={mkDefault.isPending} onClick={() => void addDefault()}>{t('catalog.receipts.addDefault')}</Button><Button variant="secondary" leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t(`${K}.new`)}</Button></div>
            : <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t(`${K}.new`)}</Button>)} />
      ) : (
        <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">
          {list.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} companyId={companyId} serviceTypes={serviceTypes.data ?? []} categories={categories.data ?? []} branches={branches.data ?? []} canWrite={canWrite} canPublish={canPublish}
              onOpen={() => nav(templateEditorRoute(tpl))} onDuplicate={() => void duplicate(tpl)} onDelete={() => setToDelete(tpl)} onExport={() => void exportTpl(tpl)}
              onSetStatus={(s) => (s === 'active' ? setToActivate(tpl) : void setSt(tpl, s))} />
          ))}
        </MotionList>
      )}

      {branchId && <ImportFromBranchModal open={fromBranch} onClose={() => setFromBranch(false)} branchId={branchId} branches={branches.data ?? []} templates={all} />}
      <NewTemplateModal open={creating} onClose={() => setCreating(false)} kind={kind} serviceTypes={serviceTypes.data ?? []} categories={categories.data ?? []} branches={branches.data ?? []} templates={all} onSubmit={create} saving={save.isPending} initial={branchId ? { branchIds: [branchId] } : undefined} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} danger loading={del.isPending} title={t('catalog.templates.deleteTitle', { name: toDelete?.name ?? '' })} description={t('catalog.templates.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={async () => { try { await del.mutateAsync(toDelete!.id); setToDelete(null); toast.success(t('catalog.templates.deleted')) } catch (e) { toast.error(errorMessage(e)) } }} />
      <ConfirmDialog open={!!toActivate} onClose={() => setToActivate(null)} loading={setStatusM.isPending} title={t('catalog.templates.activateTitle', { name: toActivate?.name ?? '' })} description={t('catalog.templates.activateHint')} confirmText={t('catalog.templates.activate')} cancelText={t('common.cancel')}
        onConfirm={() => toActivate && void setSt(toActivate, 'active')} />
    </Page>
  )
}
