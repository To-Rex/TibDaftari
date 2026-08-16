import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ChevronRight, FolderPlus, Plus } from 'lucide-react'
import type { Category, ServiceType } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { errorMessage } from '@/shared/lib/errors'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Badge, Button, Card, ConfirmDialog, Page, PageHeader, SearchInput, toast } from '@/shared/ui'
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

  return (
    <Page width="full" className="max-w-[1600px]">
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
      <div className="grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[320px_1fr] items-start">
        <Card padded={false} className="lg:sticky lg:top-20 max-h-[calc(100dvh-7rem)] overflow-y-auto">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t('catalog.tree.heading')}</h2>
            <span className="text-[12px] tabular text-ink-3">{cats.length}</span>
          </div>
          <CategoryTree
            categories={cats}
            loading={categories.isLoading}
            selectedId={selected}
            onSelect={setSelected}
            canWrite={canWrite}
            counts={counts}
            onAddChild={(pid) => setCatDraft(draftFromCategory(null, pid))}
            onEdit={(c) => setCatDraft(draftFromCategory(c))}
            onDelete={setCatDel}
            onMove={moveCategory}
          />
        </Card>

        <motion.div layout className="min-w-0">
          <Card padded={false}>
            <div className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line">
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-[12.5px] text-ink-3 mb-0.5 flex-wrap">
                  <button className="hover:text-ink transition-colors" onClick={() => setSelected(null)}>{t('catalog.tree.all')}</button>
                  {path.map((c) => (
                    <span key={c.id} className="flex items-center gap-1"><ChevronRight className="size-3" /><button className="hover:text-ink transition-colors" onClick={() => setSelected(c.id)}>{c.name}</button></span>
                  ))}
                </div>
                <h2 className="text-[16px] font-semibold flex items-center gap-2">
                  {selectedCat?.name ?? t('catalog.services.allServices')}
                  {selectedCat && <Badge size="sm" tone={selectedCat.isActive ? 'ok' : 'neutral'} dot>{selectedCat.isActive ? t('common.active') : t('common.inactive')}</Badge>}
                  <span className="text-[13px] font-normal text-ink-3 tabular">{services.data?.length ?? 0}</span>
                </h2>
              </div>
              <SearchInput value={search} onChange={setSearch} placeholder={t('catalog.services.searchPh')} className="sm:w-64" />
            </div>
            <ServiceTypeTable
              rows={services.data ?? []}
              loading={services.isLoading}
              schemas={schemas.data ?? []}
              templates={templates.data ?? []}
              canWrite={canWrite}
              onEdit={(s) => setStDraft(draftFromServiceType(s))}
              onDelete={setStDel}
              onToggleActive={toggleActive}
              emptyAction={canWrite && <Button size="sm" leftIcon={<Plus className="size-4" />} onClick={addService}>{t('catalog.services.add')}</Button>}
            />
          </Card>
        </motion.div>
      </div>

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
