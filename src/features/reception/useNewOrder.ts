/**
 * "Yangi chek" flow shared by Reception / Patient pages:
 * creates an empty order for a patient and navigates to it. When the session
 * has no branch scope (admin viewing all branches) a branch picker is shown first.
 */
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Id } from '@/domain'
import { useStaffSession } from '@/features/session/useSession'
import { useCreateOrder } from '@/features/orders/queries'
import { routes } from '@/shared/config/routes'
import { toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'

export function useNewOrder() {
  const { t } = useTranslation()
  const nav = useNavigate()
  const { companyId, employeeId, branchId } = useStaffSession()
  const create = useCreateOrder(companyId, employeeId)
  const [pendingPatient, setPendingPatient] = useState<Id | null>(null)

  const createFor = useCallback(async (patientId: Id, branch: Id) => {
    try {
      const r = await create.mutateAsync({ patientId, branchId: branch, serviceTypeIds: [] })
      toast.success(t('staff.reception.orderCreated'), r.order.number)
      nav(routes.app.order(r.order.id))
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }, [create, nav, t])

  /** Entry point: opens branch picker if needed, otherwise creates immediately. */
  const start = useCallback((patientId: Id) => {
    if (branchId) void createFor(patientId, branchId)
    else setPendingPatient(patientId)
  }, [branchId, createFor])

  const pickBranch = useCallback((branch: Id) => {
    if (!pendingPatient) return
    const p = pendingPatient
    setPendingPatient(null)
    void createFor(p, branch)
  }, [pendingPatient, createFor])

  return { start, creating: create.isPending, pickerOpen: pendingPatient !== null, closePicker: () => setPendingPatient(null), pickBranch }
}
