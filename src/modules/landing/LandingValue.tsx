import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowRight, BarChart3, BellRing, Building2, CheckCircle2, HeartPulse, LayoutTemplate, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { Button } from '@/shared/ui'

const ease = [0.22, 1, 0.36, 1] as const

type LandingValueProps = {
  patientHref: string
  staffHref: string
}

export function LandingValue({ patientHref, staffHref }: LandingValueProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 22 },
    whileInView: reduce ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-75px' },
    transition: { duration: reduce ? 0.01 : 0.68, delay: reduce ? 0 : delay, ease },
  })

  const patientPoints = [t('landing.patientPointOne'), t('landing.patientPointTwo'), t('landing.patientPointThree')]
  const clinicPoints = [t('landing.clinicPointOne'), t('landing.clinicPointTwo'), t('landing.clinicPointThree'), t('landing.clinicPointFour')]

  return (
    <>
      <section id="imkoniyat" className="scroll-mt-28 py-20 sm:py-28">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8 xl:px-10">
          <motion.div {...reveal()} className="max-w-2xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink">{t('landing.audienceKicker')}</p>
            <h2 className="mt-4 text-[clamp(2rem,3.8vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{t('landing.audienceTitle')}</h2>
            <p className="mt-5 max-w-xl text-[16px] leading-[1.75] text-ink-2">{t('landing.audienceText')}</p>
          </motion.div>

          <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <motion.article
              {...reveal(0.06)}
              whileHover={reduce ? undefined : { y: -6, transition: { type: 'spring', stiffness: 220, damping: 20 } }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
              className="group relative overflow-hidden rounded-[30px] border border-line bg-surface p-6 shadow-[0_24px_56px_-46px_rgb(20_32_29/0.5)] transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-3 sm:p-8"
            >
              <div aria-hidden className="absolute -right-16 -top-16 size-48 rounded-full bg-brand/10 blur-3xl transition-transform duration-700 group-hover:scale-125" />
              <div className="relative flex h-full flex-col">
                <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink"><UserRoundCheck className="size-5" /></span>
                <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('landing.patientOverline')}</p>
                <h3 className="mt-3 max-w-md text-[28px] font-semibold leading-[1.05] tracking-[-0.035em]">{t('landing.patientTitle')}</h3>
                <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-2">{t('landing.patientText')}</p>
                <ul className="mt-7 space-y-3">
                  {patientPoints.map((point, index) => (
                    <motion.li
                      key={point}
                      initial={reduce ? false : { opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: reduce ? 0.01 : 0.42, delay: reduce ? 0 : 0.2 + index * 0.07, ease }}
                      className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-2"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />{point}
                    </motion.li>
                  ))}
                </ul>
                <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }} className="mt-9 inline-block self-start">
                  <Link to={patientHref}>
                    <Button className="landing-cta" variant="soft" rightIcon={<ArrowRight className="size-4" />}>{t('landing.patientCta')}</Button>
                  </Link>
                </motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -2, scale: 1.01 }} transition={{ type: 'spring', stiffness: 280, damping: 21 }} className="mt-9 flex items-end gap-3 rounded-2xl border border-line bg-surface-2/70 p-3.5">
                  <span className="grid size-9 place-items-center rounded-xl bg-bg-elevated text-brand shadow-1"><HeartPulse className="size-4" /></span>
                  <div className="min-w-0"><p className="text-[11px] font-semibold">{t('landing.patientPreviewTitle')}</p><p className="mt-0.5 text-[11px] text-ink-3">{t('landing.patientPreviewText')}</p></div>
                  <span className="ml-auto size-2 rounded-full bg-ok" />
                </motion.div>
              </div>
            </motion.article>

            <motion.article
              {...reveal(0.13)}
              whileHover={reduce ? undefined : { y: -6, rotate: 0.25, transition: { type: 'spring', stiffness: 220, damping: 20 } }}
              whileTap={reduce ? undefined : { scale: 0.99 }}
              className="group relative overflow-hidden rounded-[30px] border border-brand/20 bg-brand p-6 text-white shadow-[0_28px_62px_-44px_rgb(15_122_107/0.8)] sm:p-8"
            >
              <div aria-hidden className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgb(255_255_255/0.12)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.12)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(125deg,black,transparent_70%)]" />
              <div aria-hidden className="absolute -bottom-24 -right-20 size-72 rounded-full border-[28px] border-white/10" />
              <div className="relative flex h-full flex-col">
                <span className="grid size-12 place-items-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/20"><Building2 className="size-5" /></span>
                <p className="mt-8 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">{t('landing.clinicOverline')}</p>
                <h3 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.05] tracking-[-0.035em]">{t('landing.clinicTitle')}</h3>
                <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed text-white/75">{t('landing.clinicText')}</p>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {clinicPoints.map((point, index) => (
                    <motion.div
                      key={point}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      whileHover={reduce ? undefined : { y: -2, scale: 1.01, transition: { type: 'spring', stiffness: 280, damping: 21 } }}
                      viewport={{ once: true }}
                      transition={{ duration: reduce ? 0.01 : 0.42, delay: reduce ? 0 : 0.18 + index * 0.07, ease }}
                      className="flex items-start gap-2.5 rounded-xl border border-white/12 bg-white/8 p-3 text-[12.5px] leading-relaxed text-white/90 backdrop-blur-sm"
                    >
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-white/70" />{point}
                    </motion.div>
                  ))}
                </div>
                <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }} className="mt-8 inline-block self-start">
                  <Link to={staffHref}>
                    <Button className="landing-cta bg-white text-brand-strong shadow-none hover:bg-white/90" rightIcon={<ArrowRight className="size-4" />}>{t('landing.clinicCta')}</Button>
                  </Link>
                </motion.div>
              </div>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface-2/35 py-20 sm:py-28">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8 xl:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <motion.div {...reveal()}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brand-ink">{t('landing.managementKicker')}</p>
              <h2 className="mt-4 max-w-lg text-[clamp(2rem,3.7vw,3.4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">{t('landing.managementTitle')}</h2>
              <p className="mt-5 max-w-md text-[16px] leading-[1.75] text-ink-2">{t('landing.managementText')}</p>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <motion.article
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduce ? undefined : { y: -5, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, margin: '-75px' }}
                transition={{ duration: reduce ? 0.01 : 0.58, delay: reduce ? 0 : 0.05, ease }}
                className="group relative overflow-hidden rounded-[22px] border border-line bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-brand/30 hover:shadow-2 sm:col-span-2"
              >
                <div aria-hidden className="absolute -right-8 -top-12 size-40 rounded-full bg-brand/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-ink transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110"><Building2 className="size-4.5" /></span>
                <h3 className="mt-6 text-[17px] font-semibold">{t('landing.managementCardOneTitle')}</h3>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-2">{t('landing.managementCardOneText')}</p>
                <div className="mt-5 flex items-center gap-2 text-[11.5px] font-medium text-brand-ink"><span className="rounded-md bg-brand-soft px-2 py-1">{t('landing.managementCardOneChipOne')}</span><span className="rounded-md bg-brand-soft px-2 py-1">{t('landing.managementCardOneChipTwo')}</span><span className="rounded-md bg-brand-soft px-2 py-1">{t('landing.managementCardOneChipThree')}</span></div>
              </motion.article>
              <motion.article
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduce ? undefined : { y: -5, rotate: -0.25, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, margin: '-75px' }}
                transition={{ duration: reduce ? 0.01 : 0.58, delay: reduce ? 0 : 0.11, ease }}
                className="group rounded-[22px] border border-line bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-ok/40 hover:shadow-2"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-ok-soft text-ok transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"><ShieldCheck className="size-4.5" /></span>
                <h3 className="mt-6 text-[16px] font-semibold">{t('landing.managementCardTwoTitle')}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{t('landing.managementCardTwoText')}</p>
              </motion.article>
              <motion.article
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduce ? undefined : { y: -5, rotate: 0.25, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, margin: '-75px' }}
                transition={{ duration: reduce ? 0.01 : 0.58, delay: reduce ? 0 : 0.17, ease }}
                className="group rounded-[22px] border border-line bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-info/40 hover:shadow-2"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-info-soft text-info transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110"><BarChart3 className="size-4.5" /></span>
                <h3 className="mt-6 text-[16px] font-semibold">{t('landing.managementCardThreeTitle')}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{t('landing.managementCardThreeText')}</p>
              </motion.article>
              <motion.article
                initial={{ opacity: 0, y: reduce ? 0 : 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={reduce ? undefined : { y: -5, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
                viewport={{ once: true, margin: '-75px' }}
                transition={{ duration: reduce ? 0.01 : 0.58, delay: reduce ? 0 : 0.23, ease }}
                className="group rounded-[22px] border border-line bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-warn/40 hover:shadow-2 sm:col-span-2"
              >
                <div className="flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warn-soft text-warn transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110"><LayoutTemplate className="size-4.5" /></span><div><h3 className="text-[16px] font-semibold">{t('landing.managementCardFourTitle')}</h3><p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{t('landing.managementCardFourText')}</p></div></div>
              </motion.article>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1340px] px-5 sm:px-8 xl:px-10">
          <motion.div {...reveal()} className="relative overflow-hidden rounded-[32px] border border-brand/20 bg-brand px-6 py-10 text-center text-white shadow-[0_30px_68px_-46px_rgb(15_122_107/0.85)] sm:px-10 sm:py-16">
            <div aria-hidden className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_20%_25%,rgb(255_255_255/0.32)_0,transparent_22%),radial-gradient(circle_at_78%_80%,rgb(255_255_255/0.18)_0,transparent_25%)]" />
            <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                initial={{ opacity: 0, scale: reduce ? 1 : 0.88, rotate: reduce ? 0 : -12 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: reduce ? 0.01 : 1.1, delay: reduce ? 0 : 0.12, ease }}
                className="size-[38rem] rounded-full border border-white/10"
              />
            </div>
            <div className="relative mx-auto max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/90"><LockKeyhole className="size-3.5" />{t('landing.finalKicker')}</span>
              <h2 className="mt-5 text-[clamp(2.1rem,4.6vw,4.3rem)] font-semibold leading-[0.98] tracking-[-0.05em]">{t('landing.finalTitle')}</h2>
              <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-[1.75] text-white/78">{t('landing.finalText')}</p>
              <div className="mt-9 flex flex-wrap justify-center gap-3">
                <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}><Link to={patientHref}><Button size="lg" className="landing-cta bg-white text-brand-strong shadow-none hover:bg-white/90" rightIcon={<ArrowRight className="size-4" />}>{t('landing.finalPatientCta')}</Button></Link></motion.div>
                <motion.div whileHover={reduce ? undefined : { y: -3, scale: 1.015 }} whileTap={reduce ? undefined : { scale: 0.985 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }}><Link to={staffHref}><Button size="lg" className="landing-cta border border-white/20 bg-white/10 text-white shadow-none hover:bg-white/18" variant="ghost">{t('landing.finalStaffCta')}</Button></Link></motion.div>
              </div>
              <p className="mt-6 inline-flex items-center gap-2 text-[12px] text-white/65"><BellRing className="size-3.5" />{t('landing.finalHint')}</p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  )
}
