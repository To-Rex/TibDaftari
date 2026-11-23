/**
 * Uzbek in its other two alphabets, made from the Latin dictionary — so both are always complete and never drift
 * from it:
 *  - `toCyrillic` — the Cyrillic alphabet (ўзбек кирилл ёзуви): the letter rules of the orthography (o‘→ў, g‘→ғ,
 *    sh→ш, ch→ч, yo→ё, yu→ю, ya→я, ye→е, e→э at the start of a word and after a vowel, the tutuq ’→ъ, q→қ, h→ҳ …)
 *    plus the loanwords whose Cyrillic spelling the letters cannot tell (роль, пароль, функция, объект, октябрь …);
 *  - `toNewLatin` — the new Latin alphabet of the 2021 draft: o‘→ō, g‘→ḡ, sh→ş, ch→ç.
 * Never touched: `{{placeholders}}`, the template fields the server reads (`{patient}`, `{values.kalit}`, Eskiz's `%w`),
 * web and e-mail addresses and dotted names (my.eskiz.uz, values.izoh), product names and abbreviations (SMS, PDF,
 * Excel, Telegram, TibDaftari …), keyboard keys.
 */

const APOS_OG = '‘ʻ\'`' // after o / g: part of the letter (o‘, g‘)
const TUTUQ = '’ʼ' // the separating sign (ma’lumot)
const isLatin = (c: string) => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')
/** `set.includes(c)` for ONE character — an empty one (past the end of a word) is never in a set */
const isIn = (set: string, c: string | undefined) => !!c && c.length === 1 && set.includes(c)
const isApos = (c: string) => isIn(APOS_OG, c) || isIn(TUTUQ, c)

/** Words that stay as they are in every alphabet (compared in lower case). */
const KEEP = new Set([
  'sms', 'pdf', 'csv', 'xlsx', 'json', 'qr', 'url', 'api', 'id', 'uuid', 'otp', 'png', 'svg', 'docx', 'txt', 'md', 'http', 'https', 'ai', 'ok', 'jwt',
  'excel', 'word', 'telegram', 'eskiz', 'xabarchi', 'claude', 'anthropic', 'openai', 'deepseek', 'deploy', 'tibdaftari', 'markdown', 'google', 'chrome',
  'enter', 'shift', 'esc', 'ctrl', 'alt', 'tab', 'botfather', 'chatgpt', 'gpt', 'fernet', 'base', 'mock', 'webhook', 'email', 'pk', 'sk',
  'tprints', 'windows', 'linux', 'macos', 'android', 'ios', 'items', 'placeholder', 'compatible', 'function', 'calling', 'gateway', 'low', 'medium', 'high', 'max', 'tokens',
  'apple', 'payments', 'snap', 'px', 'xab', 'live', 'aa', 'xxxxxxxxx',
])
/** the product names (KEEP) that may take an Uzbek ending without a sign: «Excelga», «Telegramda» */
const BRANDS = new Set(['excel', 'telegram', 'eskiz', 'xabarchi', 'claude', 'anthropic', 'openai', 'deepseek', 'deploy', 'tibdaftari', 'markdown', 'google', 'chrome', 'tprints', 'windows', 'apple'])
/** the Uzbek ending a product name or an abbreviation may carry («Excelga», «SMS’lar», «PDF’ining») */
const SUFFIX = /^[‘’ʻʼ'`-]?[a-z]{1,8}$/

/** Whole words whose Cyrillic the letter rules cannot tell (lower case; the case of the source is applied after). */
const CYR_WORDS: Record<string, string> = {
  rol: 'роль', parol: 'пароль', profil: 'профиль', model: 'модель', stil: 'стиль', kontrol: 'контроль', hotel: 'отель',
  yanvar: 'январь', fevral: 'февраль', aprel: 'апрель', iyun: 'июнь', iyul: 'июль', sentabr: 'сентябрь', oktabr: 'октябрь', noyabr: 'ноябрь', dekabr: 'декабрь',
  panel: 'панель', landing: 'лендинг', group: 'групп',
  ses: 'СЭС', sesi: 'СЭСи', sesning: 'СЭСнинг', sesga: 'СЭСга', sesda: 'СЭСда', seslar: 'СЭСлар', preview: 'превью', backend: 'бэкенд', frontend: 'фронтенд', nick: 'ник', nicklar: 'никлар', nickni: 'никни',
}

/** Word beginnings whose Cyrillic differs from the letters (the rest of the word follows the rules), longest first. */
const CYR_STEMS: [string, string][] = ([
  ['funksional', 'функционал'], ['funksiya', 'функция'], ['aksiya', 'акция'], ['stansiya', 'станция'], ['seksiya', 'секция'], ['inspeksiya', 'инспекция'],
  ['infeksiya', 'инфекция'], ['reaksiya', 'реакция'], ['konstruksiya', 'конструкция'], ['instruksiya', 'инструкция'], ['dezinfeksiya', 'дезинфекция'],
  ['kolleksiya', 'коллекция'], ['proyeksiya', 'проекция'], ['korreksiya', 'коррекция'], ['fraksiya', 'фракция'], ['sanksiya', 'санкция'],
  ['obyekt', 'объект'], ['subyekt', 'субъект'], ['obyom', 'объём'], ['kompyuter', 'компьютер'], ['filtr', 'фильтр'],
  ['sentabr', 'сентябр'], ['oktabr', 'октябр'], ['aksent', 'акцент'], ['litsenz', 'лиценз'], ['konsultatsiya', 'консультация'], ['konsultat', 'консультат'], ['matritsa', 'матрица'],
  ['tranzaksion', 'транзакцион'], ['tranzaksiya', 'транзакция'], ['passport', 'паспорт'], ['biokimyaviy', 'биокимёвий'], ['kimyaviy', 'кимёвий'],
] as [string, string][]).sort((a, b) => b[0].length - a[0].length)

/** Letter clusters inside a word that stand for ц (Russian -ция, -цион, -цент, цикл). */
const CYR_TS: [string, string][] = [['tsiya', 'ция'], ['tsiye', 'цие'], ['tsion', 'цион'], ['tsent', 'цент'], ['tsikl', 'цикл']]

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
}

/** The letter rules for one lower-case word (apostrophes kept as they are in the source). */
function cyrRules(w: string, wordStart: boolean): string {
  let out = ''
  let i = 0
  const prevVowel = () => {
    const p = out[out.length - 1]
    return !!p && 'аеёиоуўэюя'.includes(p)
  }
  while (i < w.length) {
    const c = w[i]!
    const n = w[i + 1] ?? ''
    const n2 = w[i + 2] ?? ''
    if ((c === 'o' || c === 'g') && isIn(APOS_OG, n)) { out += c === 'o' ? 'ў' : 'ғ'; i += 2; continue }
    if (isApos(c)) {
      // s’h, c’h: the sign only keeps two letters apart — nothing in Cyrillic; anywhere else it is the hard sign
      const p = w[i - 1] ?? ''
      if (!((p === 's' || p === 'c') && n === 'h')) out += 'ъ'
      i += 1
      continue
    }
    const ts = c === 't' && n === 's' ? CYR_TS.find(([lat]) => w.startsWith(lat, i)) : undefined
    if (ts) { out += ts[1]; i += ts[0].length; continue }
    if (c === 's' && n === 'h') { out += 'ш'; i += 2; continue }
    if (c === 'c' && n === 'h') { out += 'ч'; i += 2; continue }
    if (c === 'y') {
      if (n === 'o' && isIn(APOS_OG, n2)) { out += 'йў'; i += 3; continue }
      if (n === 'o') { out += 'ё'; i += 2; continue }
      if (n === 'u') { out += 'ю'; i += 2; continue }
      if (n === 'a') { out += 'я'; i += 2; continue }
      if (n === 'e') { out += 'е'; i += 2; continue }
    }
    if (c === 'e') { out += (i === 0 && wordStart) || prevVowel() ? 'э' : 'е'; i += 1; continue }
    out += SINGLE[c] ?? c
    i += 1
  }
  return out
}

/** The case of the source word on its Cyrillic: ALL CAPS stays all caps, a capital first letter stays capital. */
function withCase(src: string, cyr: string): string {
  const letters = src.replace(/[^A-Za-z]/g, '')
  if (letters.length > 1 && letters === letters.toUpperCase()) return cyr.toUpperCase()
  if (src[0] && src[0] !== src[0].toLowerCase()) return cyr.charAt(0).toUpperCase() + cyr.slice(1)
  return cyr
}

/**
 * A product name or an abbreviation with an Uzbek ending: [the name as it is, the ending] — or none. The name must be
 * written with a capital (SMS’ga, Excelga) — a lower-case start is an ordinary word (idora is not ID + ora).
 */
function keptHead(word: string): [string, string] | undefined {
  const low = word.toLowerCase()
  for (let k = 2; k < word.length; k++) {
    const head = word.slice(0, k)
    const rest = word.slice(k)
    if (!KEEP.has(low.slice(0, k)) || !SUFFIX.test(rest)) continue
    // an abbreviation in capitals (SMS’ga, PDF’ining, IDsi) or a product name with its capital (Excelga) — never an
    // ordinary word that merely starts like one (Eng, Ruxsat, Uzun, idora)
    if ((head.length >= 2 && head === head.toUpperCase()) || (BRANDS.has(low.slice(0, k)) && head[0] !== head[0]!.toLowerCase())) return [head, rest]
  }
  return undefined
}

/**
 * A capital letter alone: an initial or an abbreviation before a dot (A. Jumaniyazov, F.I.Sh.) and the pronoun «U»
 * starting a sentence are words; anything else (G, J / K, «Y qadam», A → Z, A4, X-API) is a key, an axis or a code.
 */
const letterIsWord = (word: string, next: string, after: string) => next === '.' || (word === 'U' && next === ' ' && /[a-z]/.test(after))

function wordToCyrillic(word: string): string {
  const low = word.toLowerCase()
  if (KEEP.has(low)) return word
  const head = keptHead(word)
  if (head) return head[0] + head[1].replace(/[a-z]+/gi, (x) => cyrRules(x.toLowerCase(), false))
  const whole = CYR_WORDS[low]
  if (whole) return whole === whole.toUpperCase() ? whole : withCase(word, whole)
  const stem = CYR_STEMS.find(([lat]) => low.startsWith(lat))
  const cyr = stem ? stem[1] + cyrRules(low.slice(stem[0].length), false) : cyrRules(low, true)
  return withCase(word, cyr)
}

function wordToNewLatin(word: string): string {
  if (KEEP.has(word.toLowerCase())) return word
  const head = keptHead(word)
  if (head) return head[0] + wordToNewLatin(head[1])
  let out = ''
  for (let i = 0; i < word.length; i++) {
    const c = word[i]!
    const n = word[i + 1] ?? ''
    const up = c !== c.toLowerCase()
    const lc = c.toLowerCase()
    if ((lc === 'o' || lc === 'g') && isIn(APOS_OG, n)) { out += lc === 'o' ? (up ? 'Ō' : 'ō') : (up ? 'Ḡ' : 'ḡ'); i++; continue }
    if ((lc === 's' || lc === 'c') && (n === 'h' || n === 'H')) { out += lc === 's' ? (up ? 'Ş' : 'ş') : (up ? 'Ç' : 'ç'); i++; continue }
    out += c
  }
  return out
}

/**
 * Run `fn` over every word of a text, leaving alone what must not change: `{{placeholders}}`, addresses, numbers,
 * punctuation. A word is a run of Latin letters, with o‘ / g‘ and the tutuq inside it.
 */
function mapWords(text: string, fn: (word: string) => string): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const c = text[i]!
    if (c === '{') {
      // {{placeholder}} of the app, {field} of an SMS / document template — code, copied as it is
      const double = text[i + 1] === '{'
      const end = text.indexOf(double ? '}}' : '}', i)
      const stop = end < 0 ? text.length : end + (double ? 2 : 1)
      out += text.slice(i, stop)
      i = stop
      continue
    }
    if (c === '%' && isLatin(text[i + 1] ?? '')) { out += text.slice(i, i + 2); i += 2; continue }
    if (text.startsWith('http://', i) || text.startsWith('https://', i) || text.startsWith('www.', i)) {
      let j = i
      while (j < text.length && !/\s/.test(text[j]!)) j++
      out += text.slice(i, j)
      i = j
      continue
    }
    if ((c === 'e' || c === 'E') && text.slice(i, i + 6).toLowerCase() === 'e-mail') { out += text.slice(i, i + 6); i += 6; continue }
    const code = /^[A-Z][A-Za-z0-9]*(?:-[A-Z][A-Za-z0-9]*)+/.exec(text.slice(i))
    if (code && (i === 0 || !isLatin(text[i - 1]!))) { out += code[0]; i += code[0].length; continue }
    if (isLatin(c)) {
      let j = i + 1
      while (j < text.length) {
        const d = text[j]!
        if (isLatin(d)) { j++; continue }
        // an apostrophe belongs to the word after o / g, or between two letters (the tutuq)
        if (isApos(d) && ((isIn('oOgG', text[j - 1]) && isIn(APOS_OG, d)) || isLatin(text[j + 1] ?? ''))) { j++; continue }
        break
      }
      let word = text.slice(i, j)
      // e-mail addresses and dotted names (my.eskiz.uz, values.izoh, template.json) stay whole
      if (text[j] === '@' || (text[j] === '.' && isLatin(text[j + 1] ?? '') && /^[a-z]+$/.test(text[j + 1]!))) {
        let k = j
        while (k < text.length && !/[\s,;:)»"]/.test(text[k]!)) k++
        word = text.slice(i, k)
        out += word
        i = k
        continue
      }
      const keyLike = word.length === 1 && word !== word.toLowerCase() && !letterIsWord(word, text[j] ?? '', text[j + 1] ?? '')
      out += keyLike ? word : fn(word)
      i = j
      continue
    }
    out += c
    i++
  }
  return out
}

export const toCyrillic = (text: string): string => mapWords(text, wordToCyrillic)
export const toNewLatin = (text: string): string => mapWords(text, wordToNewLatin)

/** A whole dictionary in another alphabet: every string of the tree through `fn`, the shape unchanged. */
export function transformTree<T>(tree: T, fn: (s: string) => string): T {
  if (typeof tree === 'string') return fn(tree) as T
  if (Array.isArray(tree)) return tree.map((x) => transformTree(x, fn)) as T
  if (tree && typeof tree === 'object') return Object.fromEntries(Object.entries(tree).map(([k, v]) => [k, transformTree(v, fn)])) as T
  return tree
}
