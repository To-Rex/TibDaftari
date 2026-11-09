/**
 * SMS settings of the administered unit: its SMS account, its texts, the result-link window and the Telegram bot.
 * Everything under the unit inherits what is set here unless a unit below has its own; the facility picker
 * switches the page to one facility to give it its own account / texts.
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Hospital } from 'lucide-react'
import type { Id } from '@/domain'
import { facilitiesUnder, unitsUnder } from '@/domain'
import { useAdminScope, usePermissions } from '@/features/auth/store'
import { useUnit, useUnitTree } from '@/features/org/queries'
import { UnitPicker } from '@/features/org/UnitPicker'
import { UnitSmsAccountCard } from '@/features/org/UnitSmsAccountCard'
import { SmsTemplatesCard } from '@/features/org/SmsTemplatesCard'
import { DocumentLinkCard } from '@/features/org/DocumentLinkCard'
import { TelegramCard } from '@/features/org/TelegramCard'
import { UnitBreadcrumb } from '@/features/org/UnitBreadcrumb'
import { Button, Card, CardHeader, Page, PageHeader, Skeleton, Textarea, toast } from '@/shared/ui'

const CURL = `curl -X POST https://manager-xabarchi-backend-bula2s-f6aaa1-13-140-185-49.sslip.io/api/v1/public/messages \\
  -H "X-API-Key: xab_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "to": ["998901234567"], "text": "Natija tayyor", "priority": "transactional" }'`

export default function SmsSettingsPage() {
  const { t } = useTranslation()
  const { scopeId } = useAdminScope()
  const { can } = usePermissions()
  const canWrite = can('admin.settings.write')
  const tree = useUnitTree()
  const units = useMemo(() => tree.data ?? [], [tree.data])
  const scopeUnit = units.find((u) => u.id === scopeId)
  const facilities = useMemo(() => (scopeUnit && scopeUnit.level !== 'facility' ? facilitiesUnder(units, scopeId) : []), [units, scopeUnit, scopeId])
  // one facility for the whole page, or (null) the administered unit itself
  const [facilityId, setFacilityId] = useState<Id | null>(null)
  const targetId = facilityId && facilities.some((f) => f.id === facilityId) ? facilityId : scopeId
  const target = useUnit(targetId)
  const subtreeCount = Math.max(0, unitsUnder(units, targetId).length - 1)
  const [copied, setCopied] = useState(false)
  const copyCurl = async () => {
    await navigator.clipboard.writeText(CURL).catch(() => undefined)
    setCopied(true)
    toast.success(t('admin.sms.copied'))
    setTimeout(() => setCopied(false), 1500)
  }
  const u = target.data

  return (
    <Page width="medium">
      <PageHeader title={t('admin.sms.title')} description={t('admin.sms.subtitle')} />

      {facilities.length > 0 && scopeUnit && (
        <Card className="mb-5" data-sms-target>
          <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.targetTitle')} description={t('admin.sms.targetHint')} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <UnitPicker units={units} rootId={scopeId} levels={['facility']} value={facilityId} onChange={setFacilityId} allowEmpty
              placeholder={t('admin.sms.wholeUnit', { name: scopeUnit.name })} className="sm:max-w-md" data-testid="sms-facility" />
            {u && <UnitBreadcrumb units={units} unitId={u.id} compact className="min-w-0 sm:ml-auto" />}
          </div>
        </Card>
      )}

      {!u ? <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div> : (
        <div className="flex flex-col gap-5" data-sms-unit-id={u.id}>
          <UnitSmsAccountCard unit={u} readOnly={!canWrite} />
          <SmsTemplatesCard unit={u} subtreeCount={subtreeCount} readOnly={!canWrite} />
          {/* the {link} of the result SMS: how long it opens the PDF without a code */}
          <DocumentLinkCard unit={u} readOnly={!canWrite} />
          <TelegramCard unit={u} readOnly={!canWrite} />

          <Card>
            <CardHeader className="max-xs:flex-col max-xs:items-start" title={t('admin.sms.docsTitle')} description={t('admin.sms.docsText')}
              actions={<Button size="sm" variant="ghost" leftIcon={copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />} onClick={copyCurl}>{t('admin.sms.copyCurl')}</Button>} />
            <div className="w-full min-w-0 overflow-x-auto rounded-[var(--radius-sm)] border border-line bg-surface-2/60">
              <Textarea readOnly wrap="off" value={CURL} rows={4} className="font-mono text-[12.5px] leading-relaxed bg-transparent border-0 resize-none whitespace-pre overflow-x-auto min-w-[34rem]" />
            </div>
          </Card>
          {u.level !== 'facility' && facilities.length === 0 && (
            <p className="flex items-start gap-2 text-[12.5px] text-ink-3"><Hospital className="mt-0.5 size-4 shrink-0" />{t('admin.sms.noFacilities')}</p>
          )}
        </div>
      )}
    </Page>
  )
}
