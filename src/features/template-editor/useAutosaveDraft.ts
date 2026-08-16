import { useEffect, useState } from 'react'
import type { TemplateDoc } from '@/domain'
import { storage } from '@/shared/lib/storage'
import { serialize, useEditorStore, type EditorMeta } from './useEditorStore'

interface Draft { savedAt: string; doc: TemplateDoc; meta: EditorMeta }
const key = (id: string) => `clinic.tpl.draft.${id}`

export const readDraft = (id: string) => storage.get<Draft | null>(key(id), null)
export const clearDraft = (id: string) => storage.remove(key(id))

/**
 * Persist the working copy to localStorage every 2s while dirty.
 * Returns a pending draft (newer than the saved template) for the restore prompt.
 */
export function useAutosaveDraft(templateId: string | undefined, templateUpdatedAt: string | undefined) {
  const [pending, setPending] = useState<Draft | null>(null)

  // detect a newer local draft once the template loads
  useEffect(() => {
    if (!templateId || !templateUpdatedAt) return
    const d = readDraft(templateId)
    if (d && d.savedAt > templateUpdatedAt) {
      const s = useEditorStore.getState()
      if (serialize(d.doc, d.meta) !== s.savedJson) setPending(d)
      else clearDraft(templateId)
    }
  }, [templateId, templateUpdatedAt])

  // autosave loop
  useEffect(() => {
    if (!templateId) return
    let last = ''
    const iv = setInterval(() => {
      const s = useEditorStore.getState()
      if (!s.template || s.template.id !== templateId) return
      const cur = serialize(s.doc, s.meta)
      if (cur === s.savedJson) { if (last) { clearDraft(templateId); last = '' } return }
      if (cur === last) return
      last = cur
      storage.set(key(templateId), { savedAt: new Date().toISOString(), doc: s.doc, meta: s.meta } satisfies Draft)
    }, 2000)
    return () => clearInterval(iv)
  }, [templateId])

  return { pending, dismiss: () => { if (templateId) clearDraft(templateId); setPending(null) }, restore: () => { if (pending) { const s = useEditorStore.getState(); s.replaceDoc(pending.doc, false); s.setMeta(pending.meta) } setPending(null) } }
}
