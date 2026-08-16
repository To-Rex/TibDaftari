/**
 * "Chek bo'yicha hujjat" — shown on the confirmation screen when an active ORDER-scoped
 * template covers the selected item. Lists all covered items of the order, previews the
 * combined document and approves them together (one document, one SMS).
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BadgeCheck, Layers } from 'lucide-react'
import type { Id, Order, OrderItem, Patient } from '@/domain'
import { usePermissions } from '@/features/auth/store'
import { ItemStatusBadge } from '@/features/lab/ItemStatusBadge'
import { Badge, Button, Card, ConfirmDialog, Select, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { DocumentPreview } from './DocumentPreview'
import { useApproveOrder, useOrderScopeItems, useOrderScopeTemplates } from './orderScope'

export function OrderScopePanel({ companyId, employeeId, item, order, patient, onApproved }: {
  companyId: Id
  employeeId: Id
  item: OrderItem
  order: Order | undefined
  patient: Patient | undefined
  onApproved?: (approvedIds: Id[]) => void
}) {
  const { t } = useTranslation()
  const { can } = usePermissions()
  const templates = useOrderScopeTemplates(companyId, item)
  const [templateId, setTemplateId] = useState<string | undefined>()
  const list = templates.data ?? []
  const template = list.find((x) => x.id === templateId) ?? list[0]
  useEffect(() => { if (list[0] && !list.some((x) => x.id === templateId)) setTemplateId(list[0].id) }, [list, templateId])
  const { items, covered, loading } = useOrderScopeItems(companyId, order?.id, template)
  const approve = useApproveOrder()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const submitted = useMemo(() => covered.filter((i) => i.status === 'submitted'), [covered])
  const approved = useMemo(() => covered.filter((i) => i.status === 'approved'), [covered])
  const pending = useMemo(() => covered.filter((i) => i.status === 'pending' || i.status === 'entered' || i.status === 'rejected'), [covered])

  if (!template || !order) return null
  const canApprove = can('confirm.result.approve') && submitted.length > 0

  const doApprove = async () => {
    try {
      const res = await approve.mutateAsync({ orderId: order.id, employeeId, templateId: template.id })
      setConfirmOpen(false)
      toast.success(t('clinical.confirm.orderApproved', { n: res.items.filter((i) => i.status === 'approved').length }), res.document.title)
      onApproved?.(res.items.map((i) => i.id))
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <Card padded={false} className="overflow-hidden border-brand/40">
      <div className="flex flex-col gap-3 border-b border-line bg-brand-soft/30 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-ink"><Layers className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold leading-5">{t('clinical.confirm.orderScopeTitle')}</p>
            <p className="text-[12.5px] text-ink-3">{t('clinical.confirm.orderScopeHint', { n: covered.length, submitted: submitted.length, approved: approved.length })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {list.length > 1 && (
            <Select value={template.id} onChange={(e) => setTemplateId(e.target.value)} className="h-9 text-[13px] sm:w-64">
              {list.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </Select>
          )}
          {canApprove && (
            <Button leftIcon={<BadgeCheck className="size-4" />} loading={approve.isPending} onClick={() => setConfirmOpen(true)}>
              {t('clinical.confirm.approveOrder', { n: submitted.length })}
            </Button>
          )}
        </div>
      </div>

      <ul className="divide-y divide-line/70 px-3 sm:px-4">
        {covered.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
            <span className="min-w-0 truncate">{i.serviceName}</span>
            <span className="flex shrink-0 items-center gap-2">
              {i.id === item.id && <Badge size="sm" tone="brand">{t('clinical.confirm.currentItem')}</Badge>}
              <ItemStatusBadge status={i.status} />
            </span>
          </li>
        ))}
      </ul>
      {pending.length > 0 && <p className="px-3 pb-3 text-[12.5px] text-warn sm:px-4">{t('clinical.confirm.orderScopePending', { n: pending.length })}</p>}

      <div className="border-t border-line bg-surface-2/50 p-3 sm:p-5">
        <div className="mx-auto max-w-[794px]">
          <DocumentPreview companyId={companyId} item={item} order={order} patient={patient} schema={null} fixedTemplate={template} showTemplateSelect={false} items={items} loadingItems={loading} />
        </div>
      </div>

      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={() => void doApprove()} loading={approve.isPending}
        title={t('clinical.confirm.approveOrder', { n: submitted.length })} description={t('clinical.confirm.approveOrderHint', { template: template.name })}
        confirmText={t('clinical.confirm.approve')} cancelText={t('common.cancel')} />
    </Card>
  )
}
