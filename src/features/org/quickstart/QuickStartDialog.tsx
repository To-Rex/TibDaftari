/**
 * «Tezkor ishga tushirish» — one dialog, five short steps, ONE request: where the facility opens (missing region /
 * district nodes are created on the way), its profile, the default accounts with one shared password, the sample
 * facility whose catalogue and templates are copied, a review — then the sign-in sheet to hand out.
 */
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import type { OrgUnit, QuickStartResult } from '@/domain'
import { ApiError } from '@/data'
import { useDistricts, useRegions } from '@/features/patients/queries'
import { routes } from '@/shared/config/routes'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Modal, toast } from '@/shared/ui'
import { STEPS, emptyDraft, stepProblem, toInput, withProposals, type Draft, type Step } from './draft'
import { useQuickStart, useQuickStartPreview } from './queries'
import { CatalogStep, ReviewStep } from './QuickStartCatalog'
import { QuickStartDone } from './QuickStartDone'
import { FacilityStep, LocationStep, StaffStep } from './QuickStartSteps'

export interface QuickStartDialogProps {
  open: boolean
  onClose: () => void
  /** the unit it opens under at first (a country / region / district node); null = the user picks */
  parent?: OrgUnit | null
  /** every unit the user may open a facility under */
  parents: OrgUnit[]
  /** the visible tree — tells whether the chosen geo already has a node */
  units: OrgUnit[]
  onDone?: (r: QuickStartResult) => void
}

type ParentLevel = 'country' | 'region' | 'district'

export function QuickStartDialog({ open, onClose, parent = null, parents, units, onDone }: QuickStartDialogProps) {
  const { t } = useTranslation()
  const nav = useNavigate()
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(parent?.id ?? null))
  const [step, setStep] = useState<Step>('location')
  const [result, setResult] = useState<QuickStartResult | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [codeTaken, setCodeTaken] = useState(false)
  const run = useQuickStart()

  const reset = (keepParent = true) => {
    setDraft(emptyDraft(keepParent ? (parent?.id ?? draft.parentId) : null))
    setStep('location')
    setResult(null)
    setCodeTaken(false)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setDraft(emptyDraft(parent?.id ?? null)); setStep('location'); setResult(null); setCodeTaken(false) } }, [open, parent?.id])

  const parentUnit = useMemo(() => parents.find((p) => p.id === draft.parentId) ?? (parent && parent.id === draft.parentId ? parent : null), [parents, parent, draft.parentId])
  const level = (parentUnit?.level ?? null) as ParentLevel | null
  const geo = { regionId: level === 'country' ? draft.regionId || undefined : undefined, districtId: level && level !== 'district' ? draft.districtId || undefined : undefined }
  const preview = useQuickStartPreview(draft.parentId, geo, open && !!level)
  const regions = useRegions(parentUnit?.countryId, { enabled: open && level === 'country' })
  const regionGeoId = level === 'country' ? draft.regionId : parentUnit?.regionId ?? undefined
  const districts = useDistricts(regionGeoId || undefined, { enabled: open && !!regionGeoId && level !== 'district' })
  const regionName = level === 'country' ? regions.data?.find((r) => r.id === draft.regionId)?.name : parentUnit?.level === 'region' ? parentUnit.name : parentUnit?.regionName ?? undefined
  const districtName = level === 'district' ? parentUnit?.name : districts.data?.find((d) => d.id === draft.districtId)?.name

  // logins / names follow the code until the user types their own; the first sample is proposed once
  useEffect(() => { setDraft((d) => withProposals(d, preview.data)) }, [draft.code, draft.shortName, preview.data])
  useEffect(() => {
    if (preview.data && draft.sampleId === '') setDraft((d) => ({ ...d, sampleId: preview.data!.samples[0]?.id ?? null }))
  }, [preview.data, draft.sampleId])

  const patch = (fn: (d: Draft) => Draft) => { setCodeTaken(false); setDraft(fn) }
  const idx = STEPS.indexOf(step)
  const problem = stepProblem(step, draft, level, preview.data?.roles)
  const [showProblem, setShowProblem] = useState(false)
  const next = () => {
    if (problem) { setShowProblem(true); return }
    setShowProblem(false)
    setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]!)
  }
  const back = () => { setShowProblem(false); setStep(STEPS[Math.max(0, idx - 1)]!) }
  const submit = async () => {
    if (!draft.parentId || !level) return
    try {
      const r = await run.mutateAsync({ parentId: draft.parentId, input: toInput(draft, preview.data, level) })
      setResult(r)
      onDone?.(r)
      toast.success(t('admin.quickStart.doneTitle'), r.facility.name)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && /kod/i.test(e.message)) { setCodeTaken(true); setStep('facility'); setShowProblem(true) }
      else toast.error(errorMessage(e))
    }
  }

  const stepper = (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none]" data-qs-stepper>
      {STEPS.map((s, i) => {
        const done = i < idx
        const cur = s === step
        return (
          <li key={s} className="flex items-center gap-1">
            {i > 0 && <span className={cn('h-px w-4 sm:w-6', done || cur ? 'bg-brand' : 'bg-line')} />}
            <button type="button" disabled={i > idx} onClick={() => { if (i < idx) { setShowProblem(false); setStep(s) } }}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[12.5px] font-medium transition-colors', cur ? 'border-brand bg-brand-soft/60 text-brand-ink' : done ? 'border-line text-ink-2 hover:bg-surface-2' : 'border-line text-ink-3')} data-qs-step-btn={s} aria-current={cur ? 'step' : undefined}>
              <span className={cn('grid size-5 place-items-center rounded-full text-[11px]', cur ? 'bg-brand text-white' : done ? 'bg-ok text-white' : 'bg-surface-2 text-ink-3')}>{done ? <Check className="size-3" /> : i + 1}</span>
              <span className={cn(!cur && 'max-sm:hidden')}>{t(`admin.quickStart.steps.${s}`)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )

  const body = result ? <QuickStartDone result={result} /> : (
    <div className="flex flex-col gap-5">
      {stepper}
      {step === 'location' && <LocationStep draft={draft} patch={patch} parent={parentUnit} parents={parents} units={units} problem={showProblem ? problem : null} />}
      {step === 'facility' && <FacilityStep draft={draft} patch={patch} problem={showProblem ? problem : null} codeTaken={codeTaken} />}
      {step === 'staff' && <StaffStep draft={draft} patch={patch} roles={preview.data?.roles} problem={showProblem ? problem : null} showPassword={showPassword} onTogglePassword={() => setShowPassword((v) => !v)} />}
      {step === 'catalog' && <CatalogStep draft={draft} patch={patch} preview={preview.data} loading={preview.isLoading} />}
      {step === 'review' && <ReviewStep draft={draft} parent={parentUnit} preview={preview.data} units={units} regionName={regionName} districtName={districtName} />}
    </div>
  )

  const footer = result ? (
    <>
      <Button variant="ghost" onClick={() => reset(true)} data-qs-another>{t('admin.quickStart.another')}</Button>
      <span className="flex-1" />
      <Button variant="secondary" onClick={onClose}>{t('common.close')}</Button>
      <Button leftIcon={<ChevronRight className="size-4" />} onClick={() => { onClose(); nav(routes.admin.unitDetail(result.facility.id)) }} data-qs-go>{t('admin.quickStart.goToFacility')}</Button>
    </>
  ) : (
    <>
      <Button variant="ghost" onClick={idx === 0 ? onClose : back} leftIcon={idx > 0 ? <ChevronLeft className="size-4" /> : undefined} data-qs-back>{idx === 0 ? t('common.cancel') : t('common.back')}</Button>
      <span className="flex-1" />
      {step !== 'review'
        ? <Button onClick={next} rightIcon={<ChevronRight className="size-4" />} data-qs-next>{t('common.next')}</Button>
        : <Button onClick={() => void submit()} loading={run.isPending} leftIcon={<Rocket className="size-4" />} data-qs-run>{run.isPending ? t('admin.quickStart.running') : t('admin.quickStart.run')}</Button>}
    </>
  )

  return (
    <Modal open={open} onClose={onClose} size="xl" title={result ? undefined : <span className="inline-flex items-center gap-2"><Rocket className="size-5 text-brand" />{t('admin.quickStart.title')}</span>} description={result ? undefined : t('admin.quickStart.subtitle')} footer={footer} className="app-quick-start">
      {body}
    </Modal>
  )
}
