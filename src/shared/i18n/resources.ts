/**
 * The three dictionaries the bundle carries: Uzbek — the source every other language is made from and falls back
 * to — Russian and English. Each is the base dictionary with the modules' parts under their own keys, exactly the
 * tree `t('portal.profile.language')` reads.
 */
import { uz } from './locales/uz'
import { ru } from './locales/ru'
import { en } from './locales/en'
import { portalLocale } from './locales/portal'
import { staffLocale } from './locales/staff'
import { adminLocale } from './locales/admin'
import { clinicalLocale } from './locales/clinical'
import { catalogLocale } from './locales/catalog'
import { assistantLocale } from './locales/assistant'
import type { DeepPartial } from './types'

export const UZ = { ...uz, portal: portalLocale.uz, staff: staffLocale.uz, admin: adminLocale.uz, clinical: clinicalLocale.uz, catalog: catalogLocale.uz, assistant: assistantLocale.uz }
export const RU = { ...ru, portal: portalLocale.ru, staff: staffLocale.ru, admin: adminLocale.ru, clinical: clinicalLocale.ru, catalog: catalogLocale.ru, assistant: assistantLocale.ru }
export const EN = { ...en, portal: portalLocale.en, staff: staffLocale.en, admin: adminLocale.en, clinical: clinicalLocale.en, catalog: catalogLocale.en, assistant: assistantLocale.en }

/** The whole interface vocabulary (its shape is the Uzbek dictionary's). */
export type Resources = typeof UZ
/** A translated dictionary: any text it lacks is shown in its fallback language. */
export type Translation = DeepPartial<Resources>
