/**
 * Template import / export — a portable JSON file (`.tibdaftari-template.json`).
 *   • bindings travel as service CODES / category CODES (ids differ between companies/backends);
 *   • images referenced by assetId are embedded as data URIs so the file is self-contained;
 *   • import validates with zod, re-creates assets (deduped by kind+name), remaps ids and
 *     saves the template as a DRAFT — nothing existing is overwritten.
 */
import { z } from 'zod'
import type { Category, ResultTemplate, ServiceType, TemplateAsset, TemplateDoc } from '@/domain'
import { repos } from '@/data'

export const TEMPLATE_FILE_FORMAT = 'tibdaftari-template'
export const TEMPLATE_FILE_VERSION = 1

const assetSchema = z.object({
  id: z.string(),
  kind: z.enum(['logo', 'stamp', 'signature', 'image']),
  name: z.string(),
  dataUrl: z.string().startsWith('data:'),
  width: z.number(),
  height: z.number(),
})
const fileSchema = z.object({
  format: z.literal(TEMPLATE_FILE_FORMAT),
  version: z.number().int().min(1),
  exportedAt: z.string(),
  template: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    scope: z.enum(['item', 'order']),
    language: z.enum(['uz', 'ru', 'en']),
    serviceCodes: z.array(z.string()),
    categoryCodes: z.array(z.string()),
    doc: z.object({
      paper: z.enum(['A4', 'A5', 'Letter']),
      orientation: z.enum(['portrait', 'landscape']),
      background: z.string(),
      margin: z.number(),
      elements: z.array(z.record(z.string(), z.unknown())),
    }),
  }),
  assets: z.array(assetSchema),
})
export type TemplateFile = z.infer<typeof fileSchema>

/* ------------------------------- export ------------------------------- */

async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  const res = await fetch(url)
  const blob = await res.blob()
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export async function buildTemplateFile(tpl: ResultTemplate, assets: TemplateAsset[], serviceTypes: ServiceType[], categories: Category[]): Promise<TemplateFile> {
  const usedAssetIds = new Set<string>()
  for (const el of tpl.doc.elements) if (el.type === 'image' && el.assetId) usedAssetIds.add(el.assetId)
  const embedded = await Promise.all(
    assets.filter((a) => usedAssetIds.has(a.id)).map(async (a) => ({ id: a.id, kind: a.kind, name: a.name, dataUrl: await toDataUrl(a.url), width: a.width, height: a.height })),
  )
  const code = (id: string) => serviceTypes.find((s) => s.id === id)?.code ?? null
  const ccode = (id: string) => categories.find((c) => c.id === id)?.code ?? null
  return {
    format: TEMPLATE_FILE_FORMAT,
    version: TEMPLATE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    template: {
      name: tpl.name,
      description: tpl.description,
      scope: tpl.scope,
      language: tpl.language,
      serviceCodes: tpl.serviceTypeIds.map(code).filter((c): c is string => !!c),
      categoryCodes: tpl.categoryIds.map(ccode).filter((c): c is string => !!c),
      doc: tpl.doc as unknown as TemplateFile['template']['doc'],
    },
    assets: embedded,
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9а-яёўқғҳ]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'template'

export function downloadTemplateFile(file: TemplateFile) {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${slug(file.template.name)}.tibdaftari-template.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

/* ------------------------------- import ------------------------------- */

export class TemplateFileError extends Error {}

export async function parseTemplateFile(file: File): Promise<TemplateFile> {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new TemplateFileError('invalid_json')
  }
  const r = fileSchema.safeParse(json)
  if (!r.success) throw new TemplateFileError('invalid_format')
  return r.data
}

export interface ImportResult {
  template: ResultTemplate
  createdAssets: number
  reusedAssets: number
  unresolvedServiceCodes: string[]
  unresolvedCategoryCodes: string[]
}

/**
 * Re-create assets (dedup by kind+name+dimensions), remap ids inside the doc,
 * resolve bindings by code, and save as a NEW draft template.
 */
export async function importTemplateFile(companyId: string, file: TemplateFile, ctx: { assets: TemplateAsset[]; serviceTypes: ServiceType[]; categories: Category[]; existingNames: string[] }): Promise<ImportResult> {
  const idMap = new Map<string, string>()
  let created = 0, reused = 0
  for (const a of file.assets) {
    const found = ctx.assets.find((x) => x.kind === a.kind && x.name === a.name && x.width === a.width && x.height === a.height)
    if (found) { idMap.set(a.id, found.id); reused++; continue }
    const up = await repos.templates.uploadAsset(companyId, { kind: a.kind, name: a.name, url: a.dataUrl, width: a.width, height: a.height })
    idMap.set(a.id, up.id)
    created++
  }
  const doc = structuredClone(file.template.doc) as unknown as TemplateDoc
  for (const el of doc.elements) if (el.type === 'image' && el.assetId) el.assetId = idMap.get(el.assetId) ?? el.assetId

  const byCode = new Map(ctx.serviceTypes.filter((s) => s.code).map((s) => [s.code!.toLowerCase(), s.id]))
  const byCat = new Map(ctx.categories.filter((c) => c.code).map((c) => [c.code!.toLowerCase(), c.id]))
  const unresolvedServiceCodes: string[] = [], unresolvedCategoryCodes: string[] = []
  const serviceTypeIds = file.template.serviceCodes.map((c) => { const id = byCode.get(c.toLowerCase()); if (!id) unresolvedServiceCodes.push(c); return id }).filter((x): x is string => !!x)
  const categoryIds = file.template.categoryCodes.map((c) => { const id = byCat.get(c.toLowerCase()); if (!id) unresolvedCategoryCodes.push(c); return id }).filter((x): x is string => !!x)

  let name = file.template.name
  if (ctx.existingNames.includes(name)) { let i = 2; while (ctx.existingNames.includes(`${file.template.name} (${i})`)) i++; name = `${file.template.name} (${i})` }

  const template = await repos.templates.save({ companyId, name, description: file.template.description, scope: file.template.scope, language: file.template.language, serviceTypeIds, categoryIds, doc, status: 'draft' })
  return { template, createdAssets: created, reusedAssets: reused, unresolvedServiceCodes, unresolvedCategoryCodes }
}
