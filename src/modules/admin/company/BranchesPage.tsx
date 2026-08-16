import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, GitBranch, MapPin, Pencil, Phone, Plus } from 'lucide-react'
import type { Branch } from '@/domain'
import { useStaffSession } from '@/features/session/useSession'
import { usePermissions } from '@/features/auth/store'
import { useBranches } from '@/features/org/queries'
import { BranchDrawer, orderNumberExample } from '@/features/org/BranchDrawer'
import { fmtNumber } from '@/shared/lib/format'
import { Badge, Button, Card, EmptyState, IconButton, MotionItem, MotionList, Page, PageHeader, Skeleton, fadeUp, stagger } from '@/shared/ui'

export default function BranchesPage() {
  const { t } = useTranslation()
  const { companyId } = useStaffSession()
  const { can } = usePermissions()
  const canWrite = can('admin.branch.write')
  const branches = useBranches(companyId)
  const [drawer, setDrawer] = useState<{ open: boolean; branch: Branch | null }>({ open: false, branch: null })

  const openNew = () => setDrawer({ open: true, branch: null })
  const openEdit = (b: Branch) => setDrawer({ open: true, branch: b })

  return (
    <Page width="medium">
      <PageHeader title={t('admin.branches.title')} description={t('admin.branches.subtitle')}
        actions={canWrite && <Button leftIcon={<Plus className="size-4" />} onClick={openNew}>{t('admin.branches.add')}</Button>} />

      {branches.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-48 rounded-[var(--radius-lg)]" />)}</div>
      ) : !branches.data?.length ? (
        <Card><EmptyState icon={<GitBranch />} title={t('admin.branches.empty')} description={t('admin.branches.emptyHint')} action={canWrite && <Button onClick={openNew} leftIcon={<Plus className="size-4" />}>{t('admin.branches.add')}</Button>} /></Card>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-ink-3 tabular">{t('admin.branches.count', { count: branches.data.length })}</p>
          <MotionList variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2">
            {branches.data.map((b) => (
              <MotionItem key={b.id} variants={fadeUp}>
                <Card interactive={canWrite} onClick={canWrite ? () => openEdit(b) : undefined} className="h-full flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-mono text-[14px] font-semibold text-brand-ink">{b.code}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15.5px] font-semibold truncate">{b.name}</h3>
                        <Badge tone={b.isActive ? 'ok' : 'neutral'} size="sm" dot>{b.isActive ? t('common.active') : t('common.inactive')}</Badge>
                      </div>
                      <p className="text-[12.5px] text-ink-3 mt-0.5 font-mono">{orderNumberExample(b.code, b.orderSeq)}</p>
                    </div>
                    {canWrite && <IconButton label={t('common.edit')} size="sm" onClick={(e) => { e.stopPropagation(); openEdit(b) }}><Pencil /></IconButton>}
                  </div>
                  <ul className="flex flex-col gap-1.5 text-[13.5px] text-ink-2">
                    <li className="flex items-center gap-2"><MapPin className="size-4 text-ink-3 shrink-0" /><span className="truncate">{b.address || t('common.notSet')}</span></li>
                    <li className="flex items-center gap-2"><Phone className="size-4 text-ink-3 shrink-0" /><span className="tabular">{b.phone || t('common.notSet')}</span></li>
                    <li className="flex items-center gap-2"><Clock className="size-4 text-ink-3 shrink-0" /><span>{b.timezone}</span></li>
                  </ul>
                  <div className="mt-auto flex items-center justify-between rounded-[var(--radius-sm)] bg-surface-2/70 px-3 py-2 text-[12.5px]">
                    <span className="text-ink-3">{t('admin.branches.lastSeq')}</span>
                    <span className="font-mono tabular font-medium">{b.code}-{String(b.orderSeq).padStart(6, '0')} <span className="text-ink-3 font-sans">({fmtNumber(b.orderSeq)})</span></span>
                  </div>
                </Card>
              </MotionItem>
            ))}
          </MotionList>
        </>
      )}

      <BranchDrawer open={drawer.open} onClose={() => setDrawer((d) => ({ ...d, open: false }))} companyId={companyId} branch={drawer.branch} />
    </Page>
  )
}
