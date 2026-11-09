import type { AuditStamp, Id, IsoDate, Locale } from './common'

export type Gender = 'male' | 'female'

/**
 * Patient (mijoz) — ONE registry per country. Identity rules (business decision):
 *   - passportNumber and pinfl are unique inside a country when present;
 *   - if neither is present, phone must be unique.
 * `registeredUnitId` = the facility that registered the patient (lists are scoped by it and by visits).
 * The portal is entered with the phone number + SMS code (every patient of the phone), or with a login + password
 * issued at reception (that patient only — relatives sharing one phone each see their own results).
 */
export interface Patient extends AuditStamp {
  id: Id
  countryId: Id
  /** the facility that registered the patient (null: legacy rows without one and no cheque yet) */
  registeredUnitId?: Id | null
  registeredUnitName?: string | null
  fullName: string
  phone: string // normalized 998XXXXXXXXX
  phoneExtra?: string
  gender?: Gender
  birthDate?: IsoDate
  passportNumber?: string
  pinfl?: string // JSHSHIR, 14 digits
  address?: {
    regionId?: Id
    districtId?: Id
    street?: string
  }
  workplace?: string
  discountPercent: number
  contractNumber?: string
  note?: string
  tags: string[]
  /** derived, kept denormalised for lists */
  stats: {
    orders: number
    lastVisitAt?: string
    totalSpent: number
  }
  portal: {
    linked: boolean // has logged into the portal at least once
    telegramChatId?: string
    /** portal login issued at reception (null = none); the password is never returned */
    login?: string | null
    loginSetAt?: string | null
  }
}

/** Issue / renew the portal login: empty login = keep the current one (or a free one is picked), empty password = generated. */
export interface PortalAccessInput {
  login?: string
  password?: string
  sendSms?: boolean
  /** the facility the employee works in — its SMS account sends the text */
  unitId?: Id
}

/** The credentials, shown to the employee once. `sms`: null = not asked for. */
export interface PortalAccessResult {
  login: string
  password: string
  sms: 'queued' | 'not_configured' | 'invalid_phone' | null
  patient: Patient
}

export interface PatientUpsertInput {
  /** the facility registering the patient (default: the request's scope unit when it is a facility) */
  registeredUnitId?: Id
  fullName: string
  phone: string
  gender?: Gender
  birthDate?: IsoDate
  passportNumber?: string
  pinfl?: string
  address?: Patient['address']
  workplace?: string
  discountPercent?: number
  contractNumber?: string
  note?: string
}

/** ISO 3166-1 country; `name` is Uzbek, `nameRu`/`nameEn` the localised names, plus the per-country settings. */
export interface Country {
  id: Id
  code: string
  name: string
  nameRu?: string | null
  nameEn?: string | null
  phoneCode?: string | null
  currencyCode?: string | null
  defaultLocale?: Locale | null
  timezone?: string | null
  phoneMask?: string | null
  /** the system is live in this country (an org tree may be opened under it) */
  isEnabled?: boolean
}
/** First-level division (viloyat / oblast / city of republican status) of a country. */
export interface Region {
  id: Id
  countryId: Id
  name: string
}
/** Tuman or shahar of a region. */
export interface District {
  id: Id
  regionId: Id
  name: string
  kind?: 'district' | 'city'
}
