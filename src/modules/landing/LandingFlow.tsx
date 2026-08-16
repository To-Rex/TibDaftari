import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BadgeCheck, CheckCircle2, ClipboardPlus, FileCheck2, FlaskConical, LayoutTemplate, Stethoscope } from 'lucide-react'
import { Button } from '@/shared/ui'

const ease = [0.22, 1, 0.36, 1] as const

export function LandingFlow({ staffHref }: { staffHref: string }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const steps = [
    { icon: <ClipboardPlus />, title: t('landing.flowStepReceptionTitle'), text: t('landing.flowStepReceptionText') },
    { icon: <FlaskConical />, title: t('landing.flowStepLabTitle'), text: t('landing.flowStepLabText') },
    { icon: <Stethoscope />, title: t('landing.flowStepConfirmTitle'), text: t('landing.flowStepConfirmText') },
    { icon: <FileCheck2 />, title: t('landing.flowStepPortalTitle'), text: t('landing.flowStepPortalText') },
  ]

  return (
    <>
      <section id="oqim" className="scroll-mt-28 border-y border-line/80 bg-surface/45 py-20 sm:py-28">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8 xl:px-10">
          <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: reduce ? 0.01 : 0.7, ease }}
              className="lg:sticky lg:top-28 lg:self-start"
            >
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink">{t('landing.flowKicker')}</p>
              <h2 className="mt-4 max-w-lg text-[clamp(2rem,3.7vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
                {t('landing.flowTitle')}
              </h2>
              <p className="mt-5 max-w-md text-[16px] leading-[1.75] text-ink-2">{t('landing.flowText')}</p>
              <div className="mt-8 inline-flex items-center gap-2 rounded-xl border border-line bg-bg-elevated/70 px-3.5 py-3 text-[12.5px] text-ink-2 shadow-1">
                <BadgeCheck className="size-4 text-brand" />
                {t('landing.flowHint')}
              </div>
            </motion.div>

            <div className="relative grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div aria-hidden className="absolute left-[26px] top-8 hidden h-[calc(100%-4rem)] w-px bg-line sm:left-1/2 sm:block sm:-translate-x-1/2" />
              <motion.div
                aria-hidden
                initial={reduce ? false : { scaleY: 0 }}
                whileInView={reduce ? undefined : { scaleY: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: reduce ? 0.01 : 1.3, ease }}
                className="absolute left-[26px] top-8 hidden h-[calc(100%-4rem)] w-px origin-top bg-brand sm:left-1/2 sm:block sm:-translate-x-1/2"
              >
                <motion.span
                  initial={reduce ? false : { opacity: 0, y: -58, scale: 0.7 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: reduce ? 0.01 : 0.56, delay: reduce ? 0 : 0.82, ease }}
                  className="absolute -left-[3.5px] top-1/2 size-2 rounded-full bg-brand ring-4 ring-bg/80"
                />
              </motion.div>
              {steps.map((step, index) => (
                <motion.article
                  key={step.title}
                  initial={reduce ? false : { opacity: 0, y: 26 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  whileHover={reduce ? undefined : { y: -6, transition: { type: 'spring', stiffness: 240, damping: 20 } }}
                  whileTap={reduce ? undefined : { scale: 0.99 }}
                  viewport={{ once: true, margin: '-70px' }}
                  transition={{ duration: reduce ? 0.01 : 0.62, delay: reduce ? 0 : index * 0.08, ease }}
                  className="group relative overflow-hidden rounded-[24px] border border-line bg-bg-elevated/85 p-5 shadow-[0_18px_40px_-34px_rgb(20_32_29/0.55)] transition-[border-color,box-shadow] duration-300 hover:border-brand/35 hover:shadow-3 sm:p-6"
                >
                  <div className="flex items-start gap-5">
                    <span className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 [&>svg]:size-5">
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mt-7 text-[17px] font-semibold tracking-[-0.02em]">{step.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{step.text}</p>
                  <span aria-hidden className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 bg-brand transition-transform duration-500 group-hover:scale-x-100" />
                </motion.article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="andozalar" className="scroll-mt-28 py-20 sm:py-28">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8 xl:px-10">
          <div className="relative overflow-hidden rounded-[32px] border border-line bg-surface shadow-[0_32px_70px_-54px_rgb(20_32_29/0.55)]">
            <div aria-hidden className="absolute -right-24 -top-28 size-80 rounded-full bg-brand/10 blur-3xl" />
            <div aria-hidden className="absolute -bottom-32 left-[42%] size-72 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative grid gap-12 p-6 sm:p-9 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16 lg:p-14">
              <motion.div
                initial={reduce ? false : { opacity: 0, x: -22 }}
                whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: reduce ? 0.01 : 0.7, ease }}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-[12px] font-semibold text-brand-ink"><LayoutTemplate className="size-3.5" />{t('landing.templateKicker')}</span>
                <h2 className="mt-5 max-w-xl text-[clamp(2rem,3.6vw,3.35rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{t('landing.templateTitle')}</h2>
                <p className="mt-5 max-w-xl text-[16px] leading-[1.75] text-ink-2">{t('landing.templateText')}</p>
                <ul className="mt-7 space-y-3">
                  {[t('landing.templatePointOne'), t('landing.templatePointTwo'), t('landing.templatePointThree')].map((point) => (
                    <li key={point} className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />{point}</li>
                  ))}
                </ul>
                <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }} className="mt-9 inline-block">
                  <Link to={staffHref}>
                    <Button className="landing-cta" variant="secondary" rightIcon={<ArrowRight className="size-4" />}>{t('landing.templateCta')}</Button>
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                initial={reduce ? false : { opacity: 0, x: 28, rotate: 1.5 }}
                whileInView={reduce ? undefined : { opacity: 1, x: 0, rotate: 0 }}
                whileHover={reduce ? undefined : { y: -6, rotate: -0.45, transition: { type: 'spring', stiffness: 210, damping: 20 } }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: reduce ? 0.01 : 0.8, ease }}
                className="relative mx-auto w-full max-w-[600px]"
              >
                <div className="absolute -inset-5 rounded-[28px] bg-brand/10 blur-2xl" />
                <div className="relative overflow-hidden rounded-[24px] border border-line-strong/80 bg-bg-elevated p-3 shadow-3 sm:p-5">
                  <div className="flex items-center justify-between border-b border-line pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-brand text-white"><FileCheck2 className="size-4" /></span>
                      <div><p className="text-[13px] font-semibold">{t('landing.templateCanvasTitle')}</p><p className="text-[11.5px] text-ink-3">{t('landing.templateCanvasSubtitle')}</p></div>
                    </div>
                    <span className="rounded-md bg-ok-soft px-2 py-1 text-[11px] font-semibold text-ok">{t('landing.templateCanvasStatus')}</span>
                  </div>
                  <div className="mt-4 rounded-xl border border-line bg-surface p-4 sm:p-6">
                    <div className="mx-auto h-1.5 w-24 rounded-full bg-brand/25" />
                    <p className="mt-4 text-center text-[13px] font-semibold tracking-[0.06em]">{t('landing.templateDocumentTitle')}</p>
                    <div className="mt-5 grid gap-3 text-[11.5px] sm:grid-cols-2">
                      {[
                        [t('landing.templateFieldPatient'), t('landing.templateValuePatient')],
                        [t('landing.templateFieldDate'), t('landing.templateValueDate')],
                        [t('landing.templateFieldService'), t('landing.templateValueService')],
                        [t('landing.templateFieldDoctor'), t('landing.templateValueDoctor')],
                      ].map(([label, value], index) => (
                        <motion.div key={label} initial={reduce ? false : { opacity: 0, x: -8 }} whileInView={reduce ? undefined : { opacity: 1, x: 0 }} whileHover={reduce ? undefined : { y: -2, scale: 1.015, transition: { type: 'spring', stiffness: 280, damping: 21 } }} viewport={{ once: true }} transition={{ duration: reduce ? 0.01 : 0.4, delay: reduce ? 0 : 0.24 + index * 0.08 }} className="rounded-lg bg-surface-2/80 px-3 py-2.5">
                          <p className="text-[10px] font-medium uppercase tracking-[0.07em] text-ink-3">{label}</p>
                          <p className="mt-0.5 truncate font-semibold text-ink">{value}</p>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-4 overflow-hidden rounded-lg border border-line">
                      <div className="grid grid-cols-[1.35fr_0.65fr_0.7fr] bg-surface-2 px-3 py-2 text-[9.5px] font-semibold uppercase tracking-[0.06em] text-ink-3"><span>{t('landing.templateTableMetric')}</span><span className="text-right">{t('landing.templateTableResult')}</span><span className="text-right">{t('landing.templateTableRange')}</span></div>
                      {[['Gemoglobin', '138', '120-160'], ['Glyukoza', '5.4', '3.2-6.1'], ['ALT', '46', '< 40']].map(([metric, value, range], index) => (
                        <motion.div key={metric} initial={reduce ? false : { opacity: 0, x: 10 }} whileInView={reduce ? undefined : { opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: reduce ? 0.01 : 0.36, delay: reduce ? 0 : 0.55 + index * 0.08 }} className="grid grid-cols-[1.35fr_0.65fr_0.7fr] border-t border-line px-3 py-2 text-[11px]">
                          <span>{metric}</span><span className={index === 2 ? 'text-right font-semibold text-danger' : 'text-right font-semibold'}>{value}</span><span className="text-right text-ink-3">{range}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <motion.div animate={reduce ? undefined : { y: [0, -5, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }} className="absolute -bottom-5 -left-3 flex items-center gap-2 rounded-xl border border-line bg-bg-elevated px-3 py-2.5 text-[11.5px] shadow-3 sm:-left-8">
                  <BadgeCheck className="size-4 text-ok" />
                  <span><b className="font-semibold">{t('landing.templateStampTitle')}</b><span className="ml-1 text-ink-3">{t('landing.templateStampText')}</span></span>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
