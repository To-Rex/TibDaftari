/** Decorative but truthful: a live-feeling preview of what a patient sees. */
import { motion } from 'motion/react'
import { CheckCircle2, MessageSquareText, FileText } from 'lucide-react'
import { Badge, BrandMark } from '@/shared/ui'

const rows = [
  { name: 'Gemoglobin', value: '138', unit: 'g/l', ref: '120 – 160', ok: true },
  { name: 'Glyukoza', value: '5.4', unit: 'mmol/l', ref: '3.2 – 6.1', ok: true },
  { name: 'ALT', value: '46', unit: 'U/l', ref: '< 40', ok: false },
  { name: 'Umumiy oqsil', value: '71', unit: 'g/l', ref: '66 – 85', ok: true },
]

export function ResultPreviewCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-brand/15 via-transparent to-accent/10 blur-2xl" />
      <div className="rounded-[22px] border border-line bg-bg-elevated shadow-3">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <BrandMark size={34} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold leading-tight">Shifo Med · Markaziy filial</p>
            <p className="text-[12px] text-ink-3">Chek UR-001240 · 16.08.2026</p>
          </div>
          <Badge tone="ok" dot>Tasdiqlangan</Badge>
        </div>
        <div className="px-5 py-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">Bioximiyaviy qon tahlili</p>
          <p className="mt-0.5 text-[15px] font-semibold">Karimova Madina Aziz qizi</p>
          <div className="mt-4 overflow-hidden rounded-xl border border-line">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr] bg-surface-2 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-3">
              <span>Ko‘rsatkich</span><span className="text-right">Natija</span><span className="text-right">Me’yor</span>
            </div>
            {rows.map((r, i) => (
              <motion.div key={r.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.09, duration: 0.4 }} className="grid grid-cols-[1.4fr_0.7fr_0.9fr] items-center border-t border-line px-3 py-2.5 text-[13px]">
                <span className="font-medium">{r.name}</span>
                <span className={`text-right tabular font-semibold ${r.ok ? '' : 'text-danger'}`}>{r.value} <span className="text-[11px] font-normal text-ink-3">{r.unit}</span></span>
                <span className="text-right text-ink-3 tabular">{r.ref}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[12.5px] text-ink-3">
          <FileText className="size-4" /> PDF blanka <span className="mx-1">·</span> <CheckCircle2 className="size-4 text-ok" /> Vrach: A. Jumaniyazov
        </div>
      </div>
      {/* floating SMS bubble */}
      <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="absolute -bottom-10 -left-3 flex max-w-[260px] items-start gap-3 rounded-2xl border border-line bg-bg-elevated p-3.5 shadow-3 sm:-left-8">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink"><MessageSquareText className="size-4" /></span>
        <div>
          <p className="text-[12px] font-semibold">SMS · Shifo Med</p>
          <p className="text-[12.5px] leading-snug text-ink-2">Bioximiyaviy qon tahlili natijasi tayyor. Portalda ko‘rishingiz mumkin.</p>
        </div>
      </motion.div>
    </div>
  )
}
