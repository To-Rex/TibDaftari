import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AttributeSchema, FieldDef, FieldType } from '@/domain'
import { cloneField, newField, slugify, uniqueKey } from './fieldDefaults'

export interface SchemaEditorState {
  name: string
  description: string
  fields: FieldDef[]
}

const snapshot = (s: AttributeSchema): SchemaEditorState => ({ name: s.name, description: s.description ?? '', fields: structuredClone(s.fields).sort((a, b) => a.order - b.order) })
const reorder = (fields: FieldDef[]) => fields.map((f, i) => ({ ...f, order: i }))

/** Local editing state for one schema: fields list + selection + dirty tracking. */
export function useSchemaEditor(schema: AttributeSchema | undefined) {
  const [state, setState] = useState<SchemaEditorState | null>(null)
  const [base, setBase] = useState<string>('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    if (!schema) return
    const s = snapshot(schema)
    setState(s)
    setBase(JSON.stringify(s))
    setSelectedKey((k) => k ?? s.fields[0]?.key ?? null)
  }, [schema])

  const dirty = useMemo(() => !!state && JSON.stringify(state) !== base, [state, base])
  const markSaved = useCallback((s: AttributeSchema) => { const snap = snapshot(s); setState(snap); setBase(JSON.stringify(snap)) }, [])

  const update = useCallback((fn: (s: SchemaEditorState) => SchemaEditorState) => setState((s) => (s ? fn(s) : s)), [])
  const setMeta = (patch: Partial<Pick<SchemaEditorState, 'name' | 'description'>>) => update((s) => ({ ...s, ...patch }))

  const addField = (type: FieldType) => {
    update((s) => {
      const taken = s.fields.map((f) => f.key)
      const label = `${DEFAULT_LABELS[type]} ${s.fields.filter((f) => f.type === type).length + 1}`
      const key = uniqueKey(slugify(label), taken)
      const f = newField(type, label, key, s.fields.length)
      setSelectedKey(key)
      return { ...s, fields: [...s.fields, f] }
    })
  }
  const updateField = (key: string, next: FieldDef) =>
    update((s) => {
      const fields = s.fields.map((f) => (f.key === key ? next : f))
      // keep visibleIf references in sync when key renamed
      if (next.key !== key) for (const f of fields) if (f.visibleIf?.key === key) f.visibleIf = { ...f.visibleIf, key: next.key }
      if (selectedKey === key && next.key !== key) setSelectedKey(next.key)
      return { ...s, fields }
    })
  const removeField = (key: string) =>
    update((s) => {
      const fields = reorder(s.fields.filter((f) => f.key !== key)).map((f) => (f.visibleIf?.key === key ? { ...f, visibleIf: undefined } : f))
      if (selectedKey === key) setSelectedKey(fields[0]?.key ?? null)
      return { ...s, fields }
    })
  const moveField = (key: string, dir: -1 | 1) =>
    update((s) => {
      const i = s.fields.findIndex((f) => f.key === key)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.fields.length) return s
      const fields = [...s.fields]
      const [a, b] = [fields[i]!, fields[j]!]
      fields[i] = b; fields[j] = a
      return { ...s, fields: reorder(fields) }
    })
  const duplicateField = (key: string) =>
    update((s) => {
      const i = s.fields.findIndex((f) => f.key === key)
      const src = s.fields[i]
      if (!src) return s
      const copy = cloneField(src, s.fields.map((f) => f.key))
      const fields = [...s.fields]
      fields.splice(i + 1, 0, copy)
      setSelectedKey(copy.key)
      return { ...s, fields: reorder(fields) }
    })

  const selected = state?.fields.find((f) => f.key === selectedKey) ?? null

  return { state, dirty, selectedKey, selected, setSelectedKey, setMeta, addField, updateField, removeField, moveField, duplicateField, markSaved }
}

const DEFAULT_LABELS: Record<FieldType, string> = {
  text: 'Matn', longtext: 'Izoh', number: 'Ko‘rsatkich', select: 'Tanlov', multiselect: 'Ko‘p tanlov', boolean: 'Ha/Yo‘q', date: 'Sana', table: 'Jadval',
}
