import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Copy, Layers, MoreHorizontal, Pencil } from 'lucide-react'
import type { AttributeSchema } from '@/domain'
import { fmtRelative } from '@/shared/lib/format'
import { Badge, Card, Menu } from '@/shared/ui'
import { fadeUp } from '@/shared/ui/Page'
import { FIELD_TYPE_ICONS } from './fieldDefaults'

const TONE = { draft: 'warn', published: 'ok', archived: 'neutral' } as const

export const SchemaCard = memo(function SchemaCard({ schema, onOpen, onDuplicate, canWrite }: { schema: AttributeSchema; onOpen: () => void; onDuplicate: () => void; canWrite: boolean }) {
  const { t } = useTranslation()
  const types = [...new Set(schema.fields.map((f) => f.type))].slice(0, 6)
  return (
    <motion.div variants={fadeUp}>
      <Card interactive onClick={onOpen} className="h-full flex flex-col gap-3 group">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-ink"><Layers className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-5 truncate">{schema.name}</h3>
            <p className="text-[12.5px] text-ink-3 truncate">{schema.description || t('catalog.schemas.noDescription')}</p>
          </div>
          <span onClick={(e) => e.stopPropagation()} className="max-lg:opacity-100 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity -mr-2 -mt-1">
            <Menu trigger={() => <span className="grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"><MoreHorizontal className="size-4" /></span>}
              items={[
                { key: 'open', label: t('catalog.schemas.open'), icon: <Pencil />, onSelect: onOpen },
                { key: 'dup', label: t('catalog.schemas.duplicate'), icon: <Copy />, onSelect: onDuplicate, disabled: !canWrite },
              ]} />
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge tone={TONE[schema.status]} dot size="sm">{t(`common.${schema.status}`)}</Badge>
          <Badge size="sm">v{schema.version}</Badge>
          <Badge size="sm">{t('catalog.schemas.nFields', { n: schema.fields.length })}</Badge>
        </div>
        <div className="flex items-center gap-1 text-ink-3">
          {types.map((ty) => { const I = FIELD_TYPE_ICONS[ty]; return <span key={ty} title={t(`catalog.schemas.types.${ty}`)} className="grid size-6 place-items-center rounded-md bg-surface-2"><I className="size-3.5" /></span> })}
        </div>
        <div className="mt-auto pt-2 border-t border-line flex items-center justify-between gap-2 flex-wrap text-[12px] text-ink-3">
          <span>{t('catalog.schemas.usedBy', { n: schema.usedBy })}</span>
          <span>{fmtRelative(schema.updatedAt)}</span>
        </div>
      </Card>
    </motion.div>
  )
})
