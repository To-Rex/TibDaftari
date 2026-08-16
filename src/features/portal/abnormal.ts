/** Friendly abnormal-value summary for a rendered result (portal side panel). */
import type { RenderContext } from '@/domain'
import { fieldFlag, fieldReference, fieldUnit, formatValue } from '@/domain'

export interface AbnormalEntry {
  key: string
  label: string
  value: string
  unit: string
  reference: string
  critical: boolean
}

export function abnormalEntries(ctx: RenderContext): AbnormalEntry[] {
  const out: AbnormalEntry[] = []
  for (const f of ctx.schema?.fields ?? []) {
    if (f.type !== 'number' && f.type !== 'select') continue
    const flag = fieldFlag(ctx, f.key)
    if (flag !== 'abnormal' && flag !== 'critical') continue
    out.push({
      key: f.key,
      label: f.label,
      value: formatValue(ctx, f.key),
      unit: fieldUnit(ctx, f.key),
      reference: fieldReference(ctx, f.key),
      critical: flag === 'critical',
    })
  }
  return out
}

/** How many fields were actually checkable (have a reference/flag). */
export function checkedCount(ctx: RenderContext): number {
  return (ctx.schema?.fields ?? []).filter(
    (f) => (f.type === 'number' || f.type === 'select') && fieldFlag(ctx, f.key) !== 'unknown',
  ).length
}
