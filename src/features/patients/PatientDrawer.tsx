/**
 * Drawer that hosts PatientForm for create/edit.
 *  - A passport / PINFL that already belongs to someone is a duplicate: open the existing patient instead.
 *  - A phone number that already belongs to someone is a family number: open the right person, or — for a new
 *    person — say who they are to someone on it (required without a passport / PINFL). The same panel lets an
 *    edit fix the relation, and asks again when the number is changed to someone else's.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { ApiError, repos } from '@/data'
import type { Id, Patient, PatientUpsertInput } from '@/domain'
import { Avatar, Button, Drawer, Kbd, toast } from '@/shared/ui'
import { errorMessage } from '@/shared/lib/errors'
import { fmtPhone } from '@/shared/lib/format'
import { FamilyLinkPanel, orderMates, type FamilyLinkValue, type Mate } from './FamilyLinkPanel'
import { PatientForm, type PatientDraft } from './PatientForm'
import { useCreatePatient, useUpdatePatient } from './queries'

export interface PatientDrawerProps {
  open: boolean
  onClose: () => void
  /** the facility the staff app works in — a new patient is registered there */
  scopeId: Id
  /** when set, the drawer edits this patient; otherwise creates a new one */
  patient?: Patient | null
  onSaved: (p: Patient) => void
  /** invoked when the user picks an existing patient instead of creating */
  onPickExisting?: (p: Patient) => void
}

const FORM_ID = 'patient-form'
const sameDoc = (a?: string | null, b?: string | null) => !!a && !!b && a.replace(/\s/g, '').toUpperCase() === b.replace(/\s/g, '').toUpperCase()

export function PatientDrawer({ open, onClose, scopeId, patient, onSaved, onPickExisting }: PatientDrawerProps) {
  const { t } = useTranslation()
  const create = useCreatePatient(scopeId)
  const update = useUpdatePatient(patient?.id ?? '')
  const editing = !!patient
  const [found, setFound] = useState<Patient[]>([])
  const [extraMates, setExtraMates] = useState<Mate[]>([])
  const [warnedDocs, setWarnedDocs] = useState(false)
  const [checking, setChecking] = useState(false)
  const [draft, setDraft] = useState<PatientDraft>({ phone: '', fullName: '' })
  const [link, setLink] = useState<FamilyLinkValue>({ relation: patient?.relation ?? null, relatedPatientId: patient?.relatedPatientId ?? null })
  const [samePersonId, setSamePersonId] = useState<Id | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) { setFound([]); setExtraMates([]); setWarnedDocs(false); setSamePersonId(null); setDraft({ phone: '', fullName: '' }) }
    else setLink({ relation: patient?.relation ?? null, relatedPatientId: patient?.relatedPatientId ?? null })
  }, [open, patient])
  const onDraftChange = useCallback((d: PatientDraft) => setDraft(d), [])

  // live lookup while typing: the people on the number, and anyone holding the passport / PINFL
  const phone = draft.phone || ''
  useEffect(() => {
    if (!open) return
    const docs = !editing && ((draft.passportNumber && draft.passportNumber.length >= 9) || (draft.pinfl && draft.pinfl.length === 14))
    if (!phone && !docs) { setFound([]); return }
    let alive = true
    const h = setTimeout(() => {
      const q = editing ? { phone } : { phone, passportNumber: draft.passportNumber, pinfl: draft.pinfl }
      void repos.patients.findDuplicates(scopeId, q).then((r) => { if (alive) setFound(r.filter((p) => p.id !== patient?.id)) }).catch(() => undefined)
    }, 350)
    return () => { alive = false; clearTimeout(h) }
  }, [phone, draft.passportNumber, draft.pinfl, scopeId, editing, open, patient?.id])
  useEffect(() => { setSamePersonId(null); setExtraMates([]) }, [phone])

  // a passport / PINFL match is the same person; a phone match is a family member
  const docDupes = useMemo(() => (editing ? [] : found.filter((p) => sameDoc(p.passportNumber, draft.passportNumber) || (!!draft.pinfl && p.pinfl === draft.pinfl))), [found, draft.passportNumber, draft.pinfl, editing])
  const mates = useMemo<Mate[]>(() => {
    const byId = new Map<Id, Mate>()
    for (const p of found) if (p.phone === phone && !docDupes.some((d) => d.id === p.id)) byId.set(p.id, p)
    for (const m of extraMates) if (!byId.has(m.id) && m.id !== patient?.id) byId.set(m.id, m)
    return orderMates([...byId.values()])
  }, [found, extraMates, phone, docDupes, patient?.id])
  const documented = !!(draft.passportNumber?.trim() || draft.pinfl?.trim())
  const needsRelation = mates.length > 0 && !documented
  // keep the chosen person inside the list (the number may have changed)
  useEffect(() => {
    if (link.relatedPatientId && mates.length && !mates.some((m) => m.id === link.relatedPatientId)) setLink((l) => ({ ...l, relatedPatientId: null }))
  }, [mates, link.relatedPatientId])

  const openExisting = async (m: Mate) => {
    if (!onPickExisting) return
    try { onPickExisting(found.find((p) => p.id === m.id) ?? await repos.patients.get(m.id)) } catch (e) { toast.error(errorMessage(e)) }
  }

  const familyFields = (): Pick<PatientUpsertInput, 'relation' | 'relatedPatientId'> => {
    // nobody else on the number: no relation to send (the API drops an old one when the number changes)
    if (!mates.length) return {}
    if (!link.relation) return editing ? { relation: null, relatedPatientId: null } : {}
    return { relation: link.relation, relatedPatientId: link.relatedPatientId ?? mates[0]?.id ?? null }
  }

  const fail = (e: unknown) => {
    if (e instanceof ApiError && e.code === 'phone_relation_required') {
      const people = ((e.details as { patients?: Mate[] } | undefined)?.patients ?? [])
      setExtraMates(people)
      toast.warning(t('staff.patients.family.pickRelation'), e.message)
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (e instanceof ApiError && e.code === 'duplicate_person') {
      const d = e.details as { patientId?: Id; patient?: Mate } | undefined
      if (d?.patient) setExtraMates((xs) => [...xs.filter((x) => x.id !== d.patient!.id), d.patient!])
      setSamePersonId(d?.patientId ?? null)
      toast.warning(t('staff.patients.family.duplicatePerson'), e.message)
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    toast.error(errorMessage(e))
  }

  const submit = async (input: PatientUpsertInput) => {
    if (needsRelation && !link.relation) {
      toast.warning(t('staff.patients.family.pickRelation'), t('staff.patients.family.pickRelationHint'))
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    try {
      if (editing) {
        const changedFamily = link.relation !== (patient?.relation ?? null) || (link.relatedPatientId ?? null) !== (patient?.relatedPatientId ?? null) || input.phone !== patient?.phone
        const p = await update.mutateAsync({ ...input, ...(changedFamily ? familyFields() : {}) })
        toast.success(t('staff.patients.form.savedEdit'))
        onSaved(p)
      } else {
        // a passport / PINFL that already exists: show who has it first (the second click creates anyway)
        if (!warnedDocs && (input.passportNumber || input.pinfl)) {
          setChecking(true)
          const again = await repos.patients.findDuplicates(scopeId, { passportNumber: input.passportNumber, pinfl: input.pinfl })
          setChecking(false)
          if (again.length) { setFound((f) => [...again, ...f.filter((x) => !again.some((a) => a.id === x.id))]); setWarnedDocs(true); return }
        }
        const p = await create.mutateAsync({ ...input, ...familyFields() })
        toast.success(t('staff.patients.form.savedNew'), p.fullName)
        onSaved(p)
      }
    } catch (e) {
      setChecking(false)
      fail(e)
    }
  }
  const busy = create.isPending || update.isPending || checking
  const showDocs = !editing && docDupes.length > 0

  return (
    <Drawer open={open} onClose={onClose} width="w-full max-w-2xl"
      title={editing ? t('staff.patients.form.titleEdit') : t('staff.patients.form.titleNew')}
      description={editing ? patient?.fullName : t('staff.patients.form.subtitleNew')}
      footer={
        <>
          <span className="mr-auto hidden items-center gap-1.5 whitespace-nowrap text-[12px] text-ink-3 lg:inline-flex" title={t('staff.reception.shortcuts.auto')}>
            <Kbd>Enter</Kbd> {t('staff.reception.shortcuts.nextShort')} <span className="mx-1">·</span> <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> {editing ? t('common.save') : t('staff.patients.form.create')}
          </span>
          <Button variant="ghost" onClick={onClose} className="max-sm:px-2">{t('common.cancel')}</Button>
          <Button type="submit" form={FORM_ID} loading={busy} size="lg" className="min-w-40 max-sm:min-w-0 max-sm:flex-1 max-sm:px-3" data-patient-submit>
            {editing ? t('common.save') : showDocs && warnedDocs ? t('staff.patients.form.createAnyway') : mates.length && link.relation ? t('staff.patients.family.createRelative') : t('staff.patients.form.create')}
          </Button>
        </>
      }
    >
      <AnimatePresence initial={false}>
        {showDocs && (
          <motion.div key="dupes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mb-6 rounded-[var(--radius)] border border-warn/30 bg-warn-soft/60 p-4" data-doc-dupes={docDupes.length}>
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-warn">
                <AlertTriangle className="size-4" /> {t('staff.patients.form.dupTitle')}
              </div>
              <p className="mt-1 text-[12.5px] text-ink-2">{t('staff.patients.form.dupHintDocs')}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {docDupes.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => onPickExisting?.(p)} className="group flex w-full items-center gap-3 rounded-lg bg-surface px-3 py-2 text-left shadow-1 transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-2">
                      <Avatar name={p.fullName} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{p.fullName}</span>
                        <span className="block text-[12px] text-ink-3 tabular">{fmtPhone(p.phone)}{p.passportNumber ? ` · ${p.passportNumber}` : ''}{p.pinfl ? ` · ${p.pinfl}` : ''}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-medium text-brand-ink opacity-0 transition-opacity group-hover:opacity-100 max-sm:hidden">{t('staff.patients.form.openExisting')} <ArrowRight className="size-3.5" /></span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <PatientForm key={patient?.id ?? 'new'} formId={FORM_ID} patient={patient} onSubmit={(v) => void submit(v)} onDraftChange={onDraftChange}
        family={mates.length > 0 ? (
          <div ref={panelRef}>
            <FamilyLinkPanel mates={mates} value={link} onChange={(v) => { setLink(v); setSamePersonId(null) }} required={needsRelation}
              draftName={draft.fullName ?? ''} draftGender={draft.gender} samePersonId={samePersonId} editing={editing}
              onOpen={!editing && onPickExisting ? (m) => void openExisting(m) : undefined} />
          </div>
        ) : null} />
    </Drawer>
  )
}
