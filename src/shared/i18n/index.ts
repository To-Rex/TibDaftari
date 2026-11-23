/**
 * The interface languages (see `languages.ts`): i18next with Uzbek, Russian and English in the bundle and the other
 * seven made or fetched only when someone picks them —
 *  · Uzbek Cyrillic and Uzbek in the new Latin letters are written from the Uzbek dictionary by `translit.ts`, so
 *    they always say exactly what the Uzbek says and are never behind it;
 *  · Karakalpak, Kyrgyz, Tajik, Kazakh and Turkmen are dictionaries of their own, each a lazy chunk.
 * A text a dictionary still lacks is shown in the language's fallback (Russian, then Uzbek, for the Russian-reading
 * ones), never as a raw key.
 *
 * The choice is kept under `clinic.lang` (the key and the codes uz / ru / en of earlier versions stay valid), written
 * to `<html lang>` (the font and hyphenation follow it), and `contentLocale()` names the language — uz, ru or en — the
 * server keeps and writes content in for this reader.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Locale } from '@/domain'
import { DEFAULT_LANG, LANGS, findLang, langInfo, type UiLang } from './languages'
import { EN, RU, UZ, type Translation } from './resources'
import { toCyrillic, toNewLatin, transformTree } from './translit'

export { CONTENT_LANGS, DEFAULT_LANG, LANGS, findLang, langInfo, type UiLang, type UiLangInfo } from './languages'

const STORAGE_KEY = 'clinic.lang'
const NS = 'translation'

/**
 * Texts that are content the server sends, not interface: the platform's default SMS texts, shown in the SMS settings
 * and compared with what a unit saved. Every language shows them exactly as its content language has them — what the
 * patients will actually receive — never translated or transliterated.
 */
const CONTENT_KEYS = ['admin.sms.defaultPayment', 'admin.sms.defaultResult', 'admin.sms.defaultReminder']
const BASE: Record<Locale, Translation> = { uz: UZ, ru: RU, en: EN }
type Node = Record<string, unknown>
const lookup = (tree: unknown, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Node)[k] : undefined), tree)

/** `tree` with the content texts of `code`'s content language (copies along the changed paths, `tree` stays as it is). */
function pinContent(code: UiLang, tree: Translation): Translation {
  const base = BASE[langInfo(code).content]
  const out: Node = { ...(tree as Node) }
  for (const key of CONTENT_KEYS) {
    const text = lookup(base, key) ?? lookup(UZ, key)
    if (typeof text !== 'string') continue
    const path = key.split('.')
    const last = path.pop()!
    let o = out
    for (const k of path) {
      const next = o[k]
      o = o[k] = next && typeof next === 'object' ? { ...(next as Node) } : {}
    }
    o[last] = text
  }
  return out as Translation
}

/** a lazy dictionary chunk; its module is `undefined` when the chunk could not be loaded (a new deploy) */
const chunk = <K extends UiLang>(code: K, load: () => Promise<Partial<Record<K, Translation>> | undefined>) => () =>
  load().then((m) => {
    const tree = m?.[code]
    if (!tree) throw new Error(`language chunk "${code}" did not load`)
    return pinContent(code, tree)
  })

const LOADERS: Record<UiLang, () => Translation | Promise<Translation>> = {
  uz: () => UZ,
  ru: () => RU,
  en: () => EN,
  'uz-Cyrl': () => pinContent('uz-Cyrl', transformTree(UZ, toCyrillic)),
  'uz-x-yangi': () => pinContent('uz-x-yangi', transformTree(UZ, toNewLatin)),
  kaa: chunk('kaa', () => import('./locales/kaa')),
  ky: chunk('ky', () => import('./locales/ky')),
  tg: chunk('tg', () => import('./locales/tg')),
  kk: chunk('kk', () => import('./locales/kk')),
  tk: chunk('tk', () => import('./locales/tk')),
}
/** made in the browser at once (no network) */
const SYNC = new Set<UiLang>(['uz', 'ru', 'en', 'uz-Cyrl', 'uz-x-yangi'])

function readStored(): UiLang | undefined {
  try { return findLang(localStorage.getItem(STORAGE_KEY))?.code } catch { return undefined }
}
function store(code: UiLang) {
  try { localStorage.setItem(STORAGE_KEY, code) } catch { /* private mode: the choice lasts for this visit */ }
}

i18n.on('languageChanged', (lng) => {
  if (typeof document === 'undefined') return
  const info = langInfo(lng)
  document.documentElement.lang = info.code
  document.documentElement.dataset.script = info.script
})

const initial = readStored() ?? DEFAULT_LANG
const startNow = SYNC.has(initial)

void i18n.use(initReactI18next).init({
  resources: {
    uz: { [NS]: UZ },
    ru: { [NS]: RU },
    en: { [NS]: EN },
    // a transliterated Uzbek chosen before is written right away
    ...(startNow && !['uz', 'ru', 'en'].includes(initial) ? { [initial]: { [NS]: LOADERS[initial]() as Translation } } : {}),
  },
  // a lazy language starts in its fallback until its chunk is here (the app waits for `i18nReady` meanwhile)
  lng: startNow ? initial : langInfo(initial).fallback[0] ?? DEFAULT_LANG,
  fallbackLng: { ...Object.fromEntries(LANGS.map((l) => [l.code, l.fallback])), default: [DEFAULT_LANG] },
  supportedLngs: LANGS.map((l) => l.code),
  interpolation: { escapeValue: false },
  returnNull: false,
})

const pending = new Map<UiLang, Promise<void>>()
/** Puts a language's dictionary into i18next (once; a failed load can be tried again). */
export function loadLanguage(code: UiLang): Promise<void> {
  if (i18n.hasResourceBundle(code, NS)) return Promise.resolve()
  let p = pending.get(code)
  if (!p) {
    p = Promise.resolve()
      .then(() => LOADERS[code]())
      .then((tree) => { i18n.addResourceBundle(code, NS, tree, true, true) })
      .finally(() => pending.delete(code))
    pending.set(code, p)
  }
  return p
}

let wanted: UiLang = initial
/**
 * Switches the interface to `code` and remembers it. Resolves once the language is on the screen; when the user
 * picks another one before this one has loaded, the later choice wins.
 */
export async function setLanguage(code: UiLang): Promise<void> {
  wanted = code
  await loadLanguage(code)
  if (wanted !== code) return
  await i18n.changeLanguage(code)
  store(code)
}

let readyNow = startNow
/**
 * Resolves when the stored language can be shown — at once, unless it is a lazy one (then when its chunk is here; if it
 * cannot be fetched, the interface shows its fallback language and the choice is kept for the next visit).
 */
export const i18nReady: Promise<void> = startNow
  ? Promise.resolve()
  : setLanguage(initial).catch(() => undefined).then(() => { readyNow = true })
export const isI18nReady = () => readyNow

/** The interface language now on the screen. */
export const uiLang = (): UiLang => langInfo(i18n.language).code
/** The server-side language (uz / ru / en) of the current interface language — for exports, templates, units. */
export const contentLocale = (): Locale => langInfo(i18n.language).content

const intlCache = new Map<string, string>()
/** The `Intl` locale of the current language: the first of its tags this browser has data for. */
export function intlLocale(code: string = i18n.language): string {
  const info = langInfo(code)
  let tag = intlCache.get(info.code)
  if (!tag) {
    try { tag = Intl.NumberFormat.supportedLocalesOf(info.intl)[0] } catch { /* very old engine */ }
    tag ??= info.content === 'en' ? 'en-GB' : info.content === 'ru' ? 'ru-RU' : 'uz-UZ'
    intlCache.set(info.code, tag)
  }
  return tag
}

/** Text the browser produced in Uzbek Latin (region names), made to match an Uzbek interface's own letters. */
function uzbekScript(code: UiLang, resolvedTag: string): (s: string) => string {
  if (!/^uz\b/i.test(resolvedTag) || /cyrl/i.test(resolvedTag)) return (s) => s
  if (code === 'uz-Cyrl') return toCyrillic
  if (code === 'uz-x-yangi') return toNewLatin
  return (s) => s
}

/**
 * Country / region names (`of('KZ')`) in the interface language, through `Intl.DisplayNames`: the first of the
 * language's tags the browser knows is used, and Uzbek names follow the interface's alphabet. `null` when the browser
 * has no `Intl.DisplayNames`.
 */
const regionCache = new Map<UiLang, RegionNames | null>()
export interface RegionNames { of: (region: string) => string | undefined; locale: string }
export function regionNames(code: string = i18n.language): RegionNames | null {
  const info = langInfo(code)
  if (!regionCache.has(info.code)) regionCache.set(info.code, makeRegionNames(info.code))
  return regionCache.get(info.code)!
}
function makeRegionNames(code: UiLang): RegionNames | null {
  const info = langInfo(code)
  try {
    const dn = new Intl.DisplayNames(info.intl, { type: 'region', fallback: 'none' })
    const locale = dn.resolvedOptions().locale
    const fix = uzbekScript(info.code, locale)
    return { locale, of: (region) => { try { const n = dn.of(region); return n ? fix(n) : undefined } catch { return undefined } } }
  } catch { return null }
}

export default i18n
