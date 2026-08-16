import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Layers, Plus } from 'lucide-react'
import type { AttributeSchema } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { useSaveSchema, useSchemas } from '@/features/catalog/queries'
import { SchemaCard } from '@/features/schema-editor/SchemaCard'
import { routes } from '@/shared/config/routes'
import { errorMessage } from '@/shared/lib/errors'
import { Button, EmptyState, Page, PageHeader, SearchInput, Segmented, Skeleton, Toolbar, toast } from '@/shared/ui'
import { MotionList, stagger } from '@/shared/ui/Page'

type StatusFilter = 'all' | AttributeSchema['status']

export default function SchemasPage() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.schema.write')
  const schemas = useSchemas(companyId)
  const save = useSaveSchema(companyId)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (schemas.data ?? [])
      .filter((s) => status === 'all' || s.status === status)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [schemas.data, search, status])

  const counts = useMemo(() => {
    const c = { all: 0, draft: 0, published: 0, archived: 0 }
    for (const s of schemas.data ?? []) { c.all++; c[s.status]++ }
    return c
  }, [schemas.data])

  const createNew = async () => {
    try {
      const s = await save.mutateAsync({ name: t('catalog.schemas.newName'), fields: [] })
      nav(routes.admin.schema(s.id))
    } catch (e) { toast.error(errorMessage(e)) }
  }
  const duplicate = async (s: AttributeSchema) => {
    try {
      const copy = await save.mutateAsync({ name: `${s.name} (${t('catalog.schemas.copySuffix')})`, description: s.description, fields: structuredClone(s.fields) })
      toast.success(t('catalog.schemas.duplicated'))
      nav(routes.admin.schema(copy.id))
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <Page>
      <PageHeader title={t('catalog.schemas.title')} description={t('catalog.schemas.subtitle')}
        actions={canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={createNew} loading={save.isPending}>{t('catalog.schemas.new')}</Button>} />
      <Toolbar actions={<Segmented size="sm" value={status} onChange={setStatus} items={(['all', 'draft', 'published', 'archived'] as const).map((s) => ({ value: s, label: `${s === 'all' ? t('common.all') : t(`common.${s}`)} · ${counts[s]}` }))} />}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('catalog.schemas.searchPh')} className="md:w-72" />
      </Toolbar>

      {schemas.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-[var(--radius-lg)]" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Layers />} title={t('catalog.schemas.emptyTitle')} description={search || status !== 'all' ? t('common.emptyHint') : t('catalog.schemas.emptyHint')}
          action={canWrite && !search && status === 'all' && <Button leftIcon={<Plus className="size-4" />} onClick={createNew}>{t('catalog.schemas.new')}</Button>} />
      ) : (
        <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => <SchemaCard key={s.id} schema={s} canWrite={canWrite} onOpen={() => nav(routes.admin.schema(s.id))} onDuplicate={() => void duplicate(s)} />)}
        </MotionList>
      )}
    </Page>
  )
}
