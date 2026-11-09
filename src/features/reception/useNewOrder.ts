/**
 * "Yangi chek" flow shared by Reception / Patient pages: creates an empty cheque for a patient in the facility the
 * staff app works in (the shell picks it — `useStaffScope().scopeId`) and navigates to it.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Id } from '@/domain'
import { useAuth, useStaffScope } from '@/features/auth/store'
import { useCreateOrder } from '@/features/orders/queries'
import { routes } from '@/shared/config/routes'
import { toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'

export function useNewOrder() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { scopeId } = useStaffScope()
  const employeeId = useAuth((s) => s.staff?.employeeId ?? '')
  const create = useCreateOrder(scopeId, employeeId)

  const start = useCallback((patientId: Id) => {
    // the cheque is written in the scope facility — the API takes it from the path unit
    void create.mutateAsync({ patientId, serviceTypeIds: [] })
      .then((r) => { toast.success(t('staff.reception.orderCreated'), r.order.number); nav(routes.app.order(r.order.id)) })
      .catch((e: unknown) => toast.error(errorMessage(e)))
  }, [create, nav, t])

  return { start, creating: create.isPending }
}
