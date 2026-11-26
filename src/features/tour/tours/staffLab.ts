/**
 * The page tours of the laboratory side of the staff app: the worklist, entering one result, approval (or, without
 * the approval right, the list of ready results), reports, messages — and the assistant, which the staff app and the
 * admin panel both show (two tours, one set of steps and texts).
 */
import type { TourDef, TourStep } from '../types'

/** «Yordamchi»: the same page at /app/assistant and /admin/assistant */
const ASSISTANT_STEPS: TourStep[] = [
  { key: 'intro', target: 'assistant-welcome' },
  { key: 'composer', target: 'assistant-composer' },
  { key: 'examples', target: 'assistant-examples' },
  // an open conversation has no welcome screen — the reminder then stands by the composer
  { key: 'confirm', target: ['assistant-safety', 'assistant-composer'] },
  { key: 'history', target: ['assistant-history', 'assistant-new'], together: true },
  { key: 'tasks', target: 'assistant-tasks' },
]

export const STAFF_LAB_TOURS: TourDef[] = [
  { id: 'lab', audience: 'staff', route: '/app/lab', i18n: 'tour.pages.lab', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'categories', target: 'lab-categories' },
    { key: 'search', target: 'lab-search' },
    { key: 'status', target: 'lab-status' },
    { key: 'period', target: 'date-range' },
    { key: 'list', target: 'lab-list' },
  ] },

  { id: 'labItem', audience: 'staff', route: '/app/lab/:itemId', i18n: 'tour.pages.labItem', steps: [
    { key: 'intro', target: 'labItem-head' },
    { key: 'form', target: 'labItem-form' },
    { key: 'note', target: 'labItem-note' },
    { key: 'save', target: 'labItem-save' },
    { key: 'submit', target: 'labItem-submit' },
    { key: 'after', target: 'item-timeline' },
  ] },

  // the approver has the queue switch and the approve / return buttons; the registrar's «Natijalar» skips those steps
  { id: 'confirm', audience: 'staff', route: '/app/confirm', i18n: 'tour.pages.confirm', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'categories', target: 'confirm-categories' },
    { key: 'queue', target: 'confirm-queue' },
    { key: 'filters', target: ['confirm-search', 'date-range'], together: true },
    { key: 'list', target: 'confirm-list' },
    { key: 'detail', target: 'confirm-detail' },
    { key: 'approve', target: ['confirm-reject', 'confirm-approve'], together: true },
  ] },

  { id: 'reports', audience: 'staff', route: '/app/reports', i18n: 'tour.pages.reports', steps: [
    { key: 'intro', target: ['page-head', 'reports-sections'], together: true },
    { key: 'period', target: 'date-range' },
    { key: 'numbers', target: 'reports-kpis' },
    { key: 'trend', target: 'reports-trend' },
    { key: 'breakdown', target: 'reports-breakdown' },
    { key: 'export', target: 'page-actions' },
  ] },

  { id: 'messages', audience: 'staff', route: '/app/messages', i18n: 'tour.pages.messages', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: ['messages-tabs', 'messages-search'], together: true },
    { key: 'list', target: 'messages-list' },
    { key: 'status', target: 'messages-status' },
    { key: 'newMessage', target: 'messages-new' },
  ] },

  { id: 'assistant', audience: 'staff', route: '/app/assistant', i18n: 'tour.pages.assistant', steps: ASSISTANT_STEPS },
  { id: 'assistantAdmin', memory: 'assistant', audience: 'admin', route: '/admin/assistant', i18n: 'tour.pages.assistant', steps: ASSISTANT_STEPS },
]
