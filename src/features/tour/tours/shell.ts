/**
 * The general tours — one per module: a welcome, the menu group by group (only the entries the reader's role has),
 * the top bar, and where the tours can be found again. The top-bar steps are common to the staff app and the admin
 * panel, so whoever saw them in one module is not walked through them again in the other (`TOP_SEEN`).
 */
import type { TourDef, TourStep } from '../types'

/** remembered once the top bar was shown in either module */
export const TOP_SEEN = 'shell.top'

const item = (when: string, label: string, text: string) => ({ when, label, text: `tour.shell.nav.${text}` })

/** the top bar of the staff app / admin panel; `unit` names the step about the unit switcher */
const top = (unit: 'workplace' | 'scope'): TourStep[] => [
  { key: unit, target: 'top-unit', placement: 'bottom' },
  {
    key: 'tools', target: ['top-keys', 'top-lang', 'top-theme'], together: true, placement: 'bottom',
    items: [
      { when: 'top-keys', label: 'common.hotkeys.title', text: 'tour.shell.tools.keys' },
      { when: 'top-lang', label: 'common.language', text: 'tour.shell.tools.lang' },
      { when: 'top-theme', label: 'common.theme', text: 'tour.shell.tools.theme' },
    ],
  },
  { key: 'notifications', target: 'top-notif', placement: 'bottom' },
  { key: 'me', target: 'top-me', placement: 'bottom' },
]
/** the last step of every general tour: the «?» button */
const HELP: TourStep = { key: 'help', target: 'top-help', placement: 'bottom' }

export const STAFF_SHELL: TourDef = {
  id: 'shell.staff', audience: 'staff', i18n: 'tour.shell',
  steps: [
    { key: 'welcome' },
    { key: 'navMain', target: 'nav-sec-main', menu: true, placement: 'right', items: [
      item('nav-dashboard', 'nav.dashboard', 'dashboard'),
      item('nav-assistant', 'nav.assistant', 'assistant'),
    ] },
    { key: 'navReception', target: 'nav-sec-reception', menu: true, placement: 'right', items: [
      item('nav-reception', 'nav.reception', 'reception'),
      item('nav-patients', 'nav.patients', 'patients'),
      item('nav-orders', 'nav.orders', 'orders'),
    ] },
    { key: 'navLab', target: 'nav-sec-lab', menu: true, placement: 'right', items: [
      item('nav-lab', 'nav.lab', 'lab'),
      item('nav-confirm', 'nav.confirm', 'confirm'),
      item('nav-results', 'nav.results', 'results'),
    ] },
    { key: 'navMore', target: 'nav-sec-more', menu: true, placement: 'right', items: [
      item('nav-reports', 'nav.reports', 'reports'),
      item('nav-messages', 'nav.messages', 'messages'),
    ] },
    { key: 'toAdmin', target: 'nav-switch', menu: true, placement: 'right' },
    ...top('workplace'),
    HELP,
  ],
}

export const ADMIN_SHELL: TourDef = {
  id: 'shell.admin', audience: 'admin', i18n: 'tour.shell',
  steps: [
    { key: 'welcomeAdmin' },
    { key: 'navAdminMain', target: 'nav-sec-main', menu: true, placement: 'right', items: [
      item('nav-dashboard', 'nav.dashboard', 'adminDashboard'),
      item('nav-assistant', 'nav.assistant', 'assistant'),
    ] },
    { key: 'navOrg', target: 'nav-sec-org', menu: true, placement: 'right', items: [
      item('nav-unit', 'nav.unit', 'unit'),
      item('nav-units', 'nav.units', 'units'),
      item('nav-employees', 'nav.employees', 'employees'),
      item('nav-training', 'training.overview.nav', 'training'),
      item('nav-roles', 'nav.roles', 'roles'),
    ] },
    { key: 'navCatalog', target: 'nav-sec-catalog', menu: true, placement: 'right', items: [
      item('nav-catalog', 'nav.catalog', 'catalog'),
      item('nav-schemas', 'nav.schemas', 'schemas'),
      item('nav-templates', 'nav.templates', 'templates'),
      item('nav-receipts', 'nav.receipts', 'receipts'),
    ] },
    { key: 'navSettings', target: 'nav-sec-settings', menu: true, placement: 'right', items: [
      item('nav-sms', 'nav.smsSettings', 'sms'),
      item('nav-territory', 'nav.territory', 'territory'),
    ] },
    { key: 'toStaff', target: 'nav-switch', menu: true, placement: 'right' },
    ...top('scope'),
    HELP,
  ],
}

export const PORTAL_SHELL: TourDef = {
  id: 'shell.portal', audience: 'portal', i18n: 'tour.shell',
  steps: [
    { key: 'welcomePortal' },
    { key: 'portalNav', target: ['portal-nav', 'portal-bottom-nav'], items: [
      { when: 'portal-nav-home', label: 'nav.portalHome', text: 'tour.shell.nav.portalHome' },
      { when: 'portal-nav-results', label: 'nav.portalResults', text: 'tour.shell.nav.portalResults' },
      { when: 'portal-nav-visits', label: 'nav.portalVisits', text: 'tour.shell.nav.portalVisits' },
      { when: 'portal-nav-profile', label: 'nav.portalProfile', text: 'tour.shell.nav.portalProfile' },
    ] },
    { key: 'portalTools', target: ['top-lang', 'top-theme'], together: true, placement: 'bottom' },
    { key: 'portalMe', target: 'top-me', placement: 'bottom' },
    { ...HELP, key: 'portalHelp' },
  ],
}

/** the keys of the steps about the top bar (left out once `TOP_SEEN`, unless the tour was asked for) */
export const TOP_STEP_KEYS = new Set(['workplace', 'scope', 'tools', 'notifications', 'me'])
