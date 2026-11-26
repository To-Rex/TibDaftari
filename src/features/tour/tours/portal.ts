/**
 * The page tours of the patient's cabinet (/me). The readers are patients on a phone, so every tour is short and
 * points at whole blocks. The step about the family switch exists only for an SMS-code session with several people
 * on the number; a step about a list row falls back to the list's card while it is loading or empty.
 */
import type { TourDef } from '../types'

export const PORTAL_TOURS: TourDef[] = [
  { id: 'portalHome', audience: 'portal', route: '/me', i18n: 'tour.pages.portalHome', steps: [
    { key: 'intro', target: 'portalHome-head' },
    { key: 'family', target: 'portal-family' },
    { key: 'summary', target: 'portalHome-summary' },
    { key: 'results', target: 'portalHome-results' },
    { key: 'visits', target: 'portalHome-visits' },
  ] },
  { id: 'portalResults', audience: 'portal', route: '/me/results', i18n: 'tour.pages.portalResults', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'family', target: 'portal-family' },
    { key: 'filter', target: 'portal-filter' },
    { key: 'open', target: ['portal-result-row', 'portalResults-list'] },
  ] },
  { id: 'portalResult', audience: 'portal', route: '/me/results/:documentId', i18n: 'tour.pages.portalResult', steps: [
    { key: 'intro', target: 'portalResult-head' },
    { key: 'actions', target: 'portalResult-actions' },
    { key: 'document', target: 'portalResult-document' },
    { key: 'info', target: 'portalResult-info' },
  ] },
  { id: 'portalVisits', audience: 'portal', route: '/me/visits', i18n: 'tour.pages.portalVisits', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'family', target: 'portal-family' },
    { key: 'row', target: ['portal-visit-row', 'portalVisits-list'] },
    { key: 'pages', target: 'portalVisits-pages' },
  ] },
  { id: 'portalVisit', audience: 'portal', route: '/me/visits/:orderId', i18n: 'tour.pages.portalVisit', steps: [
    { key: 'intro', target: 'portalVisit-head' },
    { key: 'service', target: ['portal-visit-item', 'portalVisit-services'] },
    { key: 'payment', target: 'portalVisit-payment' },
    { key: 'place', target: 'portal-place' },
  ] },
  { id: 'portalProfile', audience: 'portal', route: '/me/profile', i18n: 'tour.pages.portalProfile', steps: [
    { key: 'intro', target: 'page-head' },
    { key: 'info', target: 'portalProfile-info' },
    // only one of the two is on the page: the way this session signed in
    { key: 'loginPhone', target: 'portalProfile-phone' },
    { key: 'loginPassword', target: 'portalProfile-password' },
    { key: 'settings', target: ['portalProfile-prefs', 'portalProfile-logout'], together: true },
  ] },
]
