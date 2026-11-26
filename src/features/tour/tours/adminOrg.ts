/**
 * The page tours of the admin panel's organisation pages: the dashboard, the unit card, the units tree, employees,
 * roles, SMS settings and «Hududlar». The readers administer a company, a region, a district or one facility — a step
 * about something their role does not have (a button, a card) is left out by the engine.
 */
import type { TourDef, TourStep } from '../types'

/**
 * The card of a unit. `/admin/unit` (the administered unit) and `/admin/units/:unitId` (a unit under it) render the
 * same page, so both tours walk the same steps with the same words (`tour.pages.unit`). The SMS account, the SMS texts
 * and the result-link card are the ones of the SMS settings page (`sms-…`).
 */
const UNIT_STEPS: TourStep[] = [
  { key: 'intro', target: 'page-head' },
  { key: 'edit', target: 'unit-edit', placement: 'bottom' },
  { key: 'header', target: 'unit-header' },
  { key: 'counts', target: 'unit-counts' },
  { key: 'settings', target: 'unit-settings' },
  { key: 'docLink', target: 'sms-doclink' },
  { key: 'smsAccount', target: 'sms-account' },
  { key: 'smsTexts', target: 'sms-texts' },
]

export const ADMIN_ORG_TOURS: TourDef[] = [
  { id: 'adminDashboard', audience: 'admin', route: '/admin', i18n: 'tour.pages.adminDashboard', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'unit', target: 'adminDashboard-unit' },
    { key: 'stats', target: 'adminDashboard-stats' },
    { key: 'health', target: 'adminDashboard-health' },
    { key: 'links', target: 'adminDashboard-links' },
    { key: 'recent', target: 'adminDashboard-recent' },
  ] },

  { id: 'unit', audience: 'admin', route: '/admin/unit', i18n: 'tour.pages.unit', steps: UNIT_STEPS },

  { id: 'units', audience: 'admin', route: '/admin/units', i18n: 'tour.pages.units', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: 'units-search', placement: 'bottom' },
    { key: 'tree', target: 'units-tree' },
    { key: 'rowActions', target: 'units-row-actions', placement: 'bottom' },
    { key: 'add', target: 'units-add', placement: 'bottom' },
    { key: 'quickStart', target: 'units-quick', placement: 'bottom' },
  ] },

  // the same page as `unit`, opened for a unit below: the same steps and words
  { id: 'unitDetail', memory: 'unit', audience: 'admin', route: '/admin/units/:unitId', i18n: 'tour.pages.unit', steps: UNIT_STEPS },

  { id: 'employees', audience: 'admin', route: '/admin/employees', i18n: 'tour.pages.employees', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: 'employees-search', placement: 'bottom' },
    // the unit picker stands between the two selects, so the frame takes all three
    { key: 'filters', target: ['employees-role', 'employees-status'], together: true, placement: 'bottom' },
    { key: 'table', target: 'employees-table' },
    { key: 'add', target: 'employees-add', placement: 'bottom' },
  ] },

  { id: 'employee', audience: 'admin', route: '/admin/employees/:employeeId', i18n: 'tour.pages.employee', steps: [
    { key: 'intro', target: ['page-head', 'employee-tabs'], together: true },
    { key: 'info', target: 'employee-info' },
    { key: 'edit', target: 'employee-edit', placement: 'bottom' },
    { key: 'danger', target: 'employee-danger' },
  ] },

  { id: 'roles', audience: 'admin', route: '/admin/roles', i18n: 'tour.pages.roles', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'list', target: 'roles-list', placement: 'right' },
    { key: 'detail', target: 'roles-detail' },
    { key: 'search', target: 'roles-search', placement: 'bottom' },
    // every module of the matrix carries the mark — the frame takes the first one
    { key: 'group', target: 'roles-group' },
    { key: 'new', target: 'roles-new', placement: 'bottom' },
  ] },

  { id: 'sms', audience: 'admin', route: '/admin/sms', i18n: 'tour.pages.sms', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'target', target: 'sms-target' },
    // the three ways; the whole card while the account is still loading
    { key: 'account', target: ['sms-modes', 'sms-account'] },
    { key: 'test', target: 'sms-test' },
    { key: 'texts', target: 'sms-texts' },
    { key: 'docLink', target: 'sms-doclink' },
    { key: 'telegram', target: 'sms-telegram' },
  ] },

  // «Hududlar»: an administrator's own part of the tree — countries are cards, regions / districts / facilities a table
  { id: 'territory', audience: 'admin', route: '/admin/platform', i18n: 'tour.pages.territory', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'path', target: 'territory-path', placement: 'bottom' },
    { key: 'period', target: 'territory-period', placement: 'bottom' },
    { key: 'numbers', target: 'territory-numbers' },
    { key: 'cards', target: 'territory-cards' },
    { key: 'table', target: 'territory-table' },
    { key: 'csv', target: 'territory-csv' },
    { key: 'trend', target: 'territory-trend' },
    { key: 'add', target: 'territory-add', placement: 'bottom' },
  ] },
]
