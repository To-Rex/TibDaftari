import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { uz } from './locales/uz'
import { ru } from './locales/ru'
import { en } from './locales/en'
import { portalLocale } from './locales/portal'
import { staffLocale } from './locales/staff'
import { adminLocale } from './locales/admin'
import type { Locale } from '@/domain'

export const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: 'uz', label: 'O‘zbekcha', short: 'UZ' },
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'en', label: 'English', short: 'EN' },
]

export const INTL_LOCALE: Record<Locale, string> = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-GB' }

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: { ...uz, portal: portalLocale.uz, staff: staffLocale.uz, admin: adminLocale.uz } },
      ru: { translation: { ...ru, portal: portalLocale.ru, staff: staffLocale.ru, admin: adminLocale.ru } },
      en: { translation: { ...en, portal: portalLocale.en, staff: staffLocale.en, admin: adminLocale.en } },
    },
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'ru', 'en'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'clinic.lang', caches: ['localStorage'] },
    returnNull: false,
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export default i18n
export const currentLocale = (): Locale => (i18n.language?.slice(0, 2) as Locale) || 'uz'
