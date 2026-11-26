/**
 * The signed-in employee's training status. Asked only while they are in the training; re-read after every write
 * they make (that is when a task gets done) and when they come back to the tab.
 */
import { useEffect } from 'react'
import { create } from 'zustand'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Id } from '@/domain'
import { repos } from '@/data'
import { onStaffWrite } from '@/data/http/client'
import { useInTraining } from '@/features/auth/store'

export const trainingKeys = {
  all: ['training'] as const,
  status: (unitId: Id | null) => ['training', 'status', unitId] as const,
}

/** The checklist drawer — opened from the top bar's chip and from the banner. */
export const useTrainingPanel = create<{ open: boolean; setOpen: (open: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}))

export function useTrainingStatus(unitId: Id | null, ready = true) {
  const active = useInTraining()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: trainingKeys.status(unitId),
    queryFn: () => repos.training.status(unitId),
    enabled: active && ready,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 90_000,
  })
  useEffect(() => {
    if (!active) return
    const timers = new Set<number>()
    const reread = () => void qc.invalidateQueries({ queryKey: trainingKeys.all })
    // the server ticks a task once the request is committed, which can be a moment after its answer left: look
    // right away for the usual case and once more a little later
    const off = onStaffWrite(() => {
      for (const delay of [300, 2200]) {
        const id = window.setTimeout(() => { timers.delete(id); reread() }, delay)
        timers.add(id)
      }
    })
    return () => { off(); timers.forEach((id) => window.clearTimeout(id)) }
  }, [active, qc])
  return query
}
