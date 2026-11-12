/**
 * Settings → Yordamchi (AI): for superadmins the PLATFORM account first (entered once, used by every unit without a
 * closer one), then the model account of the administered unit (inherited by everything under it).
 */
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { AssistantAccountCard } from '@/features/assistant/AssistantAccountCard'
import { useUnit, useUnitTree } from '@/features/org/queries'
import { UnitBreadcrumb } from '@/features/org/UnitBreadcrumb'
import { Card, CardHeader, Page, PageHeader, Skeleton } from '@/shared/ui'

export default function AssistantSettingsPage() {
  const { t } = useTranslation()
  const { scopeId } = useAdminScope()
  const { can, isSuperAdmin } = usePermissions()
  const tree = useUnitTree()
  const units = useMemo(() => tree.data ?? [], [tree.data])
  const unit = useUnit(scopeId)
  const u = unit.data
  return (
    <Page width="medium">
      <PageHeader title={t('assistant.settings.title')} description={t('assistant.settings.subtitle')} />
      {!u ? <Skeleton className="h-64" /> : (
        <div className="flex flex-col gap-5" data-assistant-settings>
          {isSuperAdmin && <AssistantAccountCard target={{ kind: 'platform' }} />}
          <UnitBreadcrumb units={units} unitId={u.id} compact />
          <AssistantAccountCard target={{ kind: 'unit', unit: u }} readOnly={!can('admin.settings.write')} />
          <Card>
            <CardHeader title={<span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-ok" />{t('assistant.settings.howTitle')}</span>} />
            <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] text-ink-2">
              <li>{t('assistant.settings.how0')}</li><li>{t('assistant.settings.how1')}</li><li>{t('assistant.settings.how2')}</li><li>{t('assistant.settings.how3')}</li><li>{t('assistant.settings.how4')}</li>
            </ol>
          </Card>
        </div>
      )}
    </Page>
  )
}
