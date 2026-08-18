import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import type { TemplateAsset } from '@/domain'
import { cn } from '@/shared/lib/cn'
import { errorMessage } from '@/shared/lib/errors'
import { Button, Modal, Select, toast } from '@/shared/ui'
import { useUploadAsset } from '@/features/catalog/queries'

const KINDS: TemplateAsset['kind'][] = ['logo', 'stamp', 'signature', 'image']

/** Pick a company asset (logo/stamp/signature/image) or upload a new one (→ data URI). */
export function AssetPickerModal({ open, onClose, assets, companyId, onPick }: { open: boolean; onClose: () => void; assets: TemplateAsset[]; companyId: string; onPick: (a: TemplateAsset) => void }) {
  const { t } = useTranslation()
  const upload = useUploadAsset(companyId)
  const fileRef = useRef<HTMLInputElement>(null)
  const [kind, setKind] = useState<TemplateAsset['kind']>('image')

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 1_500_000) { toast.error(t('catalog.editor.fileTooBig')); return }
    const url = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file) })
    const dims = await new Promise<{ w: number; h: number }>((res) => { const img = new Image(); img.onload = () => res({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => res({ w: 200, h: 200 }); img.src = url })
    try {
      const a = await upload.mutateAsync({ kind, name: file.name.replace(/\.[^.]+$/, ''), url, width: dims.w, height: dims.h })
      toast.success(t('catalog.editor.uploaded'))
      onPick(a)
    } catch (e) { toast.error(errorMessage(e)) }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('catalog.editor.assetPicker')} description={t('catalog.editor.assetPickerHint')} size="lg"
      footer={
        <div className="flex items-center gap-2 mr-auto">
          <Select value={kind} onChange={(e) => setKind(e.target.value as TemplateAsset['kind'])} className="h-9 w-40">{KINDS.map((k) => <option key={k} value={k}>{t(`catalog.editor.assetKind.${k}`)}</option>)}</Select>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = '' }} />
          <Button variant="secondary" size="sm" leftIcon={<Upload className="size-4" />} loading={upload.isPending} onClick={() => fileRef.current?.click()}>{t('catalog.editor.upload')}</Button>
        </div>
      }>
      <div className="flex flex-col gap-5">
        {KINDS.map((k) => {
          const list = assets.filter((a) => a.kind === k)
          if (!list.length) return null
          return (
            <div key={k}>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">{t(`catalog.editor.assetKind.${k}`)} · {list.length}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {list.map((a) => (
                  <button type="button" key={a.id} onClick={() => onPick(a)} className={cn('group rounded-[var(--radius)] border border-line bg-surface p-2 text-left transition-all hover:border-brand hover:shadow-2 hover:-translate-y-px')}>
                    <div className="aspect-square rounded-lg bg-[repeating-conic-gradient(rgb(0_0_0/0.05)_0_25%,transparent_0_50%)] bg-[length:12px_12px] grid place-items-center overflow-hidden">
                      <img src={a.url} alt={a.name} className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="mt-1.5 truncate text-[12px] font-medium">{a.name}</p>
                    <p className="text-[11px] text-ink-3 tabular">{a.width}×{a.height}</p>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {assets.length === 0 && <p className="text-[13px] text-ink-3 py-6 text-center">{t('catalog.editor.noAssets')}</p>}
      </div>
    </Modal>
  )
}
