import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GripVertical } from 'lucide-react'
import type { AttributeSchema } from '@/domain'
import { STANDARD_PLACEHOLDERS } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { SearchInput } from '@/shared/ui'
import { PLACEHOLDER_MIME } from './EditorCanvas'
import { FIELD_TYPE_ICONS } from '@/features/schema-editor/fieldDefaults'

/**
 * Standard placeholders + schema fields. Click → onInsert(`{key}`), drag → drop on canvas creates an element.
 */
export function PlaceholderPalette({ schema, onInsert, compact }: { schema: AttributeSchema | null; onInsert?: (key: string) => void; compact?: boolean }) {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const std = STANDARD_PLACEHOLDERS.map((g) => ({ group: t(`catalog.editor.ph.${g.group}`), items: g.items.map((i) => ({ key: i.key, label: i.label, type: undefined as string | undefined })) }))
    const values = schema ? [{ group: `${t('catalog.editor.ph.values')} · ${schema.name}`, items: schema.fields.map((f) => ({ key: `values.${f.key}`, label: f.label, type: f.type as string | undefined })) }] : []
    const all = [...values, ...std]
    const s = q.trim().toLowerCase()
    return s ? all.map((g) => ({ ...g, items: g.items.filter((i) => i.key.toLowerCase().includes(s) || i.label.toLowerCase().includes(s)) })).filter((g) => g.items.length) : all
  }, [schema, q, t])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-3 pt-3 pb-2">
        {!compact && <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-2">{t('catalog.editor.placeholders')}</h3>}
        <SearchInput value={q} onChange={setQ} placeholder={t('common.searchPlaceholder')} className="h-8 text-[13px]" />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {groups.map((g) => (
          <div key={g.group} className="mb-3">
            <p className="px-1.5 mb-1 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3 truncate">{g.group}</p>
            <div className="flex flex-col gap-0.5">
              {g.items.map((it) => {
                const I = it.type ? FIELD_TYPE_ICONS[it.type as keyof typeof FIELD_TYPE_ICONS] : undefined
                return (
                  <button
                    key={it.key}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData(PLACEHOLDER_MIME, it.key); e.dataTransfer.setData('text/plain', `{${it.key}}`); e.dataTransfer.effectAllowed = 'copy' }}
                    onClick={() => onInsert?.(it.key)}
                    className={cn('group flex items-center gap-2 h-8 px-1.5 rounded-lg text-left transition-colors hover:bg-surface-2 cursor-grab active:cursor-grabbing')}
                    title={`{${it.key}}`}
                  >
                    <GripVertical className="size-3.5 text-ink-3/60 shrink-0" />
                    {I && <I className="size-3.5 text-ink-3 shrink-0" />}
                    <span className="truncate text-[12.5px] flex-1">{it.label}</span>
                    <span className="truncate max-w-[45%] font-mono text-[10.5px] text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity">{it.key.replace(/^values\./, '')}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="px-2 py-3 text-[12.5px] text-ink-3">{t('common.empty')}</p>}
      </div>
    </div>
  )
}
