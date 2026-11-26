/**
 * The «?» of the top bar: the way back to the tours. It opens the general tour (the menu and the top bar) or the tour
 * of the page on screen, and holds the switch for whether a new page shows its tour by itself. Renders nothing for a
 * reader without tours (a superadmin).
 */
import { useTranslation } from 'react-i18next'
import { CircleHelp, Compass, MousePointerClick } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { IconButton, Menu } from '@/shared/ui'
import { useTour } from './TourProvider'

export function TourButton() {
  const { t } = useTranslation()
  const tour = useTour()
  if (!tour.enabled) return null
  return (
    <Menu
      align="end"
      trigger={() => <IconButton label={t('tour.ui.help')} data-tour="top-help"><CircleHelp /></IconButton>}
      items={[
        { key: 'page', icon: <MousePointerClick />, disabled: !tour.hasPageTour, onSelect: tour.startPage,
          label: <span className="flex flex-col"><span>{t('tour.ui.page')}</span><span className="text-[12px] text-ink-3">{t(tour.hasPageTour ? 'tour.ui.pageSub' : 'tour.ui.pageNone')}</span></span> },
        { key: 'general', icon: <Compass />, onSelect: tour.startGeneral,
          label: <span className="flex flex-col"><span>{t('tour.ui.general')}</span><span className="text-[12px] text-ink-3">{t('tour.ui.generalSub')}</span></span> },
        { key: 'auto', separatorBefore: true, onSelect: () => tour.setAuto(!tour.auto),
          label: (
            <span className="flex flex-1 items-center justify-between gap-4" role="switch" aria-checked={tour.auto}>
              <span className="max-w-[13.5rem] whitespace-normal leading-snug">{t('tour.ui.auto')}</span>
              <span aria-hidden className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', tour.auto ? 'bg-brand' : 'bg-surface-3')}>
                <span className={cn('absolute top-0.5 size-4 rounded-full bg-white shadow-1 transition-[left]', tour.auto ? 'left-[18px]' : 'left-0.5')} />
              </span>
            </span>
          ) },
      ]}
    />
  )
}
