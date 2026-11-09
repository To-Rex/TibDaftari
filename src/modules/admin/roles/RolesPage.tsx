import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { ArrowLeft, Copy, Globe2, Lock, MapPin, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'
import { PERMISSIONS, type Permission, type Role } from '@/domain'
import { ApiError } from '@/data'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useDeleteRole, useRoles, useSaveRole } from '@/features/roles/queries'
import { PermissionMatrix } from '@/features/roles/PermissionMatrix'
import { useUnitTree, useUnitTreeShape } from '@/features/org/queries'
import { UnitLevelBadge } from '@/features/employees/UnitLevelBadge'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, MotionItem, MotionList, Page, PageHeader, SearchInput, Skeleton, Textarea, fadeUp, stagger, toast } from '@/shared/ui'

/** `scopeUnitId` null = system role (available in every unit); else the unit whose subtree may use it. */
interface Draft { id?: string; name: string; description: string; permissions: Permission[]; isSystem: boolean; key: string; scopeUnitId: string | null }
const toDraft = (r: Role): Draft => ({ id: r.id, name: r.name, description: r.description ?? '', permissions: [...r.permissions], isSystem: r.isSystem, key: r.key, scopeUnitId: r.scopeUnitId })
const sameDraft = (a: Draft, b: Draft) => a.name === b.name && a.description === b.description && a.permissions.join() === b.permissions.join()

/** Roles visible from the administered unit: system roles + the roles defined on its path and in its subtree. */
export default function RolesPage() {
  const { t } = useTranslation()
  const { scopeId } = useAdminScope()
  const { can } = usePermissions()
  const canWrite = can('admin.role.write')
  const roles = useRoles(scopeId)
  const tree = useUnitTree()
  const shape = useUnitTreeShape(tree.data)
  const saveRole = useSaveRole()
  const deleteRole = useDeleteRole(scopeId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState(false)
  /** < lg: master-detail collapses to list OR detail */
  const [view, setView] = useState<'list' | 'detail'>('list')

  const list = useMemo(() => [...(roles.data ?? [])].sort((a, b) => Number(b.isSystem) - Number(a.isSystem) || Number(b.scopeUnitId === null) - Number(a.scopeUnitId === null)), [roles.data])
  const countOf = (i: number) => list[i]?.employeeCount
  const scopeUnit = shape.byId.get(scopeId)
  /** where a role is defined: the system, or a unit of the tree (its name; the unit when it is known) */
  const originOf = (scopeUnitId: string | null) => {
    if (scopeUnitId === null) return { system: true as const, label: t('admin.roles.systemRole'), unit: undefined }
    const unit = shape.byId.get(scopeUnitId)
    return { system: false as const, label: unit?.name ?? t('admin.roles.otherUnit'), unit }
  }

  useEffect(() => {
    if (!list.length) return
    if (!selectedId && !draft) setSelectedId(list[0]!.id)
  }, [list, selectedId, draft])
  const selected = list.find((r) => r.id === selectedId)
  useEffect(() => { if (selected) setDraft(toDraft(selected)) }, [selected])

  const isSuper = draft?.key === 'superadmin'
  const readOnly = !canWrite || isSuper
  const dirty = draft && selected && draft.id ? !sameDraft(draft, toDraft(selected)) : !!draft && !draft.id

  const startNew = (from?: Role) => {
    setSelectedId(null)
    setView('detail')
    // a new role belongs to the administered unit (the API sets the scope from the path)
    setDraft({ name: from ? t('admin.roles.copyOf', { name: from.name }) : t('admin.roles.newName'), description: from?.description ?? '', permissions: from ? [...from.permissions] : [], isSystem: false, key: '', scopeUnitId: scopeId })
  }
  const submit = async () => {
    if (!draft) return
    if (!draft.name.trim()) return toast.error(t('admin.roles.nameRequired'))
    try {
      const r = await saveRole.mutateAsync({ scopeId, id: draft.id, name: draft.name.trim(), description: draft.description.trim() || undefined, permissions: draft.permissions })
      toast.success(t('admin.roles.saved'))
      setSelectedId(r.id)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  const remove = async () => {
    if (!draft?.id) return
    try {
      await deleteRole.mutateAsync(draft.id)
      toast.success(t('admin.roles.deleted'))
      setConfirm(false)
      setSelectedId(null)
      setDraft(null)
      setView('list')
    } catch (e) {
      setConfirm(false)
      toast.error(e instanceof ApiError && e.code === 'in_use' ? t('admin.roles.inUse') : errorMessage(e))
    }
  }

  const draftOrigin = draft ? originOf(draft.scopeUnitId) : null

  return (
    <Page>
      <PageHeader title={t('admin.roles.title')} description={t('admin.roles.subtitle')}
        actions={canWrite && <Button data-hotkey="n" leftIcon={<Plus className="size-4" />} onClick={() => startNew(selected)}>{t('admin.roles.newRole')}</Button>} />

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] 3xl:grid-cols-[340px_minmax(0,1fr)] items-start">
        {/* Roles list */}
        <Card padded={false} className={cn('overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto', view === 'detail' && 'max-lg:hidden')}>
          {roles.isLoading ? (
            <div className="p-3 space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (
            <MotionList variants={stagger} initial="hidden" animate="show" className="flex flex-col p-2">
              {list.map((r, i) => {
                const active = r.id === selectedId
                const origin = originOf(r.scopeUnitId)
                return (
                  <MotionItem key={r.id} variants={fadeUp}>
                    <button type="button" onClick={() => { setSelectedId(r.id); setView('detail') }} className={cn('relative w-full text-left flex items-center gap-3 rounded-[10px] px-3 py-2.5 min-h-11 transition-colors', active ? 'text-ink' : 'hover:bg-surface-2 text-ink-2')}>
                      {active && <motion.span layoutId="role-active" className="absolute inset-0 rounded-[10px] bg-brand-soft" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                      <span className={cn('relative grid size-9 shrink-0 place-items-center rounded-lg [&>svg]:size-4', r.key === 'superadmin' ? 'bg-accent/15 text-accent' : r.isSystem ? 'bg-brand text-white' : 'bg-surface-2 text-ink-3')}>{r.key === 'superadmin' ? <Lock /> : <ShieldCheck />}</span>
                      <span className="relative min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 min-w-0"><span className="text-[14px] font-medium truncate">{r.name}</span>{r.isSystem && <Badge size="sm" tone="brand">{t('admin.roles.system')}</Badge>}</span>
                        <span className="block text-[12px] text-ink-3 tabular truncate" title={origin.unit?.path}>{r.permissions.length} · {countOf(i) == null ? '…' : t('admin.roles.employeesCount', { count: countOf(i) })} · {origin.label}</span>
                      </span>
                    </button>
                  </MotionItem>
                )
              })}
              {draft && !draft.id && (
                <div className="relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 bg-brand-soft text-ink min-h-11">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-ink-3"><Plus className="size-4" /></span>
                  <span className="text-[14px] font-medium truncate">{draft.name || t('admin.roles.newName')}</span>
                </div>
              )}
            </MotionList>
          )}
        </Card>

        {/* Detail */}
        {!draft ? (
          <Card className={cn(view === 'list' && 'max-lg:hidden')}><EmptyState icon={<ShieldCheck />} title={t('admin.roles.empty')} description={t('admin.roles.emptyHint')} /></Card>
        ) : (
          <div className={cn('flex flex-col gap-4 min-w-0', view === 'list' && 'max-lg:hidden')}>
            <Card>
              <button type="button" onClick={() => setView('list')} className="lg:hidden mb-3 inline-flex h-10 items-center gap-1.5 -ml-1 px-1 text-[13.5px] font-medium text-brand-ink hover:underline underline-offset-4">
                <ArrowLeft className="size-4" />{t('admin.roles.title')}
              </button>
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                <div className="grid gap-4 sm:grid-cols-2 flex-1 min-w-0">
                  <Field label={t('admin.roles.name')} required>
                    {(id) => <Input id={id} value={draft.name} disabled={readOnly} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />}
                  </Field>
                  <Field label={t('admin.roles.description')} optionalText={t('common.optional')}>
                    {(id) => <Textarea id={id} rows={1} className="min-h-10" value={draft.description} disabled={readOnly} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />}
                  </Field>
                </div>
                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0 xl:pt-6">
                    {selected && <Button variant="secondary" size="sm" leftIcon={<Copy className="size-4" />} onClick={() => startNew(selected)}>{t('admin.roles.duplicate')}</Button>}
                    {selected && !selected.isSystem && <Button variant="ghost" size="sm" className="text-danger hover:bg-danger-soft" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirm(true)}>{t('admin.roles.delete')}</Button>}
                    {!isSuper && <Button size="sm" disabled={!dirty} loading={saveRole.isPending} onClick={submit}>{t('common.save')}</Button>}
                  </div>
                )}
              </div>
              {/* where the role is defined and therefore where it can be used */}
              {draftOrigin && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
                  {draftOrigin.system ? <Globe2 className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
                  <span>{t('admin.roles.definedAt')}:</span>
                  <Badge tone={draftOrigin.system ? 'brand' : 'neutral'} size="sm">{draftOrigin.label}</Badge>
                  {draftOrigin.unit && <UnitLevelBadge level={draftOrigin.unit.level} />}
                  <span className="basis-full sm:basis-auto">
                    {!draft.id
                      ? t('admin.roles.newRoleScope', { unit: scopeUnit?.name ?? '' })
                      : draftOrigin.system ? t('admin.roles.systemRoleHint') : t('admin.roles.unitRoleHint', { unit: draftOrigin.label })}
                  </span>
                </p>
              )}
              {isSuper && <p className="mt-3 flex items-center gap-2 text-[13px] text-ink-3"><Lock className="size-3.5" />{t('admin.roles.readonlySuper')}</p>}
            </Card>
            <div className="sticky top-16 z-20 -mx-1 px-1 py-2 bg-bg/90 backdrop-blur-md flex items-center gap-3 justify-between">
              <SearchInput value={search} onChange={setSearch} placeholder={t('admin.roles.search')} className="flex-1 min-w-0 sm:max-w-sm" />
              <div className="max-sm:hidden flex flex-wrap items-center gap-2 text-[13px] text-ink-3 tabular">
                <Users className="size-4" />{t('admin.roles.selected', { count: draft.permissions.length, total: PERMISSIONS.length })}
                {dirty && <Badge tone="warn" size="sm">{t('admin.roles.unsaved')}</Badge>}
              </div>
            </div>
            <div className="sm:hidden -mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-3 tabular">
              <Users className="size-4" />{t('admin.roles.selected', { count: draft.permissions.length, total: PERMISSIONS.length })}
              {dirty && <Badge tone="warn" size="sm">{t('admin.roles.unsaved')}</Badge>}
            </div>
            <PermissionMatrix mode="role" value={draft.permissions} onChange={(permissions) => setDraft({ ...draft, permissions })} search={search} readOnly={readOnly} />
          </div>
        )}
      </div>

      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={remove} danger loading={deleteRole.isPending}
        title={t('admin.roles.deleteConfirm', { name: draft?.name ?? '' })} description={t('admin.roles.deleteHint')} confirmText={t('common.delete')} cancelText={t('common.cancel')} />
    </Page>
  )
}
