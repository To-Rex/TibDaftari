import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ClipboardList } from 'lucide-react'
import type { Patient } from '@/domain'
import { Card, EmptyState, Kbd, Page, PageHeader } from '@/shared/ui'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { PatientDrawer } from '@/features/patients/PatientDrawer'
import { PatientSearchPanel } from '@/features/reception/PatientSearchPanel'
import { PatientSummary } from '@/features/reception/PatientSummary'
import { BranchPickerModal } from '@/features/reception/BranchPickerModal'
import { useNewOrder } from '@/features/reception/useNewOrder'

export default function ReceptionPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const [selected, setSelected] = useState<Patient | null>(null)
  const [drawer, setDrawer] = useState<{ open: boolean; patient: Patient | null }>({ open: false, patient: null })
  const inputRef = useRef<HTMLInputElement>(null)
  const newOrder = useNewOrder()

  // "/" focuses search from anywhere on the page
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const canCreatePatient = can('reception.patient.write')
  const canCreateOrder = can('reception.order.create')

  return (
    <Page width="wide" className="lg:h-[calc(100dvh-64px)] lg:overflow-hidden flex flex-col">
      <PageHeader title={t('staff.reception.title')} description={t('staff.reception.subtitle')} className="mb-4"
        actions={<span className="max-md:hidden text-[12.5px] text-ink-3 inline-flex items-center gap-1.5">{t('staff.reception.shortcutHint')} <Kbd>/</Kbd></span>} />
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="flex min-h-[420px] flex-col lg:min-h-0" padded>
          <PatientSearchPanel companyId={companyId} selectedId={selected?.id} onSelect={setSelected} onNew={() => setDrawer({ open: true, patient: null })} inputRef={inputRef} canCreate={canCreatePatient} />
        </Card>
        <div className="min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <PatientSummary key={selected.id} companyId={companyId} patient={selected} onNewOrder={() => newOrder.start(selected.id)} creating={newOrder.creating} canCreate={canCreateOrder} canEdit={canCreatePatient} onEdit={() => setDrawer({ open: true, patient: selected })} />
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <Card className="grid h-full min-h-[320px] place-items-center border-dashed bg-transparent shadow-none">
                  <EmptyState icon={<ClipboardList />} title={t('staff.reception.pickPatientTitle')} description={t('staff.reception.pickPatientHint')} />
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <PatientDrawer open={drawer.open} onClose={() => setDrawer((d) => ({ ...d, open: false }))} companyId={companyId} patient={drawer.patient}
        onSaved={(p) => { setSelected(p); setDrawer({ open: false, patient: null }) }}
        onPickExisting={(p) => { setSelected(p); setDrawer({ open: false, patient: null }) }} />
      <BranchPickerModal open={newOrder.pickerOpen} onClose={newOrder.closePicker} companyId={companyId} onPick={newOrder.pickBranch} loading={newOrder.creating} />
    </Page>
  )
}
