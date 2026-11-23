/** App chrome bits shared by all layouts: logo, language switcher, theme toggle. */
import { useTranslation } from 'react-i18next'
import { Moon, Sun, Languages, Check } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { LANGS, langInfo, setLanguage, type UiLangInfo } from '@/shared/i18n'
import { useTheme } from '@/shared/theme/ThemeProvider'
import { Menu } from './Navigation'
import { IconButton } from './Button'
import { toast } from './Toast'

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

/** A language's name in itself, in the font that has its letters (`lang` on the element), with its script / variant. */
export function LanguageName({ lang, hint = true }: { lang: UiLangInfo; hint?: boolean }) {
  return (
    <span className="min-w-0 truncate">
      <span lang={lang.code} data-lang-name>{lang.label}</span>
      {hint && lang.hint && <span lang={lang.code} data-lang-name className="ml-1.5 text-[12px] text-ink-3">{lang.hint}</span>}
    </span>
  )
}

/** Picks the interface language; a language that has to be fetched first switches when it is here. */
export function pickLanguage(code: UiLangInfo['code'], failed: string) {
  setLanguage(code).catch(() => toast.error(failed))
}

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const cur = langInfo(i18n.language)
  return (
    <Menu
      align="end"
      trigger={() =>
        compact ? (
          <IconButton label={t('common.language')}><Languages /></IconButton>
        ) : (
          <button type="button" aria-label={t('common.language')} title={cur.label}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            <Languages className="size-4" />
            <span lang={cur.code} data-lang-name>{cur.short}</span>
          </button>
        )
      }
      // the three Uzbek alphabets together, then the other languages
      items={LANGS.map((l, i) => ({
        key: l.code,
        separatorBefore: i > 0 && l.code === 'kaa',
        label: (
          <span className="flex min-w-0 flex-1 items-center justify-between gap-6" aria-current={cur.code === l.code ? 'true' : undefined}>
            <LanguageName lang={l} />
            {cur.code === l.code && <Check className="size-4 shrink-0 text-brand" />}
          </span>
        ),
        onSelect: () => pickLanguage(l.code, t('common.languageFailed')),
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
