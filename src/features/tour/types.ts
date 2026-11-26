/**
 * The guided tours («Yo‘riqnoma»): what the interface shows a newcomer about itself.
 *
 * A tour is a list of steps; a step points at something on the screen — the element carrying `data-tour="<target>"` —
 * and says in one or two sentences what it is for. The texts live in the dictionary under the tour's `i18n` base:
 * `<base>.<step key>.title` and `.body`. A step whose target is not on the page (the reader's role has no such
 * button, the list is empty) is left out, so one tour fits every role.
 */

/** where a tour runs: the staff app (/app), the admin panel (/admin), the patient's cabinet (/me) */
export type TourAudience = 'staff' | 'admin' | 'portal'

/** A line of a list inside a step: a menu entry and what it is for. */
export interface TourListItem {
  /** shown only while this `data-tour` element exists (the reader has this entry) */
  when: string
  /** i18n key of the entry's name, exactly as the interface shows it */
  label: string
  /** i18n key of what it is for */
  text: string
}

export interface TourStep {
  /** unique within the tour; names the texts: `<base>.<key>.title` / `.body` */
  key: string
  /** `data-tour` value(s) of what the step points at — the first one on screen; none = a card in the middle */
  target?: string | string[]
  /** frame ALL the targets that are on screen together (a group of buttons) */
  together?: boolean
  /** a list in the card (the entries of a menu group); a step with a list and none of its entries present is left out */
  items?: TourListItem[]
  /** the step needs the side menu on screen — on a phone the tour opens it */
  menu?: boolean
  /** where the card stands by preference (it moves when there is no room) */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface TourDef {
  /** stable id — also the name under which «seen» is remembered */
  id: string
  /** raise to show a changed tour again to those who saw the old one */
  version?: number
  /** remembered as seen under this id instead of its own — for the same page at another route (a unit's card and a sub-unit's) */
  memory?: string
  audience: TourAudience
  /** the page it teaches, as a route pattern (`/app/lab/:itemId`); the general tours of a module have none */
  route?: string
  /** the dictionary base of its texts (`tour.pages.reception`) */
  i18n: string
  steps: TourStep[]
}
