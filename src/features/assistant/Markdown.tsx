/**
 * A small Markdown renderer for the assistant's replies: headings, paragraphs, nested bullet / numbered lists,
 * tables, quotes, rules, fenced code (with a copy button) and inline code, bold / italic / strike, safe http(s)
 * links. No raw HTML ever reaches the DOM.
 */
import { Fragment, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { CopyButton } from './CopyButton'

const LINK = 'text-brand-ink underline decoration-brand/40 underline-offset-2 transition-colors hover:decoration-brand'

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+(?:\*(?!\*)[^*]+)*\*\*)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))|(~~[^~\n]+~~)|(\*[^*\n]+\*|_[^_\n]+_)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}${i++}`
    if (m[1]) out.push(<code key={k} className="rounded-md border border-line/70 bg-surface-2 px-1.5 py-px font-mono text-[0.86em]">{m[1].slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k} className="font-semibold">{inline(m[2].slice(2, -2), `${k}s`)}</strong>)
    else if (m[3]) out.push(<a key={k} href={m[4]} target="_blank" rel="noreferrer" className={LINK}>{m[3].slice(1, m[3].indexOf(']'))}</a>)
    else if (m[5]) out.push(<del key={k} className="text-ink-3">{inline(m[5].slice(2, -2), `${k}d`)}</del>)
    else if (m[6]) {
      // emphasis only where it reads as one: `a * b * c` and snake_case_names stay as typed
      const inner = m[6].slice(1, -1)
      const glued = /[\p{L}\p{N}_/]/u
      const stray = inner !== inner.trim() || (m[6][0] === '_' && (glued.test(text[m.index - 1] ?? '') || glued.test(text[m.index + m[0].length] ?? '')))
      out.push(stray ? m[6] : <em key={k}>{inline(inner, `${k}e`)}</em>)
    }
    else if (m[7]) out.push(<a key={k} href={m[7]} target="_blank" rel="noreferrer" className={cn(LINK, 'break-all')}>{m[7]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const LIST = /^(\s*)([-*•]|\d+[.)])\s+(.*)$/
const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const isRule = (l: string) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(l)
const isFence = (l: string) => /^\s*```/.test(l)
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
/** a cell that is a number (maybe with spaces, a currency or %) sits right, like in a spreadsheet */
const isNumeric = (c: string) => /^[-+]?[\d\s.,]+(\s?(%|so‘m|so'm|сум|UZS|\$))?$/.test(c) && /\d/.test(c)

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const { t } = useTranslation()
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-2/50" data-md-code>
      <div className="flex items-center justify-between gap-2 border-b border-line/70 py-0.5 pl-3 pr-1">
        <span className="font-mono text-[11.5px] text-ink-3">{lang || t('assistant.code')}</span>
        <CopyButton text={code} label={t('assistant.copyCode')} doneLabel={t('assistant.copied')} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[12.5px] leading-relaxed">{code}</pre>
    </div>
  )
}

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  const next = () => `b${k++}`
  const startsBlock = (l: string) => isFence(l) || /^(#{1,4})\s/.test(l) || LIST.test(l) || isTableRow(l) || /^\s*>/.test(l) || isRule(l)
  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }
    if (isFence(line)) {
      const lang = line.trim().slice(3).trim().split(/\s+/)[0] ?? ''
      const code: string[] = []
      i++
      while (i < lines.length && !isFence(lines[i]!)) code.push(lines[i++]!)
      i++
      blocks.push(<CodeBlock key={next()} code={code.join('\n')} lang={lang} />)
      continue
    }
    if (isRule(line)) { blocks.push(<hr key={next()} className="border-line" />); i++; continue }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1]!.length
      blocks.push(<div key={next()} role="heading" aria-level={level + 1} className={cn('font-semibold tracking-[-0.01em] text-ink [&:not(:first-child)]:pt-1.5', level === 1 ? 'text-[18px]' : level === 2 ? 'text-[16.5px]' : level === 3 ? 'text-[15px]' : 'text-[14.5px]')}>{inline(h[2]!.replace(/\s+#+\s*$/, ''), next())}</div>)
      i++
      continue
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i]!)) quote.push(lines[i++]!.replace(/^\s*>\s?/, ''))
      blocks.push(<blockquote key={next()} className="border-l-2 border-brand/50 pl-3 text-ink-2">{quote.map((q, j) => <Fragment key={j}>{j > 0 && <br />}{inline(q, `q${j}`)}</Fragment>)}</blockquote>)
      continue
    }
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1]!)) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i]!)) rows.push(cells(lines[i++]!))
      const numeric = head.map((_, j) => rows.length > 0 && rows.every((r) => !r[j] || isNumeric(r[j]!)))
      blocks.push(
        <div key={next()} className="overflow-x-auto rounded-xl border border-line" data-md-table>
          <table className="w-full border-collapse text-[13.5px]">
            <thead className="bg-surface-2/60 text-left text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3"><tr>{head.map((c, j) => <th key={j} className={cn('whitespace-nowrap px-3 py-2', numeric[j] && 'text-right')}>{inline(c, `h${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t border-line/70 transition-colors hover:bg-surface-2/40">{head.map((_, j) => <td key={j} className={cn('px-3 py-2 align-top', numeric[j] && 'whitespace-nowrap text-right')}>{inline(r[j] ?? '', `c${ri}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (LIST.test(line)) {
      // one list block; nesting comes from the indent, a marker-less indented line continues the item above
      const items: { depth: number; marker: string; lines: string[] }[] = []
      const indents: number[] = []
      while (i < lines.length) {
        const cur = lines[i]!
        const m = LIST.exec(cur)
        if (m) {
          const indent = (m[1] ?? '').replace(/\t/g, '  ').length
          while (indents.length > 1 && indent < indents[indents.length - 1]!) indents.pop()
          if (indents.length === 0 || indent > indents[indents.length - 1]!) indents.push(indent)
          items.push({ depth: Math.min(3, indents.length - 1), marker: /\d/.test(m[2]!) ? m[2]!.replace(')', '.') : '•', lines: [m[3]!] })
          i++
        } else if (cur.trim() && /^\s{2,}/.test(cur) && !isFence(cur) && !isTableRow(cur) && items.length > 0) {
          items[items.length - 1]!.lines.push(cur.trim())
          i++
        } else break
      }
      blocks.push(
        <ul key={next()} className="space-y-1.5">
          {items.map((it, j) => (
            <li key={j} className="flex gap-2" style={it.depth ? { marginLeft: it.depth * 20 } : undefined}>
              <span className={cn('shrink-0 select-none text-ink-3', it.marker === '•' ? 'w-3 text-center' : 'min-w-5 text-right font-medium')}>{it.marker}</span>
              <span className="min-w-0 flex-1 break-words">{it.lines.map((l, x) => <Fragment key={x}>{x > 0 && <br />}{inline(l, `l${j}_${x}`)}</Fragment>)}</span>
            </li>
          ))}
        </ul>,
      )
      continue
    }
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i]!.trim() && !startsBlock(lines[i]!)) para.push(lines[i++]!)
    blocks.push(<p key={next()}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${j}`)}</Fragment>)}</p>)
  }
  return <div className={cn('space-y-3 text-[14.5px] leading-[1.7] text-ink [&_p]:break-words', className)}>{blocks}</div>
}
