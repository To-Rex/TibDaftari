import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Modal, Textarea, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { useCancelOrder } from '@/features/orders/queries'

export function CancelOrderModal({ open, onClose, orderId, orderNumber }: { open: boolean; onClose: () => void; orderId: string; orderNumber: string }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const cancel = useCancelOrder(orderId)
  const submit = async () => {
    try {
      await cancel.mutateAsync(reason.trim() || t('staff.reception.cancelDefaultReason'))
      toast.success(t('staff.reception.cancelled'), orderNumber)
      onClose()
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }
  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.reception.cancelOrder')} description={t('staff.reception.cancelHint', { number: orderNumber })}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.back')}</Button><Button variant="danger" loading={cancel.isPending} onClick={() => void submit()}>{t('staff.reception.cancelConfirm')}</Button></>}>
      <Field label={t('staff.reception.cancelReason')}>
        {(id) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder={t('staff.reception.cancelReasonPh')} />}
      </Field>
    </Modal>
  )
}
