import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { router } from './router'
import { QueryProvider } from './providers/QueryProvider'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { ToastViewport, BrandMark } from '@/shared/ui'
import { useAuth } from '@/features/auth/store'
import '@/shared/i18n'

function Splash() {
  return (
    <motion.div key="splash" exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.35 }} className="fixed inset-0 z-[200] grid place-items-center bg-bg">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <BrandMark size={44} />
      </motion.div>
    </motion.div>
  )
}

export function App() {
  const hydrated = useAuth((s) => s.hydrated)
  const hydrate = useAuth((s) => s.hydrate)
  useEffect(() => void hydrate(), [hydrate])
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <QueryProvider>
          <AnimatePresence>{!hydrated && <Splash />}</AnimatePresence>
          {hydrated && <RouterProvider router={router} />}
          <ToastViewport />
        </QueryProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
