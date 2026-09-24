import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import type { Patient } from '@/domain'
import { Button, Card, EmptyState, Kbd, Page, PageHeader } from '@/shared/ui'
import { cn } from '@/shared/lib/cn'
import { usePermissions } from '@/features/auth/store'
import { useStaffSession } from '@/features/session/useSession'
import { PatientDrawer } from '@/features/patients/PatientDrawer'
import { PatientSearchPanel } from '@/features/reception/PatientSearchPanel'
import { PatientSummary } from '@/features/reception/PatientSummary'
import { BranchPickerModal } from '@/features/reception/BranchPickerModal'
import { useNewOrder } from '@/features/reception/useNewOrder'
import { ShortcutsButton, ShortcutsHelp } from '@/features/reception/ShortcutsHelp'

export default function ReceptionPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const [selected, setSelected] = useState<Patient | null>(null)
  const [drawer, setDrawer] = useState<{ open: boolean; patient: Patient | null }>({ open: false, patient: null })
  const inputRef = useRef<HTMLInputElement>(null)
  const newOrder = useNewOrder()
  const [help, setHelp] = useState(false)

  const canCreatePatient = can('reception.patient.write')
  const canCreateOrder = can('reception.order.create')
  // page shortcuts (outside inputs, no modifier): "/" search · N new patient · C new cheque for the picked patient · ? help
  const startOrder = newOrder.start
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === '/') { e.preventDefault(); inputRef.current?.focus(); return }
      if (drawer.open || newOrder.pickerOpen || help) return
      const k = e.key.toLowerCase()
      if (k === 'n' && canCreatePatient) { e.preventDefault(); setDrawer({ open: true, patient: null }) }
      else if (k === 'c' && selected && canCreateOrder) { e.preventDefault(); startOrder(selected.id) }
      else if (e.key === '?') { e.preventDefault(); setHelp(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [drawer.open, newOrder.pickerOpen, help, selected, canCreatePatient, canCreateOrder, startOrder])
  // < lg: master-detail collapses to ONE pane — the list, or (when a patient is picked) the detail with a back button
  const detailOnSmall = !!selected

  return (
    <Page width="wide" className="lg:h-[calc(100dvh-64px)] lg:overflow-hidden flex flex-col">
      <PageHeader title={t('staff.reception.title')} description={t('staff.reception.subtitle')} className="mb-4"
        actions={<span className="inline-flex items-center gap-2"><span className="max-md:hidden text-[12.5px] text-ink-3 inline-flex items-center gap-1.5">{t('staff.reception.shortcutHint')} <Kbd>/</Kbd></span><ShortcutsButton onClick={() => setHelp(true)} /></span>} />
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] 3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className={cn('flex min-h-[420px] min-w-0 flex-col lg:min-h-0', detailOnSmall && 'max-lg:hidden')} padded>
          <PatientSearchPanel companyId={companyId} selectedId={selected?.id} onSelect={setSelected} onNew={() => setDrawer({ open: true, patient: null })} inputRef={inputRef} canCreate={canCreatePatient} />
        </Card>
        <div className={cn('min-h-0 min-w-0', !detailOnSmall && 'max-lg:hidden')}>
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              <div key={selected.id} className="flex h-full min-h-0 flex-col gap-3">
                <div className="lg:hidden">
                  <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="size-4" />} onClick={() => setSelected(null)}>{t('common.back')}</Button>
                </div>
                <div className="min-h-0 flex-1">
                  <PatientSummary companyId={companyId} patient={selected} onNewOrder={() => newOrder.start(selected.id)} creating={newOrder.creating} canCreate={canCreateOrder} canEdit={canCreatePatient} onEdit={() => setDrawer({ open: true, patient: selected })} />
                </div>
              </div>
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
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
      <BranchPickerModal open={newOrder.pickerOpen} onClose={newOrder.closePicker} companyId={companyId} onPick={newOrder.pickBranch} loading={newOrder.creating} />
    </Page>
  )
}
