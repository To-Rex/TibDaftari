/**
 * The admin panel's catalogue pages: services, result schemas, result templates and cheque templates.
 *
 * The two template galleries are one component (`TemplateGallery`) and the two editors one page
 * (`TemplateEditorPage`), so their targets are shared: `templates-*` in a gallery, `templateEditor-*` in an editor.
 * What a cheque page does not have (the service coverage, the «preview as» list) is simply left out by the engine.
 */
import type { TourDef, TourStep } from '../types'

/** the visual editor, step by step — the same elements for a result document and for a cheque */
const EDITOR: TourStep[] = [
  { key: 'intro', target: 'templateEditor-head' },
  { key: 'tools', target: 'templateEditor-tools', placement: 'right' },
  { key: 'panel', target: 'templateEditor-panel', placement: 'right' },
  { key: 'canvas', target: 'templateEditor-canvas' },
  { key: 'props', target: 'templateEditor-props', placement: 'left' },
  // result documents only: which service's fields and sample the editor works with
  { key: 'previewAs', target: 'templateEditor-preview-as' },
  // inline on a wide screen, inside the «⋯» menu on a narrower one
  { key: 'bindings', target: ['templateEditor-bindings', 'templateEditor-more'] },
  { key: 'finish', target: ['templateEditor-preview', 'templateEditor-save', 'templateEditor-activate'], together: true },
]

export const ADMIN_CATALOG_TOURS: TourDef[] = [
  { id: 'catalog', audience: 'admin', route: '/admin/catalog', i18n: 'tour.pages.catalog', steps: [
    { key: 'intro', target: 'page-head' },
    // the tree stands beside the list on a wide screen and folds into one button on a narrow one
    { key: 'tree', target: ['catalog-tree', 'catalog-tree-trigger'], placement: 'right' },
    { key: 'add', target: 'page-actions' },
    { key: 'list', target: 'catalog-services' },
    // the first service of the list: its menu, its schema / template, its switch
    { key: 'edit', target: 'catalog-row-menu', placement: 'left' },
    { key: 'docs', target: 'catalog-row-docs' },
    { key: 'status', target: 'catalog-row-status', placement: 'left' },
  ] },
  { id: 'schemas', audience: 'admin', route: '/admin/schemas', i18n: 'tour.pages.schemas', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'new', target: 'page-actions' },
    { key: 'search', target: ['schemas-search', 'schemas-status'], together: true },
    { key: 'card', target: 'schemas-card' },
  ] },
  { id: 'schemaEditor', audience: 'admin', route: '/admin/schemas/:schemaId', i18n: 'tour.pages.schemaEditor', steps: [
    { key: 'intro', target: 'schemaEditor-head' },
    { key: 'fields', target: 'schemaEditor-fields', placement: 'right' },
    { key: 'props', target: 'schemaEditor-props' },
    { key: 'preview', target: 'schemaEditor-preview', placement: 'left' },
    { key: 'save', target: 'schemaEditor-save' },
    { key: 'publish', target: 'schemaEditor-publish' },
  ] },
  { id: 'templates', audience: 'admin', route: '/admin/templates', i18n: 'tour.pages.templates', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'create', target: 'page-actions' },
    { key: 'coverage', target: 'templates-coverage' },
    // the search field and the «select» button are the two ends of the toolbar: together they frame all of it
    { key: 'find', target: ['templates-search', 'templates-select'], together: true },
    { key: 'filters', target: 'templates-filters' },
    // the first template: a card, or a row in the list view
    { key: 'card', target: ['templates-card', 'templates-row'] },
  ] },
  { id: 'templateEditor', audience: 'admin', route: '/admin/templates/:templateId', i18n: 'tour.pages.templateEditor', steps: EDITOR },
  { id: 'receipts', audience: 'admin', route: '/admin/receipts', i18n: 'tour.pages.receipts', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'create', target: 'page-actions' },
    { key: 'find', target: ['templates-search', 'templates-select'], together: true },
    { key: 'filters', target: 'templates-filters' },
    { key: 'card', target: ['templates-card', 'templates-row'] },
  ] },
  // a cheque is bound to units, not to services, and prints at the cash desk — so it has words of its own
  { id: 'receiptEditor', audience: 'admin', route: '/admin/receipts/:templateId', i18n: 'tour.pages.receiptEditor', steps: EDITOR.filter((s) => s.key !== 'previewAs') },
]
