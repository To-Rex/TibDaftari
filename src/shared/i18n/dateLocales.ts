/**
 * date-fns locales for every interface language: month and weekday names («24 noyabr», «Noyabr 2026», «seshanba»)
 * and relative times («3 kun oldin», «30 daqiqadan keyin»). date-fns ships Uzbek (Latin and Cyrillic), Kazakh,
 * Russian and English; Kyrgyz, Tajik, Turkmen and Karakalpak are made here on a base locale (its parsing and
 * long formats) with their own names and relative times; the new Uzbek Latin is the Latin one in the new letters.
 */
import type { Locale as DateLocale } from 'date-fns'
import { enGB, kk, ru, uz, uzCyrl } from 'date-fns/locale'
import type { UiLang } from './languages'
import { toNewLatin } from './translit'

type DistanceToken = Parameters<DateLocale['formatDistance']>[0]
type Unit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
interface Words {
  months: string[]
  monthsShort: string[]
  /** «Noyabr 2026» — the month on its own, when the language capitalises it there */
  monthsStandalone?: string[]
  days: string[]
  daysShort: string[]
  /** the unit word after a number (3 kún), and the same with the «from» ending a future needs (3 kúnnen) */
  unit: Record<Unit, [string, string]>
  /** «{x} ago» */
  past: (x: string) => string
  /** «in {x}» — `x` is the amount with the «from» ending where the language needs one */
  future: (x: string) => string
  about: string
  almost: string
  halfMinute: string
  lessThan: (n: string, unitFrom: string) => string
  over: (n: string, unitFrom: string) => string
}

const UNIT_OF: Record<string, Unit> = {
  lessThanXSeconds: 'second', xSeconds: 'second', halfAMinute: 'minute', lessThanXMinutes: 'minute', xMinutes: 'minute', aboutXHours: 'hour', xHours: 'hour',
  xDays: 'day', aboutXWeeks: 'week', xWeeks: 'week', aboutXMonths: 'month', xMonths: 'month', aboutXYears: 'year', xYears: 'year', overXYears: 'year', almostXYears: 'year',
}

/** A locale on `base` (its long formats, parsing, week start) speaking `w`. */
function made(base: DateLocale, code: string, w: Words): DateLocale {
  const pick = (wide: string[], short: string[], o?: { width?: string; context?: string }, standalone?: string[]) => (i: number) => {
    const width = o?.width ?? 'wide'
    if (width === 'abbreviated' || width === 'short') return short[i]!
    if (width === 'narrow') return short[i]!.charAt(0).toUpperCase()
    return (o?.context === 'standalone' && standalone ? standalone : wide)[i]!
  }
  return {
    ...base,
    code,
    localize: {
      ...base.localize,
      month: (i, o) => pick(w.months, w.monthsShort, o, w.monthsStandalone)(i),
      day: (i, o) => pick(w.days, w.daysShort, o)(i),
    },
    formatDistance: (token: DistanceToken, count: number, options) => {
      const [word, from] = w.unit[UNIT_OF[token] ?? 'day']
      const n = String(count)
      const future = options?.addSuffix && (options.comparison ?? 0) > 0
      // a phrase of its own («half a minute», «less than 5 minutes») takes the suffix as it is
      const whole = token === 'halfAMinute' ? w.halfMinute : token.startsWith('lessThan') ? w.lessThan(n, from) : token === 'overXYears' ? w.over(n, from) : null
      if (whole != null) return !options?.addSuffix ? whole : future ? w.future(whole) : w.past(whole)
      const lead = token.startsWith('about') ? `${w.about} ` : token === 'almostXYears' ? `${w.almost} ` : ''
      if (!options?.addSuffix) return `${lead}${n} ${word}`
      return future ? w.future(`${lead}${n} ${from}`) : w.past(`${lead}${n} ${word}`)
    },
  }
}

const ky = made(ru, 'ky', {
  months: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  monthsStandalone: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  monthsShort: ['янв.', 'фев.', 'мар.', 'апр.', 'май', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'],
  days: ['жекшемби', 'дүйшөмбү', 'шейшемби', 'шаршемби', 'бейшемби', 'жума', 'ишемби'],
  daysShort: ['жек.', 'дүй.', 'шейш.', 'шарш.', 'бейш.', 'жума', 'ишм.'],
  unit: { second: ['секунд', 'секунддан'], minute: ['мүнөт', 'мүнөттөн'], hour: ['саат', 'сааттан'], day: ['күн', 'күндөн'], week: ['жума', 'жумадан'], month: ['ай', 'айдан'], year: ['жыл', 'жылдан'] },
  past: (x) => `${x} мурун`,
  future: (x) => `${x} кийин`,
  about: 'болжол менен', almost: 'дээрлик', halfMinute: 'жарым мүнөт',
  lessThan: (n, from) => `${n} ${from} аз`, over: (n, from) => `${n} ${from} ашык`,
})

const tg = made(ru, 'tg', {
  months: ['январ', 'феврал', 'март', 'апрел', 'май', 'июн', 'июл', 'август', 'сентябр', 'октябр', 'ноябр', 'декабр'],
  monthsStandalone: ['Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн', 'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'],
  monthsShort: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  days: ['якшанбе', 'душанбе', 'сешанбе', 'чоршанбе', 'панҷшанбе', 'ҷумъа', 'шанбе'],
  daysShort: ['яшб', 'дшб', 'сшб', 'чшб', 'пшб', 'ҷмъ', 'шнб'],
  unit: { second: ['сония', 'сония'], minute: ['дақиқа', 'дақиқа'], hour: ['соат', 'соат'], day: ['рӯз', 'рӯз'], week: ['ҳафта', 'ҳафта'], month: ['моҳ', 'моҳ'], year: ['сол', 'сол'] },
  past: (x) => `${x} пеш`,
  future: (x) => `баъд аз ${x}`,
  about: 'тақрибан', almost: 'қариб', halfMinute: 'ним дақиқа',
  lessThan: (n, from) => `камтар аз ${n} ${from}`, over: (n, from) => `зиёда аз ${n} ${from}`,
})

const tk = made(ru, 'tk', {
  months: ['ýanwar', 'fewral', 'mart', 'aprel', 'maý', 'iýun', 'iýul', 'awgust', 'sentýabr', 'oktýabr', 'noýabr', 'dekabr'],
  monthsStandalone: ['Ýanwar', 'Fewral', 'Mart', 'Aprel', 'Maý', 'Iýun', 'Iýul', 'Awgust', 'Sentýabr', 'Oktýabr', 'Noýabr', 'Dekabr'],
  monthsShort: ['ýan', 'few', 'mar', 'apr', 'maý', 'iýun', 'iýul', 'awg', 'sen', 'okt', 'noý', 'dek'],
  days: ['ýekşenbe', 'duşenbe', 'sişenbe', 'çarşenbe', 'penşenbe', 'anna', 'şenbe'],
  daysShort: ['ýek', 'duş', 'siş', 'çar', 'pen', 'ann', 'şen'],
  unit: { second: ['sekunt', 'sekuntdan'], minute: ['minut', 'minutdan'], hour: ['sagat', 'sagatdan'], day: ['gün', 'günden'], week: ['hepde', 'hepdeden'], month: ['aý', 'aýdan'], year: ['ýyl', 'ýyldan'] },
  past: (x) => `${x} öň`,
  future: (x) => `${x} soň`,
  about: 'takmynan', almost: 'takmynan', halfMinute: 'ýarym minut',
  lessThan: (n, from) => `${n} ${from} az`, over: (n, from) => `${n} ${from} köp`,
})

const kaa = made(uz, 'kaa', {
  months: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  monthsStandalone: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
  monthsShort: ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'],
  days: ['ekshembi', 'dúyshembi', 'siyshembi', 'sárshembi', 'piyshembi', 'juma', 'shembi'],
  daysShort: ['eks', 'dúy', 'siy', 'sár', 'piy', 'jum', 'shem'],
  unit: { second: ['sekund', 'sekundtan'], minute: ['minut', 'minuttan'], hour: ['saat', 'saattan'], day: ['kún', 'kúnnen'], week: ['hápte', 'hápteden'], month: ['ay', 'aydan'], year: ['jıl', 'jıldan'] },
  past: (x) => `${x} aldın`,
  future: (x) => `${x} keyin`,
  about: 'shama menen', almost: 'derlik', halfMinute: 'yarım minut',
  lessThan: (n, from) => `${n} ${from} kem`, over: (n, from) => `${n} ${from} artıq`,
})

/** Uzbek Latin in the new letters: the same words, every output through the new alphabet. */
const uzNew: DateLocale = {
  ...uz,
  code: 'uz-x-yangi',
  localize: {
    ...uz.localize,
    month: (i, o) => toNewLatin(uz.localize.month(i, o)),
    day: (i, o) => toNewLatin(uz.localize.day(i, o)),
  },
  formatDistance: (token, count, options) => toNewLatin(uz.formatDistance(token, count, options)),
}

export const DATE_LOCALES: Record<UiLang, DateLocale> = { 'uz-x-yangi': uzNew, uz, 'uz-Cyrl': uzCyrl, kaa, ru, en: enGB, ky, tg, kk, tk }
