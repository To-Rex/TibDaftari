/** Typed motion variants (mirror of shared/ui/Page `stagger`/`fadeUp`, with a properly typed easing). */
import type { Variants } from 'motion/react'

export const EASE = [0.22, 1, 0.36, 1] as const

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
}
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
}
