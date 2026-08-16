import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, Plus } from 'lucide-react'
import type { ResultTemplate } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { useCategories, useDeleteTemplate, useDuplicateTemplate, useSaveTemplate, useServiceTypes, useTemplateStatus, useTemplates } from '@/features/catalog/queries'
import { NewTemplateModal, type NewTemplateInput } from '@/features/template-editor/NewTemplateModal'
import { TemplateCard } from '@/features/template-editor/TemplateCard'
import { routes } from '@/shared/config/routes'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { errorMessage } from '@/shared/lib/errors'
import { Button, ConfirmDialog, EmptyState, Page, PageHeader, SearchInput, Segmented, Skeleton, Toolbar, toast } from '@/shared/ui'
import { MotionList, stagger } from '@/shared/ui/Page'

type StatusFilter = 'all' | ResultTemplate['status']

export default function TemplatesPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.template.write')
  const canPublish = can('admin.template.publish')

  const [search, setSearch] = useState('')
  const dSearch = useDebounce(search)
  const [status, setStatus] = useState<StatusFilter>('all')
  const q = useMemo(() => ({ status: status === 'all' ? undefined : status, search: dSearch || undefined }), [status, dSearch])

  const templates = useTemplates(companyId, q)
  const all = useTemplates(companyId, {})
  const serviceTypes = useServiceTypes(companyId, {})
  const categories = useCategories(companyId)
  const save = useSaveTemplate(companyId)
  const dup = useDuplicateTemplate()
  const setStatusM = useTemplateStatus()
  const del = useDeleteTemplate()

  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<ResultTemplate | null>(null)
  const [toActivate, setToActivate] = useState<ResultTemplate | null>(null)

  const counts = useMemo(() => { const c = { all: 0, draft: 0, active: 0, archived: 0 }; for (const x of all.data ?? []) { c.all++; c[x.status]++ } return c }, [all.data])

  const create = async (input: NewTemplateInput) => {
    try {
      const tpl = await save.mutateAsync({ name: input.name, doc: input.doc, serviceTypeIds: input.serviceTypeIds, categoryIds: input.categoryIds, scope: input.scope, language: input.language })
      setCreating(false)
      nav(routes.admin.template(tpl.id))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const duplicate = async (tpl: ResultTemplate) => { try { await dup.mutateAsync(tpl.id); toast.success(t('catalog.templates.duplicated')) } catch (e) { toast.error(errorMessage(e)) } }
  const setSt = async (tpl: ResultTemplate, s: ResultTemplate['status']) => {
    try { await setStatusM.mutateAsync({ id: tpl.id, status: s }); toast.success(s === 'active' ? t('catalog.templates.activated') : t('catalog.templates.archived')); setToActivate(null) } catch (e) { toast.error(errorMessage(e)) }
  }

  const list = templates.data ?? []
  return (
    <Page>
      <PageHeader title={t('catalog.templates.title')} description={t('catalog.templates.subtitle')}
        actions={canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t('catalog.templates.new')}</Button>} />
      <Toolbar actions={<Segmented size="sm" className="max-w-full overflow-x-auto no-scrollbar" value={status} onChange={setStatus} items={(['all', 'draft', 'active', 'archived'] as const).map((s) => ({ value: s, label: `${s === 'all' ? t('common.all') : t(`catalog.templates.status.${s}`)} · ${counts[s]}` }))} />}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('catalog.templates.searchPh')} className="w-full sm:w-72" />
      </Toolbar>

      {templates.isLoading ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-[var(--radius-lg)]" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<LayoutTemplate />} title={t('catalog.templates.emptyTitle')} description={search || status !== 'all' ? t('common.emptyHint') : t('catalog.templates.emptyHint')}
          action={canWrite && !search && status === 'all' && <Button leftIcon={<Plus className="size-4" />} onClick={() => setCreating(true)}>{t('catalog.templates.new')}</Button>} />
      ) : (
        <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(min(100%,270px),1fr))]">
          {list.map((tpl) => (
            <TemplateCard key={tpl.id} tpl={tpl} companyId={companyId} serviceTypes={serviceTypes.data ?? []} categories={categories.data ?? []} canWrite={canWrite} canPublish={canPublish}
              onOpen={() => nav(routes.admin.template(tpl.id))} onDuplicate={() => void duplicate(tpl)} onDelete={() => setToDelete(tpl)}
              onSetStatus={(s) => (s === 'active' ? setToActivate(tpl) : void setSt(tpl, s))} />
          ))}
        </MotionList>
      )}

      <NewTemplateModal open={creating} onClose={() => setCreating(false)} serviceTypes={serviceTypes.data ?? []} categories={categories.data ?? []} templates={all.data ?? []} onSubmit={create} saving={save.isPending} />
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} danger loading={del.isPending} title={t('catalog.templates.deleteTitle', { name: toDelete?.name ?? '' })} description={t('catalog.templates.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')}
        onConfirm={async () => { try { await del.mutateAsync(toDelete!.id); setToDelete(null); toast.success(t('catalog.templates.deleted')) } catch (e) { toast.error(errorMessage(e)) } }} />
      <ConfirmDialog open={!!toActivate} onClose={() => setToActivate(null)} loading={setStatusM.isPending} title={t('catalog.templates.activateTitle', { name: toActivate?.name ?? '' })} description={t('catalog.templates.activateHint')} confirmText={t('catalog.templates.activate')} cancelText={t('common.cancel')}
        onConfirm={() => toActivate && void setSt(toActivate, 'active')} />
    </Page>
  )
}
