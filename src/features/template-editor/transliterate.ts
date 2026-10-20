/**
 * Cyrillic → Latin transliteration for template documents. It changes only printable template
 * text (text elements, table headers/groups, static table cells); `{...}` placeholders, bindings,
 * numbers and Latin text are left untouched. The preview is meant to be reviewed: medical terms
 * and abbreviations may need a manual pass.
 */
import type { TemplateDoc } from '@/domain'

const PLACEHOLDER = /(\{[^{}]*\})/g

/** Uzbek/Russian Cyrillic → Latin (the same conventions the app uses for slugs). */
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '’', ы: 'i', ь: '',
  э: 'e', ю: 'yu', я: 'ya', ў: 'o‘', қ: 'q', ғ: 'g‘', ҳ: 'h',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'J', З: 'Z', И: 'I', Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N',
  О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T', У: 'U', Ф: 'F', Х: 'X', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Sh', Ъ: '’', Ы: 'I', Ь: '',
  Э: 'E', Ю: 'Yu', Я: 'Ya', Ў: 'O‘', Қ: 'Q', Ғ: 'G‘', Ҳ: 'H',
}

const run = (text: string): string => [...text].map((ch) => MAP[ch] ?? ch).join('')

/** Transliterate a single string; `{...}` placeholders are preserved verbatim. */
export const toLatin = (text: string): string =>
  text.split(PLACEHOLDER).map((part) => (part.startsWith('{') && part.endsWith('}') ? part : run(part))).join('')

export interface TransliterationChange {
  /** a human-readable location inside the sheet (element name, or #number + type) */
  where: string
  before: string
  after: string
}

export interface TransliterationResult {
  doc: TemplateDoc
  changes: TransliterationChange[]
}

/** A cloned document with every printable Cyrillic string transliterated, plus the list of changes. */
export function transliterateDoc(doc: TemplateDoc): TransliterationResult {
  const next = structuredClone(doc)
  const changes: TransliterationChange[] = []
  const convert = (where: string, value: string): string => {
    const after = toLatin(value)
    if (after !== value) changes.push({ where, before: value, after })
    return after
  }

  next.elements.forEach((el, i) => {
    const base = el.name?.trim() || `#${i + 1}`
    switch (el.type) {
      case 'text':
        el.text = convert(base, el.text)
        break
      case 'table': {
        if (el.numberHeader != null) el.numberHeader = convert(`${base} · №`, el.numberHeader)
        el.columns = el.columns.map((col, ci) => ({
          ...col,
          header: convert(`${base} · #${ci + 1}`, col.header),
          group: col.group == null ? col.group : convert(`${base} · #${ci + 1}`, col.group),
        }))
        if (el.staticRows) {
          el.staticRows = el.staticRows.map((row, ri) => row.map((cell, ci) => convert(`${base} · ${ri + 1}:${ci + 1}`, cell)))
        }
        break
      }
      default:
        break
    }
  })
  return { doc: next, changes }
}
