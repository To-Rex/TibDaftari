import type { ResultTemplate } from '@/domain'
import { routes } from '@/shared/config/routes'

/** The two template libraries of the admin: result documents (item/order scope) and cashier cheques (receipt scope). */
export type TemplateKind = 'result' | 'receipt'

export const templateKind = (tpl: Pick<ResultTemplate, 'scope'>): TemplateKind => (tpl.scope === 'receipt' ? 'receipt' : 'result')

/** Editor route of a template: cheques live under /admin/receipts, result documents under /admin/templates. */
export const templateEditorRoute = (tpl: Pick<ResultTemplate, 'id' | 'scope'>): string => (tpl.scope === 'receipt' ? routes.admin.receipt(tpl.id) : routes.admin.template(tpl.id))

/** The gallery a template belongs to (the editor's "back" target). */
export const templateListRoute = (kind: TemplateKind): string => (kind === 'receipt' ? routes.admin.receipts : routes.admin.templates)
