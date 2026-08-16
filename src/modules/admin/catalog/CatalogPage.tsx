import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ChevronDown, ChevronRight, FolderPlus, Plus } from 'lucide-react'
import type { Category, ServiceType } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { errorMessage } from '@/shared/lib/errors'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { Badge, Button, Card, ConfirmDialog, Drawer, Page, PageHeader, SearchInput, toast } from '@/shared/ui'
import { CategoryTree } from '@/features/catalog/CategoryTree'
import { CategoryDrawer, draftFromCategory, type CategoryDraft } from '@/features/catalog/CategoryDrawer'
import { ServiceTypeDrawer, draftFromServiceType, type ServiceTypeDraft } from '@/features/catalog/ServiceTypeDrawer'
import { ServiceTypeTable } from '@/features/catalog/ServiceTypeTable'
import { catalogKeys, useBranches, useCategories, useDeleteCategory, useDeleteServiceType, useSaveCategory, useSaveServiceType, useSchemas, useServiceTypes, useTemplates } from '@/features/catalog/queries'
import { categoryPath } from '@/features/catalog/tree'

export default function CatalogPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.catalog.write')
  const qc = useQueryClient()

  const [selected, setSelected] = useState<string | null>(null)
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  const [treeOpen, setTreeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dSearch = useDebounce(search)
  const q = useMemo(() => ({ categoryId: selected ?? undefined, search: dSearch || undefined }), [selected, dSearch])

  const categories = useCategories(companyId)
  const services = useServiceTypes(companyId, q)
  const allServices = useServiceTypes(companyId, {})
  const schemas = useSchemas(companyId)
  const templates = useTemplates(companyId)
  const branches = useBranches(companyId)

  const saveCat = useSaveCategory(companyId)
  const delCat = useDeleteCategory()
  const saveSt = useSaveServiceType(companyId)
  const delSt = useDeleteServiceType()

  const [catDraft, setCatDraft] = useState<CategoryDraft | null>(null)
  const [catDel, setCatDel] = useState<Category | null>(null)
  const [stDraft, setStDraft] = useState<ServiceTypeDraft | null>(null)
  const [stDel, setStDel] = useState<ServiceType | null>(null)

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of allServices.data ?? []) m[s.categoryId] = (m[s.categoryId] ?? 0) + 1
    return m
  }, [allServices.data])
  const cats = categories.data ?? []
  const path = categoryPath(cats, selected)
  const selectedCat = path.at(-1)

  const moveCategory = async (cat: Category, dir: -1 | 1) => {
    const siblings = cats.filter((c) => c.parentId === cat.parentId).sort((a, b) => a.order - b.order)
    const i = siblings.findIndex((c) => c.id === cat.id)
    const other = siblings[i + dir]
    if (!other) return
    try {
      await Promise.all([saveCat.mutateAsync({ id: cat.id, order: other.order }), saveCat.mutateAsync({ id: other.id, order: cat.order })])
    } catch (e) { toast.error(errorMessage(e)) }
  }

  const submitCategory = async (d: CategoryDraft) => {
    try {
      await saveCat.mutateAsync({ id: d.id, name: d.name, code: d.code || undefined, parentId: d.parentId, icon: d.icon, color: d.color, workflow: d.workflow, isActive: d.isActive })
      toast.success(t('catalog.tree.saved'))
      setCatDraft(null)
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const submitService = async (d: ServiceTypeDraft) => {
    try {
      await saveSt.mutateAsync({ id: d.id, name: d.name, code: d.code || undefined, description: d.description || undefined, categoryId: d.categoryId, price: d.price, branchPrices: d.branchPrices, turnaroundDays: d.turnaroundDays, schemaId: d.schemaId, documentScope: d.documentScope, defaultTemplateId: d.defaultTemplateId, isActive: d.isActive })
      toast.success(t('catalog.services.saved'))
      setStDraft(null)
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const toggleActive = async (s: ServiceType, v: boolean) => {
    // optimistic
    const key = catalogKeys.serviceTypes(companyId, q)
    const prev = qc.getQueryData<ServiceType[]>(key)
    qc.setQueryData<ServiceType[]>(key, (old) => old?.map((x) => (x.id === s.id ? { ...x, isActive: v } : x)))
    try { await saveSt.mutateAsync({ id: s.id, isActive: v }) } catch (e) { qc.setQueryData(key, prev); toast.error(errorMessage(e)) }
  }

  const addService = () => setStDraft(draftFromServiceType(null, selected ?? cats[0]?.id ?? ''))
  const selectCategory = (id: string | null) => { setSelected(id); setTreeOpen(false) }

  const tree = (
    <CategoryTree
      categories={cats}
      loading={categories.isLoading}
      selectedId={selected}
      onSelect={selectCategory}
      canWrite={canWrite}
      counts={counts}
      onAddChild={(pid) => { setTreeOpen(false); setCatDraft(draftFromCategory(null, pid)) }}
      onEdit={(c) => { setTreeOpen(false); setCatDraft(draftFromCategory(c)) }}
      onDelete={(c) => { setTreeOpen(false); setCatDel(c) }}
      onMove={moveCategory}
    />
  )

  return (
    <Page width="full">
      <PageHeader
        title={t('catalog.title')}
        description={t('catalog.subtitle')}
        actions={canWrite && (
          <>
            <Button variant="secondary" leftIcon={<FolderPlus className="size-4" />} onClick={() => setCatDraft(draftFromCategory(null, selected))}>{t('catalog.tree.newCategory')}</Button>
            <Button leftIcon={<Plus className="size-4" />} onClick={addService}>{t('catalog.services.add')}</Button>
          </>
        )}
      />
      <div className="grid gap-4 grid-cols-[minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)] 3xl:grid-cols-[340px_minmax(0,1fr)] items-start">
        {/* ≥xl: sticky tree pane. <xl: compact selector button that opens the tree in a sheet */}
        {isDesktop ? (
          <Card padded={false} className="xl:sticky xl:top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('catalog.tree.heading')}</h2>
              <span className="text-[12px] tabular text-ink-3">{cats.length}</span>
            </div>
            {tree}
          </Card>
        ) : (
          <button type="button" onClick={() => setTreeOpen(true)}
            className="flex w-full min-w-0 items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-3 h-11 text-left shadow-1 hover:bg-surface-2 transition-colors">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-3 shrink-0">{t('catalog.tree.heading')}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{selectedCat?.name ?? t('catalog.tree.all')}</span>
            <span className="text-[12px] tabular text-ink-3">{services.data?.length ?? 0}</span>
            <ChevronDown className="size-4 text-ink-3 shrink-0" />
          </button>
        )}

        <motion.div layout className="min-w-0">
          <Card padded={false}>
            <div className="p-3 sm:p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[12.5px] text-ink-3 mb-0.5 flex-wrap">
                  <button className="hover:text-ink transition-colors" onClick={() => setSelected(null)}>{t('catalog.tree.all')}</button>
                  {path.map((c) => (
                    <span key={c.id} className="flex items-center gap-1 min-w-0"><ChevronRight className="size-3 shrink-0" /><button className="hover:text-ink transition-colors truncate" onClick={() => setSelected(c.id)}>{c.name}</button></span>
                  ))}
                </div>
                <h2 className="text-[16px] font-semibold flex items-center gap-2 flex-wrap">
                  <span className="min-w-0 break-words">{selectedCat?.name ?? t('catalog.services.allServices')}</span>
                  {selectedCat && <Badge size="sm" tone={selectedCat.isActive ? 'ok' : 'neutral'} dot>{selectedCat.isActive ? t('common.active') : t('common.inactive')}</Badge>}
                  <span className="text-[13px] font-normal text-ink-3 tabular">{services.data?.length ?? 0}</span>
                </h2>
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder={t('catalog.services.searchPh')} className="w-full sm:w-64 sm:shrink-0" />
            </div>
            <div className="max-md:p-3">
              <ServiceTypeTable
                rows={services.data ?? []}
                loading={services.isLoading}
                schemas={schemas.data ?? []}
                templates={templates.data ?? []}
                categories={cats}
                canWrite={canWrite}
                onEdit={(s) => setStDraft(draftFromServiceType(s))}
                onDelete={setStDel}
                onToggleActive={toggleActive}
                emptyAction={canWrite && <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={addService}>{t('catalog.services.add')}</Button>}
              />
            </div>
          </Card>
        </motion.div>
      </div>

      <Drawer open={!isDesktop && treeOpen} onClose={() => setTreeOpen(false)} side="left" width="max-w-full sm:max-w-sm" title={t('catalog.tree.heading')} description={`${cats.length}`} className="[&>div:nth-child(2)]:px-2 [&>div:nth-child(2)]:py-2">
        {tree}
      </Drawer>

      <CategoryDrawer open={!!catDraft} onClose={() => setCatDraft(null)} initial={catDraft} categories={cats} onSubmit={submitCategory} saving={saveCat.isPending} />
      <ServiceTypeDrawer open={!!stDraft} onClose={() => setStDraft(null)} initial={stDraft} categories={cats} branches={branches.data ?? []} schemas={schemas.data ?? []} templates={templates.data ?? []} onSubmit={submitService} saving={saveSt.isPending} />

      <ConfirmDialog open={!!catDel} onClose={() => setCatDel(null)} danger loading={delCat.isPending}
        title={t('catalog.tree.deleteTitle', { name: catDel?.name ?? '' })} description={t('catalog.tree.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={async () => { try { await delCat.mutateAsync(catDel!.id); if (selected === catDel!.id) setSelected(null); setCatDel(null); toast.success(t('catalog.tree.deleted')) } catch (e) { toast.error(errorMessage(e)) } }} />
      <ConfirmDialog open={!!stDel} onClose={() => setStDel(null)} danger loading={delSt.isPending}
        title={t('catalog.services.deleteTitle', { name: stDel?.name ?? '' })} description={t('catalog.services.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={async () => { try { await delSt.mutateAsync(stDel!.id); setStDel(null); toast.success(t('catalog.services.deleted')) } catch (e) { toast.error(errorMessage(e)) } }} />
    </Page>
  )
}
