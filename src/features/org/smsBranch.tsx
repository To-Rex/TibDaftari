/**
 * Which branch the SMS settings page works on — shared by the branch key card and the texts card, so both edit the
 * same branch: the one selected in the top bar (a pinned branch admin: their own); with "All branches" a picker
 * chooses (switchers: every branch, others: their own ones), starting on the user's own branch.
 */
import { useMemo, useState } from 'react'
import { GitBranch } from 'lucide-react'
import type { Branch, Id } from '@/domain'
import { canSwitchBranch, useAuth } from '@/features/auth/store'
import { Select } from '@/shared/ui'
import { useBranches } from './queries'

export interface SmsBranchSelection {
  isLoading: boolean
  branch: Branch | undefined
  /** every branch of the company */
  all: Branch[]
  /** the branches this user may pick */
  mine: Branch[]
  switcher: boolean
  /** a picker is shown ("All branches" in the top bar and more than one branch to choose from) */
  canPick: boolean
  pick: (id: Id) => void
}

export function useSmsBranch(companyId: Id): SmsBranchSelection {
  const staff = useAuth((s) => s.staff)
  const shellBranchId = useAuth((s) => s.branchId)
  const branches = useBranches(companyId)
  const switcher = !!staff && canSwitchBranch(staff)
  const all = useMemo(() => branches.data ?? [], [branches.data])
  // the branches this user may edit: switchers (and staff without assigned branches) every one, others their own
  const mine = useMemo(() => {
    const assigned = staff?.branchIds ?? []
    const list = switcher || !assigned.length ? all : all.filter((b) => assigned.includes(b.id))
    const active = list.filter((b) => b.isActive)
    return active.length ? active : list
  }, [all, staff, switcher])
  const [picked, setPicked] = useState<string | null>(null)
  const branch: Branch | undefined = shellBranchId
    ? all.find((b) => b.id === shellBranchId)
    : mine.find((b) => b.id === picked) ?? mine.find((b) => b.id === staff?.branchId) ?? mine[0]
  return { isLoading: branches.isLoading, branch, all, mine, switcher, canPick: !shellBranchId && mine.length > 1, pick: setPicked }
}

/** The branch being edited: a picker under "All branches", otherwise its name and code. */
export function SmsBranchPicker({ sel, label }: { sel: SmsBranchSelection; label: string }) {
  const { branch } = sel
  if (!branch) return null
  return sel.canPick ? (
    <Select value={branch.id} onChange={(e) => sel.pick(e.target.value)} aria-label={label} className="h-9 w-auto min-w-0 max-w-full text-[13.5px]" data-sms-branch-select>
      {sel.mine.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.code}</option>)}
    </Select>
  ) : (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13.5px] font-medium text-ink">
      <GitBranch className="size-4 shrink-0 text-brand" /><span className="truncate">{branch.name}</span><span className="shrink-0 font-mono text-[12px] text-ink-3">{branch.code}</span>
    </span>
  )
}
