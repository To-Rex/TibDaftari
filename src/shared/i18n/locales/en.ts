import type { DeepPartial } from '../types'
import type { Dictionary } from './uz'

export const en: DeepPartial<Dictionary> = {
  common: {
    appName: 'TibDaftari', loading: 'Loading…', save: 'Save', saving: 'Saving…', cancel: 'Cancel', close: 'Close', delete: 'Delete', edit: 'Edit', create: 'Create', add: 'Add',
    search: 'Search', searchPlaceholder: 'Search…', filter: 'Filter', all: 'All', yes: 'Yes', no: 'No', back: 'Back', next: 'Next', done: 'Done', actions: 'Actions', status: 'Status',
    date: 'Date', today: 'Today', yesterday: 'Yesterday', last7: '7 days', last30: '30 days', thisMonth: 'This month', total: 'Total', sum: 'UZS', empty: 'Nothing found',
    emptyHint: 'Try changing the search or filters', error: 'Something went wrong', retry: 'Retry', required: 'Required', optional: 'optional', confirm: 'Confirm', areYouSure: 'Are you sure?',
    perPage: 'Per page', of: 'of', rows: 'rows', page: 'Page', noAccess: 'You don’t have access to this section', logout: 'Sign out', profile: 'Profile', settings: 'Settings',
    language: 'Language', theme: 'Theme', themeLight: 'Light', themeDark: 'Dark', themeSystem: 'System', copy: 'Copy', copied: 'Copied', print: 'Print', download: 'Download', preview: 'Preview',
    active: 'Active', inactive: 'Inactive', draft: 'Draft', archived: 'Archived', published: 'Published', version: 'Version', name: 'Name', phone: 'Phone', fullName: 'Full name',
    birthDate: 'Date of birth', gender: 'Gender', male: 'Male', female: 'Female', address: 'Address', branch: 'Branch', allBranches: 'All branches', company: 'Company', price: 'Price',
    days: 'days', seeAll: 'See all', new: 'New', unsaved: 'You have unsaved changes', leaveConfirm: 'Unsaved changes will be lost. Leave?', more: 'More', less: 'Less', select: 'Select', notSet: '—',
  },
  nav: {
    dashboard: 'Dashboard', reception: 'Reception', patients: 'Patients', orders: 'Orders', lab: 'Laboratory', confirm: 'Approval', reports: 'Reports', messages: 'Messages', admin: 'Administration',
    company: 'Company', branches: 'Branches', employees: 'Employees', roles: 'Roles & permissions', catalog: 'Service catalog', schemas: 'Result schemas', templates: 'Templates',
    smsSettings: 'SMS settings', platform: 'Platform', portalHome: 'Home', portalResults: 'Results', portalVisits: 'Visits', portalProfile: 'Profile', staffApp: 'Staff app',
  },
  auth: {
    staffTitle: 'Staff sign in', staffSubtitle: 'Enter your login and password', login: 'Login', password: 'Password', signIn: 'Sign in', signingIn: 'Checking…', patientTitle: 'Patient portal',
    patientSubtitle: 'We will send a verification code to your phone', phone: 'Phone number', sendCode: 'Send code', codeSent: 'Code sent', enterCode: 'Enter the 4-digit code sent to {{phone}}',
    verify: 'Verify', resend: 'Resend', resendIn: 'Resend ({{s}}s)', changePhone: 'Change number', orContinueWith: 'or', google: 'Continue with Google', apple: 'Continue with Apple', soon: 'soon',
    devHint: 'Demo code: {{code}}', demoAccounts: 'Demo accounts', demoPassword: 'Password: 123456', forStaff: 'Are you staff?', forPatients: 'Are you a patient?', staffLink: 'Staff sign in',
    patientLink: 'Patient portal', sessionExpired: 'Session expired, please sign in again',
  },
  landing: {
    heroEyebrow: 'One platform for clinics and patients', heroTitle: 'Your results — instantly, in one place',
    heroSubtitle: 'Lab results, visits and documents in a secure portal tied to your phone number. For clinics — reception, laboratory, approval and SMS in a single system.',
    ctaPatient: 'See my results', ctaStaff: 'For staff', feat1Title: 'Result ready — you get an SMS', feat1Text: 'As soon as the doctor approves, the result appears in your portal and an SMS is sent.',
    feat2Title: 'Every document is kept', feat2Text: 'PDF forms, receipts and visit history — download any time.', feat3Title: 'Built for multi-branch clinics',
    feat3Text: 'Company → branch → employee. Roles, permissions, reports and dynamic templates.', stat1: 'results delivered', stat2: 'clinics', stat3: 'average wait',
    footer: '© {{year}} TibDaftari. All rights reserved.', demoBadge: 'Demo mode — mock data',
  },
}
