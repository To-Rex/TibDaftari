/** The per-template action menu — the same entries on a gallery card and in a list row. */
import type { TFunction } from 'i18next'
import { Archive, CheckCircle2, Copy, Download, ExternalLink, Trash2 } from 'lucide-react'
import type { ResultTemplate } from '@/domain'
import type { MenuItem } from '@/shared/ui'

export interface TemplateActions {
  onOpen: () => void
  onDuplicate: () => void
  onSetStatus: (s: ResultTemplate['status']) => void
  onDelete: () => void
  onExport?: () => void
}

export function templateMenuItems(tpl: ResultTemplate, t: TFunction, { canWrite, canPublish }: { canWrite: boolean; canPublish: boolean }, a: TemplateActions): MenuItem[] {
  return [
    { key: 'open', label: t('catalog.templates.open'), icon: <ExternalLink />, onSelect: a.onOpen },
    { key: 'dup', label: t('catalog.templates.duplicate'), icon: <Copy />, onSelect: a.onDuplicate, disabled: !canWrite },
    { key: 'export', label: t('catalog.templates.export'), icon: <Download />, onSelect: a.onExport },
    ...(tpl.status === 'active'
      ? [{ key: 'arch', label: t('catalog.templates.archive'), icon: <Archive />, onSelect: () => a.onSetStatus('archived'), disabled: !canPublish, separatorBefore: true }]
      : [{ key: 'act', label: t('catalog.templates.activate'), icon: <CheckCircle2 />, onSelect: () => a.onSetStatus('active'), disabled: !canPublish, separatorBefore: true }]),
    { key: 'del', label: t('common.delete'), icon: <Trash2 />, danger: true, onSelect: a.onDelete, disabled: !canWrite || tpl.status === 'active', separatorBefore: true },
  ]
}
