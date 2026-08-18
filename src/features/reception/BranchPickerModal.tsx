import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { GitBranch, ChevronRight } from 'lucide-react'
import { repos } from '@/data'
import type { Id } from '@/domain'
import { Modal, Skeleton, fadeUp, stagger } from '@/shared/ui'

export function BranchPickerModal({ open, onClose, companyId, onPick, loading }: { open: boolean; onClose: () => void; companyId: Id; onPick: (branchId: Id) => void; loading?: boolean }) {
  const { t } = useTranslation()
  const branches = useQuery({ queryKey: ['branches', companyId], queryFn: () => repos.tenant.listBranches(companyId), enabled: open })
  const list = (branches.data ?? []).filter((b) => b.isActive)
  return (
    <Modal open={open} onClose={onClose} size="sm" title={t('staff.reception.pickBranch')} description={t('staff.reception.pickBranchHint')}>
      {branches.isLoading ? (
        <div className="flex flex-col gap-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-[var(--radius)]" />)}</div>
      ) : (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
          {list.map((b) => (
            <motion.li key={b.id} variants={fadeUp}>
              <button type="button" disabled={loading} onClick={() => onPick(b.id)} className="group flex w-full items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-brand/50 hover:shadow-2 disabled:opacity-60">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand-ink"><GitBranch className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{b.name}</span>
                  <span className="block text-[12px] text-ink-3">{b.code}{b.address ? ` · ${b.address}` : ''}</span>
                </span>
                <ChevronRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </Modal>
  )
}
