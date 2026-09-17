import type { AuditStamp, Id, IsoDate } from './common'

export type Gender = 'male' | 'female'

/**
 * Patient (mijoz). Identity rules (business decision):
 *   - passportNumber and pinfl are unique inside a company when present;
 *   - if neither is present, phone must be unique.
 * The portal login key is always the phone number.
 */
export interface Patient extends AuditStamp {
  id: Id
  companyId: Id
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
  }
}

export interface PatientUpsertInput {
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

/** ISO 3166-1 country; `name` is Uzbek, `nameRu`/`nameEn` the localised names. */
export interface Country {
  id: Id
  code: string
  name: string
  nameRu?: string | null
  nameEn?: string | null
  phoneCode?: string | null
}
/** First-level division (viloyat / oblast / city of republican status) of a country. */
export interface Region {
  id: Id
  countryId: Id
  name: string
}
export interface District {
  id: Id
  regionId: Id
  name: string
}
