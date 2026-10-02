/**
 * Template gallery shared by the two admin pages: result documents (`kind="result"`: item/order scope,
 * /admin/templates) and cashier cheques (`kind="receipt"`: /admin/receipts). The list, the counts, the copy
 * sources of "new template", "from another branch" and the JSON import all stay inside the page's kind, so
 * the two libraries never mix — while the branch scoping, statuses and actions behave the same on both.
 *
 * Around the list: filters (type, binding, category, service, language, paper, branch), sorting, a card or a
 * list view, the service coverage of the branch (result documents) and bulk actions. Filters live for the
 * browser tab (they survive a trip to the editor and back); view and sort are remembered per device.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowDownToLine, ArrowDownWideNarrow, ArrowUpNarrowWide, CheckCircle2, Download, Info, LayoutGrid, LayoutTemplate, List, Plus, ReceiptText, SlidersHorizontal, Sparkles, SquareCheck, Trash2, Upload, X } from 'lucide-react'
import type { ResultTemplate, ServiceType } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useBranches } from '@/features/org/queries'
import { useStaffSession } from '@/features/session/useSession'
import { useCategories, useCreateDefaultReceipt, useDeleteTemplate, useDuplicateTemplate, useSaveTemplate, useServiceTypes, useTemplateAssets, useTemplateStatus, useTemplates } from '@/features/catalog/queries'
import type { Bindings } from '@/features/template-editor/BindingsFields'
import { NewTemplateModal, type NewTemplateInput } from '@/features/template-editor/NewTemplateModal'
import { ImportFromBranchModal } from '@/features/template-editor/ImportFromBranchModal'
import { TemplateCard } from '@/features/template-editor/TemplateCard'
import {
  activeFilterCount, collationLocale, defaultSortDir, effectiveFilters, EMPTY_FILTERS, filterTemplates, loadGalleryPrefs, loadGalleryState, saveGalleryPrefs, saveGalleryState, sortTemplates, templateCoverage,
  type GalleryFilters, type GalleryPrefs, type GallerySort,
} from '@/features/template-editor/galleryFilters'
import { templateEditorRoute, templateKind, type TemplateKind } from '@/features/template-editor/kind'
import type { TemplateActions } from '@/features/template-editor/templateMenu'
import { buildTemplateFile, downloadTemplateFile, importTemplateFile, parseTemplateFile, TemplateFileError } from '@/features/template-editor/transfer'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Button, ConfirmDialog, EmptyState, IconButton, Page, PageHeader, SearchInput, Segmented, Select, Skeleton, Toolbar, toast } from '@/shared/ui'
import { MotionList, stagger } from '@/shared/ui/Page'
import { TemplateCoverage } from './TemplateCoverage'
import { TemplateFilterBar } from './TemplateFilterBar'
import { TemplateListView } from './TemplateListView'

type StatusFilter = 'all' | ResultTemplate['status']
type CreateInitial = Partial<Bindings> & { name?: string }
const SORTS: GallerySort[] = ['updated', 'created', 'name', 'usage']
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function TemplateGallery({ kind }: { kind: TemplateKind }) {
  const { t, i18n } = useTranslation()
  const nav = useNavigate()
  const { companyId, branchId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.template.write')
  const canPublish = can('admin.template.publish')
  // page texts: result documents → catalog.templates.*, cheques → catalog.receipts.*
  const K = kind === 'receipt' ? 'catalog.receipts' : 'catalog.templates'
  const F = 'catalog.templates.f'
  const B = 'catalog.templates.bulk'

  // filters live for the tab (back from the editor they are still there); view + sort per device
  const [init] = useState(() => loadGalleryState(kind))
  const [search, setSearch] = useState(init.search)
  const dSearch = useDebounce(search)
  const [status, setStatus] = useState<StatusFilter>(init.status)
  const [filters, setFilters] = useState<GalleryFilters>(init.filters)
  const [prefs, setPrefs] = useState<GalleryPrefs>(() => loadGalleryPrefs(kind))
  const [filtersOpen, setFiltersOpen] = useState(false) // phones: the filter row folds away
  useEffect(() => saveGalleryState(kind, { status, search, filters }), [kind, status, search, filters])
  useEffect(() => saveGalleryPrefs(kind, prefs), [kind, prefs])

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
  const [createInitial, setCreateInitial] = useState<CreateInitial | undefined>(undefined)
  const [fromBranch, setFromBranch] = useState(false)
  const assets = useTemplateAssets(companyId)
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  // every template of this page's kind (all branches, all statuses): counts, copy sources, "from another branch"
  const all = useMemo(() => (allQ.data ?? []).filter((x) => templateKind(x) === kind), [allQ.data, kind])
  const exportTpl = async (tpl: ResultTemplate, quiet = false) => {
    try {
      const file = await buildTemplateFile(tpl, assets.data ?? [], serviceTypes.data ?? [], categories.data ?? [])
      downloadTemplateFile(file)
      if (!quiet) toast.success(t('catalog.templates.exported'))
    } catch (e) {
      if (quiet) throw e
      toast.error(errorMessage(e))
    }
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

  // ---- filters (applied on top of the server's status + search) -----------------------------------------
  const services = useMemo(() => serviceTypes.data ?? [], [serviceTypes.data])
  const cats = useMemo(() => categories.data ?? [], [categories.data])
  const eff = useMemo(() => effectiveFilters(filters, kind, branchId), [filters, kind, branchId])
  const nFilters = activeFilterCount(eff)
  const ctx = useMemo(() => ({ services, categories: cats }), [services, cats])
  const scoped = useMemo(() => all.filter(inScope), [all, inScope])
  // status tab counters follow the other filters (not the status itself)
  const counts = useMemo(() => { const c = { all: 0, draft: 0, active: 0, archived: 0 }; for (const x of filterTemplates(scoped, eff, ctx)) { c.all++; c[x.status]++ } return c }, [scoped, eff, ctx])
  const list = useMemo(() => sortTemplates(filterTemplates((templates.data ?? []).filter(inScope), eff, ctx), prefs.sort, prefs.dir, collationLocale(i18n.language)), [templates.data, inScope, eff, ctx, prefs.sort, prefs.dir, i18n.language])
  const anyFilter = !!search || status !== 'all' || nFilters > 0
  const clearAll = () => { setFilters(EMPTY_FILTERS); setSearch(''); setStatus('all') }
  // a remembered filter may point at a service / category / branch deleted since — drop it
  useEffect(() => {
    if (!serviceTypes.data || !categories.data || !branches.data) return
    setFilters((f) => {
      const next = { ...f }
      if (f.serviceTypeId && !serviceTypes.data.some((s) => s.id === f.serviceTypeId)) next.serviceTypeId = ''
      if (f.categoryId && !categories.data.some((c) => c.id === f.categoryId)) next.categoryId = ''
      if (f.branch !== 'all' && f.branch !== 'none' && !branches.data.some((b) => b.id === f.branch)) next.branch = 'all'
      return next.serviceTypeId === f.serviceTypeId && next.categoryId === f.categoryId && next.branch === f.branch ? f : next
    })
  }, [serviceTypes.data, categories.data, branches.data])

  const coverage = useMemo(() => (kind === 'result' && serviceTypes.data && allQ.data ? templateCoverage(all, services, branchId, collationLocale(i18n.language)) : null), [kind, serviceTypes.data, allQ.data, all, services, branchId, i18n.language])

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
  const openCreate = (initial?: CreateInitial) => { setCreateInitial(initial ?? (branchId ? { branchIds: [branchId] } : undefined)); setCreating(true) }
  // coverage: a template for exactly this service, in this branch, at the service's document level
  const createFor = (s: ServiceType) => openCreate({ name: s.name, serviceTypeIds: [s.id], branchIds: branchId ? [branchId] : [], scope: s.documentScope === 'order' ? 'order' : 'item' })
  const filterFor = (s: ServiceType) => { setFilters({ ...EMPTY_FILTERS, serviceTypeId: s.id }); setStatus('all'); setSearch('') }
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
  const actionsFor = (tpl: ResultTemplate): TemplateActions => ({
    onOpen: () => nav(templateEditorRoute(tpl)),
    onDuplicate: () => void duplicate(tpl),
    onDelete: () => setToDelete(tpl),
    onExport: () => void exportTpl(tpl),
    onSetStatus: (s) => (s === 'active' ? setToActivate(tpl) : void setSt(tpl, s)),
  })

  // ---- selection + bulk actions -------------------------------------------------------------------------
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkAsk, setBulkAsk] = useState<null | 'activate' | 'delete'>(null)
  const toggleSel = useCallback((id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }), [])
  const stopSelecting = useCallback(() => { setSelecting(false); setSelected(new Set()) }, [])
  // actions apply to what is selected AND still visible (a filter change can hide part of a selection)
  const picked = useMemo(() => list.filter((x) => selected.has(x.id)), [list, selected])
  const toActivateMany = picked.filter((x) => x.status !== 'active')
  const toArchiveMany = picked.filter((x) => x.status === 'active')
  const toDeleteMany = picked.filter((x) => x.status !== 'active')
  const allPicked = list.length > 0 && picked.length === list.length
  useEffect(() => {
    if (!selecting) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) stopSelecting() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecting, stopSelecting])
  const runBulk = async (items: ResultTemplate[], fn: (x: ResultTemplate) => Promise<unknown>) => {
    setBulkBusy(true)
    let ok = 0
    const failed: { id: string; text: string }[] = []
    for (const x of items) {
      try { await fn(x); ok++ } catch (e) { failed.push({ id: x.id, text: `${x.name}: ${errorMessage(e)}` }) }
    }
    setBulkBusy(false)
    setBulkAsk(null)
    if (ok) toast.success(t(`${B}.ok`, { n: ok }))
    if (failed.length) toast.error(t(`${B}.failed`, { n: failed.length }), failed.slice(0, 3).map((f) => f.text).join('\n'))
    // what failed stays selected (to retry or look at); the rest is done
    setSelected(new Set(failed.map((f) => f.id)))
  }
  const bulkExport = () => runBulk(picked, async (x) => { await exportTpl(x, true); await pause(250) })

  const emptyIcon = kind === 'receipt' ? <ReceiptText /> : <LayoutTemplate />
  const emptyState = (
    <EmptyState icon={emptyIcon} title={t(`${K}.emptyTitle`)} description={anyFilter ? t('common.emptyHint') : t(`${K}.emptyHint`)}
      action={anyFilter
        ? <Button variant="secondary" leftIcon={<X className="size-4" />} onClick={clearAll}>{t(`${F}.clear`)}</Button>
        : canWrite && (kind === 'receipt'
          ? <div className="flex flex-wrap justify-center gap-2"><Button leftIcon={<Sparkles className="size-4" />} loading={mkDefault.isPending} onClick={() => (branchId ? void addDefault() : openCreate())}>{t('catalog.receipts.addDefault')}</Button><Button variant="secondary" leftIcon={<Plus className="size-4" />} onClick={() => openCreate()}>{t(`${K}.new`)}</Button></div>
          : <Button leftIcon={<Plus className="size-4" />} onClick={() => openCreate()}>{t(`${K}.new`)}</Button>)} />
  )

  return (
    <Page>
      <PageHeader title={t(`${K}.title`)} description={t(`${K}.subtitle`)}
        actions={canWrite && (
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onImportFile(e.target.files?.[0])} />
            <Button variant="secondary" leftIcon={<Upload className="size-4" />} loading={importing} onClick={() => fileRef.current?.click()} title={t('catalog.templates.importHint')}>{t('catalog.templates.import')}</Button>
            {branchId && <Button variant="secondary" leftIcon={<ArrowDownToLine className="size-4" />} onClick={() => setFromBranch(true)} title={t('catalog.templates.fromBranchHint')}>{t('catalog.templates.fromBranch')}</Button>}
            {kind === 'receipt' && <Button variant="secondary" leftIcon={<Sparkles className="size-4" />} loading={mkDefault.isPending} onClick={() => (branchId ? void addDefault() : openCreate())} title={t('catalog.receipts.addDefaultHint')}>{t('catalog.receipts.addDefault')}</Button>}
            <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => openCreate()}>{t(`${K}.new`)}</Button>
          </>
        )} />

      {coverage && <TemplateCoverage coverage={coverage} categories={cats} canWrite={canWrite} onCreate={createFor} onFilter={filterFor} />}

      <Toolbar className="mb-3 min-w-0 [&>div]:min-w-0 [&>div]:max-w-full"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label={t(`${F}.sort`)} title={t(`${F}.sort`)} data-gallery-sort value={prefs.sort} onChange={(e) => { const sort = e.target.value as GallerySort; setPrefs((p) => ({ ...p, sort, dir: defaultSortDir(sort) })) }} className="h-8 w-auto text-[13px]">
              {SORTS.map((s) => <option key={s} value={s}>{t(`${F}.sort_${s}`)}</option>)}
            </Select>
            <IconButton size="sm" variant="secondary" label={prefs.dir === 'asc' ? t(`${F}.sortAsc`) : t(`${F}.sortDesc`)} title={prefs.dir === 'asc' ? t(`${F}.sortAsc`) : t(`${F}.sortDesc`)} onClick={() => setPrefs((p) => ({ ...p, dir: p.dir === 'asc' ? 'desc' : 'asc' }))}>
              {prefs.dir === 'asc' ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
            </IconButton>
            <Segmented size="sm" value={prefs.view} onChange={(view) => setPrefs((p) => ({ ...p, view }))}
              items={[{ value: 'grid' as const, icon: <LayoutGrid />, label: <span className="max-sm:sr-only">{t(`${F}.viewGrid`)}</span> }, { value: 'list' as const, icon: <List />, label: <span className="max-sm:sr-only">{t(`${F}.viewList`)}</span> }]} />
            <Button size="sm" variant={selecting ? 'soft' : 'secondary'} leftIcon={<SquareCheck className="size-4" />} onClick={() => (selecting ? stopSelecting() : setSelecting(true))} aria-pressed={selecting} data-gallery-select>
              {selecting ? t(`${B}.done`) : t(`${B}.select`)}
            </Button>
          </div>
        }>
        <SearchInput value={search} onChange={setSearch} placeholder={t(`${K}.searchPh`)} className="w-full sm:w-72" />
        <Segmented size="sm" className="max-w-full overflow-x-auto no-scrollbar" value={status} onChange={setStatus} items={(['all', 'draft', 'active', 'archived'] as const).map((s) => ({ value: s, label: `${s === 'all' ? t('common.all') : t(`catalog.templates.status.${s}`)} · ${counts[s]}` }))} />
        <Button size="sm" variant="secondary" className="md:hidden" leftIcon={<SlidersHorizontal className="size-4" />} onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          {t(`${F}.filters`)}{nFilters ? ` · ${nFilters}` : ''}
        </Button>
      </Toolbar>
      <TemplateFilterBar kind={kind} value={filters} onChange={setFilters} services={services} categories={cats} branches={branches.data ?? []} showBranch={!branchId} className={cn('mb-3', !filtersOpen && 'max-md:hidden')} />
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3" data-gallery-summary>
        <span className="tabular">{anyFilter ? t(`${F}.shown`, { n: list.length, total: scoped.length }) : t(`${F}.total`, { n: scoped.length })}</span>
        {anyFilter && <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 font-medium text-brand-ink hover:underline"><X className="size-3.5" />{t(`${F}.clear`)}</button>}
        {selecting && <span className="text-ink-3">· {t(`${B}.hint`)}</span>}
      </div>
      {kind === 'receipt' && allQ.data && !all.some((x) => x.status === 'active' && (!branchId || !x.branchIds.length || x.branchIds.includes(branchId))) && (
        <p className="mb-4 flex items-start gap-2 rounded-[var(--radius)] border border-dashed border-line bg-surface-2/40 px-3 py-2 text-[12.5px] text-ink-2"><Info className="mt-0.5 size-4 shrink-0 text-ink-3" />{t('catalog.receipts.noActive')}</p>
      )}

      {prefs.view === 'list' ? (
        <TemplateListView rows={list} loading={templates.isLoading} kind={kind} serviceTypes={services} categories={cats} branches={branches.data ?? []} canWrite={canWrite} canPublish={canPublish}
          actionsFor={actionsFor} selecting={selecting} selected={selected} onToggle={toggleSel} sort={prefs.sort} dir={prefs.dir} empty={emptyState}
          onSort={(sort) => setPrefs((p) => ({ ...p, sort, dir: p.sort === sort ? (p.dir === 'asc' ? 'desc' : 'asc') : defaultSortDir(sort) }))} />
      ) : templates.isLoading ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-[var(--radius-lg)]" />)}</div>
      ) : list.length === 0 ? emptyState : (
        <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">
          {list.map((tpl) => {
            const a = actionsFor(tpl)
            return (
              <TemplateCard key={tpl.id} tpl={tpl} companyId={companyId} serviceTypes={services} categories={cats} branches={branches.data ?? []} canWrite={canWrite} canPublish={canPublish}
                onOpen={a.onOpen} onDuplicate={a.onDuplicate} onDelete={a.onDelete} onExport={a.onExport} onSetStatus={a.onSetStatus}
                selecting={selecting} selected={selected.has(tpl.id)} onToggleSelect={() => toggleSel(tpl.id)} />
            )
          })}
        </MotionList>
      )}

      {selecting && (
        <div className="pointer-events-none sticky bottom-4 z-30 mt-6 flex justify-center" data-gallery-bulk>
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-line bg-surface px-3 py-2 shadow-3">
            <span className="px-1 text-[13px] font-semibold tabular">{t(`${B}.selected`, { n: picked.length })}</span>
            <Button size="sm" variant="ghost" onClick={() => setSelected(allPicked ? new Set() : new Set(list.map((x) => x.id)))}>{allPicked ? t(`${B}.clearSel`) : t(`${B}.selectAll`)}</Button>
            <span className="mx-1 h-5 w-px bg-line max-sm:hidden" />
            {canPublish && <Button size="sm" variant="secondary" leftIcon={<CheckCircle2 className="size-4" />} disabled={!toActivateMany.length || bulkBusy} onClick={() => setBulkAsk('activate')}>{t(`${B}.activate`, { n: toActivateMany.length })}</Button>}
            {canPublish && <Button size="sm" variant="secondary" leftIcon={<Archive className="size-4" />} disabled={!toArchiveMany.length || bulkBusy} loading={bulkBusy && !bulkAsk} onClick={() => void runBulk(toArchiveMany, (x) => setStatusM.mutateAsync({ id: x.id, status: 'archived' }))}>{t(`${B}.archive`, { n: toArchiveMany.length })}</Button>}
            <Button size="sm" variant="secondary" leftIcon={<Download className="size-4" />} disabled={!picked.length || bulkBusy} onClick={() => void bulkExport()}>{t(`${B}.export`, { n: picked.length })}</Button>
            {canWrite && <Button size="sm" variant="danger" leftIcon={<Trash2 className="size-4" />} disabled={!toDeleteMany.length || bulkBusy} onClick={() => setBulkAsk('delete')}>{t(`${B}.delete`, { n: toDeleteMany.length })}</Button>}
            <IconButton size="sm" label={t(`${B}.done`)} title={t(`${B}.done`)} onClick={stopSelecting}><X /></IconButton>
          </div>
        </div>
      )}

      {branchId && <ImportFromBranchModal open={fromBranch} onClose={() => setFromBranch(false)} branchId={branchId} branches={branches.data ?? []} templates={all} />}
      <NewTemplateModal open={creating} onClose={() => setCreating(false)} kind={kind} serviceTypes={services} categories={cats} branches={branches.data ?? []} templates={all} onSubmit={create} saving={save.isPending} initial={createInitial} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} danger loading={del.isPending} title={t('catalog.templates.deleteTitle', { name: toDelete?.name ?? '' })} description={t('catalog.templates.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={async () => { try { await del.mutateAsync(toDelete!.id); setToDelete(null); toast.success(t('catalog.templates.deleted')) } catch (e) { toast.error(errorMessage(e)) } }} />
      <ConfirmDialog open={!!toActivate} onClose={() => setToActivate(null)} loading={setStatusM.isPending} title={t('catalog.templates.activateTitle', { name: toActivate?.name ?? '' })} description={t('catalog.templates.activateHint')} confirmText={t('catalog.templates.activate')} cancelText={t('common.cancel')}
        onConfirm={() => toActivate && void setSt(toActivate, 'active')} />
      <ConfirmDialog open={bulkAsk === 'activate'} onClose={() => setBulkAsk(null)} loading={bulkBusy} title={t(`${B}.activateTitle`, { n: toActivateMany.length })} description={t('catalog.templates.activateHint')} confirmText={t('catalog.templates.activate')} cancelText={t('common.cancel')}
        onConfirm={() => void runBulk(toActivateMany, (x) => setStatusM.mutateAsync({ id: x.id, status: 'active' }))} />
      <ConfirmDialog open={bulkAsk === 'delete'} onClose={() => setBulkAsk(null)} danger loading={bulkBusy} title={t(`${B}.deleteTitle`, { n: toDeleteMany.length })} description={t(`${B}.deleteHint`)} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={() => void runBulk(toDeleteMany, (x) => del.mutateAsync(x.id))} />
    </Page>
  )
}
