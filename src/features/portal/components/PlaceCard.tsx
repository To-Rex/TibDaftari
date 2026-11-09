/** Where the cheque was made: the organisation (letterhead — logo, phone, address) and the facility under it. */
import { useTranslation } from 'react-i18next'
import { Hospital, MapPin, Phone } from 'lucide-react'
import type { PortalOrg, PortalUnit } from '@/data'
import { cn } from '@/shared/lib/cn'
import { fmtPhone } from '@/shared/lib/format'
import { Avatar, Card } from '@/shared/ui'

export function PlaceCard({ org, unit, className }: { org?: PortalOrg | null; unit?: PortalUnit | null; className?: string }) {
  const { t } = useTranslation()
  if (!org && !unit) return null
  // a facility right under a region node carries the organisation's own name — one card then, not two
  const sameName = !!org && !!unit && org.name === unit.name
  return (
    <Card padded={false} className={cn('px-4 py-3 xs:px-5', className)} data-portal-place>
      <h2 className="text-ink-3 py-2 text-[13px] font-semibold tracking-[0.06em] uppercase">{t('portal.common.place')}</h2>
      <div className="divide-line divide-y">
        {org && !sameName && (
          <div className="flex items-start gap-3 py-3">
            <Avatar name={org.name} src={org.logoUrl ?? undefined} size="md" className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-ink-3 text-[11.5px] font-medium tracking-[0.05em] uppercase">{t('portal.common.org')}</p>
              <p className="text-ink break-words text-[14px] font-semibold">{org.name}</p>
              <Contact phone={org.phone} address={org.address} />
            </div>
          </div>
        )}
        {unit && (
          <div className="flex items-start gap-3 py-3">
            {sameName && org ? (
              <Avatar name={org.name} src={org.logoUrl ?? undefined} size="md" className="rounded-xl" />
            ) : (
              <span className="bg-brand-soft text-brand-ink grid size-10 shrink-0 place-items-center rounded-xl"><Hospital className="size-[18px]" /></span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-ink-3 text-[11.5px] font-medium tracking-[0.05em] uppercase">{t('portal.common.unit')}</p>
              <p className="text-ink break-words text-[14px] font-semibold">{unit.name}</p>
              <Contact phone={unit.phone ?? (sameName ? org?.phone : undefined)} address={unit.address ?? (sameName ? org?.address : undefined)} />
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function Contact({ phone, address }: { phone?: string | null; address?: string | null }) {
  if (!phone && !address) return null
  return (
    <p className="text-ink-2 mt-1 flex flex-col gap-0.5 text-[12.5px]">
      {address && <span className="inline-flex items-start gap-1.5"><MapPin className="text-ink-3 mt-0.5 size-3.5 shrink-0" />{address}</span>}
      {phone && <a href={`tel:${phone}`} className="tabular hover:text-ink inline-flex items-center gap-1.5"><Phone className="text-ink-3 size-3.5 shrink-0" />{fmtPhone(phone)}</a>}
    </p>
  )
}
