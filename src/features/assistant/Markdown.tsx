/**
 * A small Markdown renderer for the assistant's replies: headings, paragraphs, bullet / numbered lists, tables,
 * fenced and inline code, bold / italic, safe http(s) links. No raw HTML ever reaches the DOM.
 */
import { Fragment, type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

function inline(text: string, key = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\((https?:\/\/[^\s)]+)\))|(\*[^*\n]+\*|_[^_\n]+_)/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const k = `${key}${i++}`
    if (m[1]) out.push(<code key={k} className="rounded bg-surface-2 px-1 py-px font-mono text-[12.5px]">{m[1].slice(1, -1)}</code>)
    else if (m[2]) out.push(<strong key={k}>{m[2].slice(2, -2)}</strong>)
    else if (m[3]) out.push(<a key={k} href={m[4]} target="_blank" rel="noreferrer" className="text-brand-ink underline underline-offset-2">{m[3].slice(1, m[3].indexOf(']'))}</a>)
    else if (m[5]) out.push(<em key={k}>{m[5].slice(1, -1)}</em>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l)
const isSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l)
const cells = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())

export function Markdown({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let k = 0
  const next = () => `b${k++}`
  while (i < lines.length) {
    const line = lines[i]!
    if (!line.trim()) { i++; continue }
    if (line.startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i]!.startsWith('```')) code.push(lines[i++]!)
      i++
      blocks.push(<pre key={next()} className="overflow-x-auto rounded-lg bg-surface-2 p-3 font-mono text-[12.5px] leading-relaxed">{code.join('\n')}</pre>)
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1]!.length
      blocks.push(<div key={next()} className={cn('font-semibold', level === 1 ? 'text-[16px]' : level === 2 ? 'text-[15px]' : 'text-[14px]')}>{inline(h[2]!, next())}</div>)
      i++
      continue
    }
    if (isTableRow(line) && i + 1 < lines.length && isSeparator(lines[i + 1]!)) {
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && isTableRow(lines[i]!)) rows.push(cells(lines[i++]!))
      blocks.push(
        <div key={next()} className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[13px]">
            <thead className="bg-surface/70 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3"><tr>{head.map((c, j) => <th key={j} className="px-2.5 py-1.5">{inline(c, `h${j}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri} className="border-t border-line/70">{r.map((c, j) => <td key={j} className="px-2.5 py-1.5 align-top">{inline(c, `c${ri}${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i]!)) items.push(lines[i++]!.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
      const Tag = ordered ? 'ol' : 'ul'
      blocks.push(<Tag key={next()} className={cn('space-y-0.5 pl-5', ordered ? 'list-decimal' : 'list-disc')}>{items.map((it, j) => <li key={j}>{inline(it, `l${j}`)}</li>)}</Tag>)
      continue
    }
    const para: string[] = [line]
    i++
    while (i < lines.length && lines[i]!.trim() && !lines[i]!.startsWith('```') && !/^(#{1,3})\s/.test(lines[i]!) && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]!) && !isTableRow(lines[i]!)) para.push(lines[i++]!)
    blocks.push(<p key={next()}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p, `p${j}`)}</Fragment>)}</p>)
  }
  return <div className={cn('space-y-2 text-[14px] leading-relaxed [&_p]:break-words', className)}>{blocks}</div>
}
