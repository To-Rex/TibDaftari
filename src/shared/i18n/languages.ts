/**
 * The interface languages. Ten of them, in the order the language menu shows them, each named in its own language.
 *
 * `code` is what i18next, the stored choice (`clinic.lang`) and `<html lang>` carry — a valid BCP 47 tag, so every
 * `Intl` API understands it (`uz-x-yangi` = Uzbek in the new Latin alphabet of the 2021 draft: ō ḡ ş ç).
 * `content` is the language of what the SERVER keeps or writes (unit and template languages, Excel exports, Telegram
 * bots): it knows Uzbek, Russian and English only, so every interface language maps to the one its readers know best.
 * `fallback` is what a text still missing in the dictionary is shown in.
 */
import type { Locale } from '@/domain'

export type UiLang = 'uz-x-yangi' | 'uz' | 'uz-Cyrl' | 'kaa' | 'ru' | 'en' | 'ky' | 'tg' | 'kk' | 'tk'

export interface UiLangInfo {
  code: UiLang
  /** the language's name in itself */
  label: string
  /** a second line in the menu: the script or the variant, in the language itself */
  hint?: string
  /** two letters for a narrow switcher */
  short: string
  /** for `Intl` (numbers, collation, region names) — the first one the browser knows is used */
  intl: string[]
  /** the server-side language this interface language uses for stored / generated content */
  content: Locale
  script: 'latn' | 'cyrl'
  fallback: UiLang[]
}

export const LANGS: UiLangInfo[] = [
  { code: 'uz-x-yangi', label: 'Ōzbekça', hint: 'yangi lotin', short: 'ŌZ', intl: ['uz-Latn-UZ', 'uz'], content: 'uz', script: 'latn', fallback: ['uz'] },
  { code: 'uz', label: 'O‘zbekcha', hint: 'lotin', short: 'UZ', intl: ['uz-Latn-UZ', 'uz'], content: 'uz', script: 'latn', fallback: [] },
  { code: 'uz-Cyrl', label: 'Ўзбекча', hint: 'кирилл', short: 'ЎЗ', intl: ['uz-Cyrl-UZ', 'uz-Cyrl', 'uz'], content: 'uz', script: 'cyrl', fallback: ['uz'] },
  { code: 'kaa', label: 'Qaraqalpaqsha', short: 'QQ', intl: ['kaa', 'uz-Latn-UZ', 'uz'], content: 'uz', script: 'latn', fallback: ['uz'] },
  { code: 'ru', label: 'Русский', short: 'RU', intl: ['ru-RU'], content: 'ru', script: 'cyrl', fallback: ['uz'] },
  { code: 'en', label: 'English', short: 'EN', intl: ['en-GB'], content: 'en', script: 'latn', fallback: ['uz'] },
  { code: 'ky', label: 'Кыргызча', short: 'KY', intl: ['ky-KG', 'ky', 'ru-RU'], content: 'ru', script: 'cyrl', fallback: ['ru', 'uz'] },
  { code: 'tg', label: 'Тоҷикӣ', short: 'TG', intl: ['tg-TJ', 'tg', 'ru-RU'], content: 'ru', script: 'cyrl', fallback: ['ru', 'uz'] },
  { code: 'kk', label: 'Қазақша', short: 'KK', intl: ['kk-KZ', 'kk', 'ru-RU'], content: 'ru', script: 'cyrl', fallback: ['ru', 'uz'] },
  { code: 'tk', label: 'Türkmençe', short: 'TK', intl: ['tk-TM', 'tk', 'ru-RU'], content: 'ru', script: 'latn', fallback: ['ru', 'uz'] },
]

export const DEFAULT_LANG: UiLang = 'uz'
const BY_CODE = new Map(LANGS.map((l) => [l.code.toLowerCase(), l]))

/** The language a stored / requested code stands for (case does not matter), or none. */
export const findLang = (code: string | null | undefined): UiLangInfo | undefined => (code ? BY_CODE.get(code.toLowerCase()) : undefined)
export const langInfo = (code: string | null | undefined): UiLangInfo => findLang(code) ?? BY_CODE.get(DEFAULT_LANG)!

/** The languages the server keeps content in, for the selects that store one (a unit's language, a template's). */
export const CONTENT_LANGS: { code: Locale; label: string }[] = [
  { code: 'uz', label: 'O‘zbekcha' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]
