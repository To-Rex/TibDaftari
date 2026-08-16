import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { ResultTemplate, TemplateDoc, TemplateElement } from '@/domain'
import { emptyDoc } from '@/domain'
import { newElementId } from './elementDefaults'
import type { Guide } from './geometry'

const HISTORY_LIMIT = 60

export interface EditorMeta { name: string; serviceTypeIds: string[]; categoryIds: string[]; scope: 'item' | 'order'; language: 'uz' | 'ru' | 'en' }

export interface EditorState {
  template: ResultTemplate | null
  meta: EditorMeta
  doc: TemplateDoc
  savedJson: string
  selectedIds: string[]
  zoom: number
  snap: boolean
  showGrid: boolean
  preview: boolean
  previewServiceTypeId: string | null
  past: TemplateDoc[]
  future: TemplateDoc[]
  clipboard: TemplateElement[]
  guides: Guide[]
  /** id of the element whose text is being edited inline */
  editingId: string | null

  load: (t: ResultTemplate, doc?: TemplateDoc) => void
  reset: () => void
  setMeta: (patch: Partial<EditorMeta>) => void
  setDocProps: (patch: Partial<Omit<TemplateDoc, 'elements'>>) => void
  pushHistory: () => void
  patchElements: (ids: string[], fn: (el: TemplateElement) => TemplateElement, record?: boolean) => void
  replaceDoc: (doc: TemplateDoc, record?: boolean) => void
  select: (ids: string[]) => void
  toggleSelect: (id: string) => void
  addElement: (el: TemplateElement, select?: boolean) => void
  removeSelected: () => void
  duplicateSelected: () => void
  copy: () => void
  paste: () => void
  reorder: (id: string, dir: 'up' | 'down' | 'front' | 'back') => void
  moveLayer: (id: string, toIndex: number) => void
  undo: () => void
  redo: () => void
  setZoom: (z: number) => void
  toggleSnap: () => void
  toggleGrid: () => void
  setPreview: (v: boolean) => void
  setPreviewServiceType: (id: string | null) => void
  setGuides: (g: Guide[]) => void
  setEditing: (id: string | null) => void
  markSaved: (t: ResultTemplate) => void
}

const metaOf = (t: ResultTemplate): EditorMeta => ({ name: t.name, serviceTypeIds: [...t.serviceTypeIds], categoryIds: [...t.categoryIds], scope: t.scope, language: t.language })
export const serialize = (doc: TemplateDoc, meta: EditorMeta) => JSON.stringify({ doc, meta })
const clone = <T>(v: T): T => structuredClone(v)
let lastPush = { t: 0, key: '' }

export const useEditorStore = create<EditorState>((set, get) => ({
  template: null,
  meta: { name: '', serviceTypeIds: [], categoryIds: [], scope: 'item', language: 'uz' },
  doc: emptyDoc(),
  savedJson: '',
  selectedIds: [],
  zoom: 1,
  snap: true,
  showGrid: false,
  preview: false,
  previewServiceTypeId: null,
  past: [],
  future: [],
  clipboard: [],
  guides: [],
  editingId: null,

  load: (t, doc) => set({ template: t, meta: metaOf(t), doc: clone(doc ?? t.doc), savedJson: serialize(t.doc, metaOf(t)), selectedIds: [], past: [], future: [], guides: [], editingId: null, previewServiceTypeId: t.serviceTypeIds[0] ?? null }),
  reset: () => set({ template: null, doc: emptyDoc(), selectedIds: [], past: [], future: [], savedJson: '' }),
  setMeta: (patch) => set((s) => ({ meta: { ...s.meta, ...patch } })),
  setDocProps: (patch) => { get().pushHistory(); set((s) => ({ doc: { ...s.doc, ...patch } })) },

  pushHistory: () => { lastPush = { t: 0, key: '' }; set((s) => ({ past: [...s.past.slice(-(HISTORY_LIMIT - 1)), clone(s.doc)], future: [] })) },
  patchElements: (ids, fn, record = true) => {
    if (record) {
      // coalesce rapid edits from the properties panel (typing) into one history step
      const key = ids.join(',')
      const now = Date.now()
      if (!(lastPush.key === key && now - lastPush.t < 700)) get().pushHistory()
      lastPush = { t: now, key }
    }
    const idSet = new Set(ids)
    set((s) => ({ doc: { ...s.doc, elements: s.doc.elements.map((e) => (idSet.has(e.id) ? fn(e) : e)) } }))
  },
  replaceDoc: (doc, record = true) => { if (record) get().pushHistory(); set({ doc }) },

  select: (ids) => set({ selectedIds: ids, editingId: null }),
  toggleSelect: (id) => set((s) => ({ selectedIds: s.selectedIds.includes(id) ? s.selectedIds.filter((x) => x !== id) : [...s.selectedIds, id] })),

  addElement: (el, sel = true) => { get().pushHistory(); set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, el] }, selectedIds: sel ? [el.id] : s.selectedIds })) },
  removeSelected: () => {
    const { selectedIds, doc } = get()
    const removable = doc.elements.filter((e) => selectedIds.includes(e.id) && !e.locked).map((e) => e.id)
    if (!removable.length) return
    get().pushHistory()
    set((s) => ({ doc: { ...s.doc, elements: s.doc.elements.filter((e) => !removable.includes(e.id)) }, selectedIds: [] }))
  },
  duplicateSelected: () => {
    const { selectedIds, doc } = get()
    const src = doc.elements.filter((e) => selectedIds.includes(e.id))
    if (!src.length) return
    get().pushHistory()
    const copies = src.map((e) => ({ ...clone(e), id: newElementId(), x: e.x + 12, y: e.y + 12, locked: false }))
    set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, ...copies] }, selectedIds: copies.map((c) => c.id) }))
  },
  copy: () => { const { selectedIds, doc } = get(); set({ clipboard: clone(doc.elements.filter((e) => selectedIds.includes(e.id))) }) },
  paste: () => {
    const { clipboard } = get()
    if (!clipboard.length) return
    get().pushHistory()
    const copies = clipboard.map((e) => ({ ...clone(e), id: newElementId(), x: e.x + 16, y: e.y + 16, locked: false }))
    set((s) => ({ doc: { ...s.doc, elements: [...s.doc.elements, ...copies] }, selectedIds: copies.map((c) => c.id), clipboard: copies }))
  },
  reorder: (id, dir) => {
    const els = [...get().doc.elements]
    const i = els.findIndex((e) => e.id === id)
    if (i < 0) return
    const [el] = els.splice(i, 1)
    if (!el) return
    const j = dir === 'front' ? els.length : dir === 'back' ? 0 : dir === 'up' ? Math.min(els.length, i + 1) : Math.max(0, i - 1)
    els.splice(j, 0, el)
    get().pushHistory()
    set((s) => ({ doc: { ...s.doc, elements: els } }))
  },
  moveLayer: (id, toIndex) => {
    const els = [...get().doc.elements]
    const i = els.findIndex((e) => e.id === id)
    if (i < 0) return
    const [el] = els.splice(i, 1)
    if (!el) return
    els.splice(Math.max(0, Math.min(els.length, toIndex)), 0, el)
    get().pushHistory()
    set((s) => ({ doc: { ...s.doc, elements: els } }))
  },
  undo: () => set((s) => { const prev = s.past.at(-1); if (!prev) return s; return { doc: prev, past: s.past.slice(0, -1), future: [clone(s.doc), ...s.future].slice(0, HISTORY_LIMIT), selectedIds: s.selectedIds.filter((id) => prev.elements.some((e) => e.id === id)) } }),
  redo: () => set((s) => { const next = s.future[0]; if (!next) return s; return { doc: next, future: s.future.slice(1), past: [...s.past, clone(s.doc)].slice(-HISTORY_LIMIT), selectedIds: s.selectedIds.filter((id) => next.elements.some((e) => e.id === id)) } }),

  setZoom: (z) => set({ zoom: Math.min(2, Math.max(0.25, Math.round(z * 100) / 100)) }),
  toggleSnap: () => set((s) => ({ snap: !s.snap })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  setPreview: (v) => set({ preview: v, editingId: null }),
  setPreviewServiceType: (id) => set({ previewServiceTypeId: id }),
  setGuides: (guides) => set({ guides }),
  setEditing: (id) => set({ editingId: id }),
  markSaved: (t) => set((s) => ({ template: t, savedJson: serialize(s.doc, s.meta) })),
}))

/** Convenience selectors */
export const useSelectedElements = () => useEditorStore(useShallow((s) => s.doc.elements.filter((e) => s.selectedIds.includes(e.id))))
export const useIsDirty = () => useEditorStore((s) => !!s.template && serialize(s.doc, s.meta) !== s.savedJson)
