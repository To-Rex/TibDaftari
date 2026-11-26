/**
 * The reception desk of the staff app: the home page, reception, one cheque, the patients, one patient's card and the
 * list of cheques. The order of work a receptionist follows is: find or add the patient (reception) → «Yangi chek» →
 * add the services and take the payment (the cheque page).
 */
import type { TourDef } from '../types'

export const STAFF_DESK_TOURS: TourDef[] = [
  { id: 'dashboard', audience: 'staff', route: '/app', i18n: 'tour.pages.dashboard', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'stats', target: 'dashboard-stats' },
    { key: 'quick', target: 'dashboard-quick' },
    // the period switch is the header's actions block
    { key: 'period', target: 'page-actions' },
    { key: 'trend', target: 'dashboard-trend' },
    { key: 'categories', target: 'dashboard-categories' },
  ] },

  { id: 'reception', audience: 'staff', route: '/app/reception', i18n: 'tour.pages.reception', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: 'reception-search' },
    { key: 'results', target: 'reception-results' },
    { key: 'newPatient', target: 'reception-new' },
    { key: 'detail', target: 'reception-detail' },
    // on the page only once a patient is picked (the tour asked for from «?»)
    { key: 'newOrder', target: 'reception-new-order' },
  ] },

  { id: 'order', audience: 'staff', route: '/app/reception/orders/:orderId', i18n: 'tour.pages.order', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'items', target: 'order-items' },
    { key: 'add', target: 'order-add' },
    { key: 'totals', target: 'order-totals' },
    // the button appears once the cheque has services and something is left to pay
    { key: 'pay', target: 'order-pay' },
    { key: 'print', target: 'order-print' },
    // an unpaid cheque only
    { key: 'cancel', target: 'order-cancel' },
    { key: 'payments', target: 'order-payments' },
  ] },

  { id: 'patients', audience: 'staff', route: '/app/patients', i18n: 'tour.pages.patients', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: 'patients-search' },
    { key: 'tags', target: 'patients-tags' },
    { key: 'table', target: 'patients-table' },
    { key: 'new', target: 'patients-new' },
  ] },

  { id: 'patient', audience: 'staff', route: '/app/patients/:patientId', i18n: 'tour.pages.patient', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'newOrder', target: 'patient-new-order' },
    { key: 'edit', target: 'patient-edit' },
    { key: 'access', target: 'patient-access' },
    { key: 'stats', target: 'patient-stats' },
    // only a patient who shares the phone number with relatives has it
    { key: 'family', target: 'patient-family' },
    // the tabs themselves cannot be marked: the step frames what they switch
    { key: 'tabs', target: ['patient-tabs', 'patient-tab'] },
  ] },

  { id: 'orders', audience: 'staff', route: '/app/orders', i18n: 'tour.pages.orders', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'search', target: 'orders-search' },
    { key: 'period', target: 'orders-period' },
    // frames the payment list; the status buttons beside it are named in the text
    { key: 'payment', target: ['orders-status', 'orders-payment'], together: true },
    { key: 'filters', target: 'orders-filters' },
    { key: 'summary', target: 'orders-summary' },
    { key: 'table', target: 'orders-table' },
    { key: 'export', target: 'orders-export' },
  ] },
]
