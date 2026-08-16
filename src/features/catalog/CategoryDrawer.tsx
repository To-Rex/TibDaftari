import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import type { Category, Id, WorkflowKind } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { Button, Drawer, Field, Input, Select, Switch } from '@/shared/ui'
import { CATEGORY_ICON_NAMES, CATEGORY_ICONS, COLOR_SWATCHES, WORKFLOWS } from './icons'

export interface CategoryDraft {
  id?: Id
  name: string
  code: string
  parentId: Id | null
  icon: string
  color: string
  workflow: WorkflowKind
  isActive: boolean
}

export const draftFromCategory = (c?: Category | null, parentId: Id | null = null): CategoryDraft =>
  c
    ? { id: c.id, name: c.name, code: c.code ?? '', parentId: c.parentId, icon: c.icon ?? 'Folder', color: c.color ?? COLOR_SWATCHES[0]!, workflow: c.workflow, isActive: c.isActive }
    : { name: '', code: '', parentId, icon: 'FlaskConical', color: COLOR_SWATCHES[0]!, workflow: 'lab', isActive: true }

export function CategoryDrawer({ open, onClose, initial, categories, onSubmit, saving }: {
  open: boolean; onClose: () => void; initial: CategoryDraft | null; categories: Category[]; onSubmit: (d: CategoryDraft) => void; saving?: boolean
}) {
  const { t } = useTranslation()
  const [d, setD] = useState<CategoryDraft>(draftFromCategory())
  const [touched, setTouched] = useState(false)
  useEffect(() => { if (open && initial) { setD(initial); setTouched(false) } }, [open, initial])
  const set = <K extends keyof CategoryDraft>(k: K, v: CategoryDraft[K]) => setD((s) => ({ ...s, [k]: v }))
  const nameErr = touched && !d.name.trim() ? t('common.required') : undefined
  const parents = categories.filter((c) => c.id !== d.id)

  const submit = () => { setTouched(true); if (!d.name.trim()) return; onSubmit({ ...d, name: d.name.trim(), code: d.code.trim().toUpperCase() }) }

  return (
    <Drawer open={open} onClose={onClose} title={d.id ? t('catalog.tree.editCategory') : t('catalog.tree.newCategory')} description={t('catalog.tree.drawerHint')} width="max-w-lg"
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button onClick={submit} loading={saving}>{t('common.save')}</Button></>}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Field label={t('common.name')} required error={nameErr}>{(id) => <Input id={id} value={d.name} onChange={(e) => set('name', e.target.value)} invalid={!!nameErr} placeholder={t('catalog.tree.namePh')} autoFocus />}</Field>
          <Field label={t('catalog.tree.code')}>{(id) => <Input id={id} value={d.code} onChange={(e) => set('code', e.target.value)} mono placeholder="LAB" />}</Field>
        </div>
        <Field label={t('catalog.tree.parent')}>{(id) => (
          <Select id={id} value={d.parentId ?? ''} onChange={(e) => set('parentId', e.target.value || null)}>
            <option value="">{t('catalog.tree.rootLevel')}</option>
            {parents.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        )}</Field>
        <Field label={t('catalog.tree.workflow')} hint={t('catalog.tree.workflowHint')}>{(id) => (
          <Select id={id} value={d.workflow} onChange={(e) => set('workflow', e.target.value as WorkflowKind)}>
            {WORKFLOWS.map((w) => <option key={w} value={w}>{t(`catalog.tree.wf.${w}`)}{w !== 'lab' ? ` · ${t('catalog.tree.nextPhase')}` : ''}</option>)}
          </Select>
        )}</Field>
        <Field label={t('catalog.tree.icon')}>{() => (
          <div className="grid grid-cols-9 gap-1.5">
            {CATEGORY_ICON_NAMES.map((n) => { const I = CATEGORY_ICONS[n]!; const active = d.icon === n; return (
              <button key={n} type="button" onClick={() => set('icon', n)} title={n} className={cn('grid aspect-square place-items-center rounded-lg border transition-all', active ? 'border-brand bg-brand-soft text-brand-ink shadow-1' : 'border-line text-ink-2 hover:bg-surface-2 hover:border-line-strong')}><I className="size-4" /></button>
            ) })}
          </div>
        )}</Field>
        <Field label={t('catalog.tree.color')}>{() => (
          <div className="flex items-center gap-2 flex-wrap">
            {COLOR_SWATCHES.map((c) => (
              <button key={c} type="button" onClick={() => set('color', c)} className={cn('relative size-8 rounded-full ring-offset-2 ring-offset-bg-elevated transition-transform hover:scale-105', d.color === c && 'ring-2 ring-brand')} style={{ background: c }} aria-label={c}>
                {d.color === c && <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
        )}</Field>
        <Switch checked={d.isActive} onChange={(v) => set('isActive', v)} label={t('common.active')} description={t('catalog.tree.activeHint')} />
      </div>
    </Drawer>
  )
}
