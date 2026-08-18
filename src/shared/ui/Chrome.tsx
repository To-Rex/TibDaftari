/** App chrome bits shared by all layouts: logo, language switcher, theme toggle. */
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Languages, Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { LOCALES } from '@/shared/i18n'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { Menu } from './Navigation'
import { IconButton } from './Button'

export function BrandMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-grid place-items-center rounded-[9px] bg-brand text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]', className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </span>
  )
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <span className={cn('inline-flex items-center gap-2.5 font-semibold tracking-tight text-ink', className)}>
      <BrandMark />
      {!compact && <span className="text-[16px]">{t('common.appName')}</span>}
    </span>
  )
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { i18n } = useTranslation()
  const cur = i18n.language?.slice(0, 2) ?? 'uz'
  return (
    <Menu
      align="end"
      trigger={() =>
        compact ? (
          <IconButton label="language"><Languages /></IconButton>
        ) : (
          <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Languages className="size-4" />
            {LOCALES.find((l) => l.code === cur)?.short}
          </button>
        )
      }
      items={LOCALES.map((l) => ({
        key: l.code,
        label: (
          <span className="flex flex-1 items-center justify-between gap-6">
            {l.label}
            {cur === l.code && <Check className="size-4 text-brand" />}
          </span>
        ),
        onSelect: () => void i18n.changeLanguage(l.code),
      }))}
    />
  )
}

export function ThemeToggle() {
  const { resolved, toggle } = useTheme()
  const { t } = useTranslation()
  return (
    <IconButton label={t('common.theme')} onClick={(e) => toggle({ x: e.clientX, y: e.clientY })}>
      {resolved === 'dark' ? <Sun /> : <Moon />}
    </IconButton>
  )
}
