import type { Key } from "@lib/i18n/dictionary"

import type { ProblemKind } from "./problem-report"

/**
 * THE GUEST ORDER PAGE'S SHAPES AND RULES (V1.1). The answer of `POST /store/guest-orders/lookup`
 * (backend `workflows/utils/guest-order/lookup.ts`, the customer-safe view) and the pure decisions
 * the page makes from it. Nothing here touches the network or the DOM.
 */
export type GuestOrderStatus = {
  status: string
  label: string
  updated_at: string
  history: { to_label: string; created_at: string }[]
}

export type GuestOrderTracking = {
  carrier: string
  number: string
  url: string | null
}

/**
 * A problem report the customer filed for the order, as the shop gives it back: the case reference, the kind,
 * the time and a two-step state. No text, phone number or photo comes back, and no promise is made by either state.
 */
export type GuestProblemReport = {
  id: string
  kind: ProblemKind
  created_at: string
  stage: "received" | "in_progress"
}

/**
 * A withdrawal declaration the customer made for the order, as the shop gives it back: the reference, the time of
 * receipt and the order lines it names. No name and no stage: nothing is promised about what follows.
 */
export type GuestWithdrawal = {
  id: string
  created_at: string
  item_ids: string[]
}

export type GuestOrder = {
  display_id: number | string
  created_at: string | null
  total: number
  currency_code: string
  payment_status: string | null
  business_status: GuestOrderStatus | null
  /** `id`: the order line's id (the problem report names the lines by it) */
  items: { id: string; title: string; quantity: number; total: number }[]
  shipping: {
    method_name: string
    pickup_point: { name: string; address: string } | null
    store_pickup: boolean
  } | null
  tracking: GuestOrderTracking | null
  /** absent from an older shop answer: then there is nothing to list */
  problem_reports?: GuestProblemReport[]
  /** the order's withdrawal declarations, the oldest first; absent from an older shop answer: then there is nothing to list */
  withdrawals?: GuestWithdrawal[]
}

export type GuestOrderLookupResult =
  | { ok: true; orders: GuestOrder[] }
  | { ok: false; kind: "not_found" | "too_many" | "invalid" | "unavailable" }

/** The seven business statuses of the shop, by their code, to the dictionary group `guestOrder.status`. */
export const STATUS_KEY = {
  pending_processing: "pendingProcessing",
  confirmed: "confirmed",
  stocking: "stocking",
  out_for_delivery: "outForDelivery",
  ready_for_pickup: "readyForPickup",
  closed: "closed",
  closed_unsuccessfully: "closedUnsuccessfully",
} as const

/**
 * The payment states that SAY something to a customer, to the dictionary group `guestOrder.payment`.
 * Any other state (authorized, requires_action, canceled ...) has no line: a word the customer would
 * not understand is worse than none.
 */
export const PAYMENT_KEY = {
  not_paid: "awaiting",
  awaiting: "awaiting",
  captured: "paid",
  partially_captured: "paid",
  refunded: "refunded",
  partially_refunded: "partiallyRefunded",
} as const

export const statusTextKeys = (
  code: string,
): { label: Key; text: Key } | null => {
  const key = (STATUS_KEY as Record<string, string | undefined>)[code]
  return key
    ? {
        label: `guestOrder.status.${key}.label` as Key,
        text: `guestOrder.status.${key}.text` as Key,
      }
    : null
}

export const paymentTextKeys = (
  state: string | null,
): { label: Key; text: Key } | null => {
  const key = state
    ? (PAYMENT_KEY as Record<string, string | undefined>)[state]
    : undefined
  return key
    ? {
        label: `guestOrder.payment.${key}.label` as Key,
        text: `guestOrder.payment.${key}.text` as Key,
      }
    : null
}

const CARRIER_NAMES: Record<string, string> = { foxpost: "Foxpost", gls: "GLS" }

/** The carrier as the customer knows it; an unknown one is shown as stored, never invented. */
export const carrierName = (carrier: string): string =>
  CARRIER_NAMES[carrier.toLowerCase()] ?? carrier

/** A tracking link may be shown only when it is an https address (the backend checks too). */
export const safeTrackingUrl = (url: string | null): string | null =>
  url && /^https:\/\/[^\s]+$/i.test(url) ? url : null

export const lookupErrorKey = (
  kind: Extract<GuestOrderLookupResult, { ok: false }>["kind"],
): Key =>
  kind === "not_found"
    ? "guestOrder.errorNotFound"
    : kind === "too_many"
      ? "guestOrder.errorTooMany"
      : kind === "invalid"
        ? "guestOrder.errorNotFound"
        : "guestOrder.errorUnavailable"

/** The backend's HTTP status as the page's kind of failure. */
export const lookupKindOfStatus = (
  status: number | undefined,
): Extract<GuestOrderLookupResult, { ok: false }>["kind"] =>
  status === 404 || status === 400
    ? status === 404
      ? "not_found"
      : "invalid"
    : status === 429
      ? "too_many"
      : "unavailable"

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type GuestFormErrors = { orderNumber?: Key; email?: Key }

/** The form's own checks, before anything leaves the browser. Empty object: send it. */
export const guestFormErrors = (input: {
  orderNumber: string
  email: string
}): GuestFormErrors => {
  const errors: GuestFormErrors = {}
  const number = input.orderNumber.trim().replace(/^#/, "")
  if (number === "") errors.orderNumber = "guestOrder.errorRequired"
  else if (!/^\d{1,10}$/.test(number))
    errors.orderNumber = "guestOrder.errorNumber"
  const email = input.email.trim()
  if (email === "") errors.email = "guestOrder.errorRequired"
  else if (!EMAIL.test(email) || email.length > 254)
    errors.email = "guestOrder.errorEmail"
  return errors
}

/** The orders in the order the page shows them: the one to be delivered first, the store pickup after. */
export const orderedForPage = (orders: GuestOrder[]): GuestOrder[] =>
  [...orders].sort(
    (a, b) =>
      Number(a.shipping?.store_pickup === true) -
        Number(b.shipping?.store_pickup === true) ||
      Number(a.display_id) - Number(b.display_id),
  )

/** A purchase is split when it has a store pickup order next to an order of another kind. */
export const isSplitPurchase = (orders: GuestOrder[]): boolean =>
  orders.length === 2 &&
  orders.filter((order) => order.shipping?.store_pickup === true).length === 1
