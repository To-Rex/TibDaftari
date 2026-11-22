/** "Copy" — a quiet icon button that turns into a tick for a moment; falls back to a hidden textarea where the Clipboard API is refused. */
import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch { /* not a secure context / no permission — the old way below */ }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

export function CopyButton({ text, label, doneLabel, className, children }: { text: string | (() => string); label: string; doneLabel: string; className?: string; children?: (done: boolean) => React.ReactNode }) {
  const [done, setDone] = useState(false)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const run = async () => {
    if (!(await copyText(typeof text === 'function' ? text() : text))) return
    setDone(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setDone(false), 1600)
  }
  return (
    <button type="button" onClick={() => void run()} aria-label={done ? doneLabel : label} title={done ? doneLabel : label} data-copy={done ? 'done' : 'idle'}
      className={cn('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[12px] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink [&>svg]:size-3.5', done && 'text-ok hover:text-ok', className)}>
      {done ? <Check /> : <Copy />}
      {children?.(done)}
    </button>
  )
}
