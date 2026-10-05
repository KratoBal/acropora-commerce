import { MedusaError } from "@medusajs/framework/utils"

import { STRIPE_PROVIDER_ID } from "../stripe-config"

/**
 * THE ORDER'S PAYMENT STATE, NEXT TO ITS BUSINESS STATUS (Balázs, 2026-10-05,
 * the expiring card hold; acrobot 26483, decision 1: "Fizetésre vár" is a
 * payment state in its own field, not an eighth business status).
 *
 *   hold              the card is held (the shop's normal case until Kiszállítás)
 *   awaiting_payment  the hold was released ("Csúszik a szállítás"), no link yet
 *   link_sent         the payment link went out (L2)
 *   reminded          the day-3 reminder went out (L4)
 *   paid              the card payment is captured (at Kiszállítás, or the link's)
 *   expired           the link's deadline passed; the order is closed (L4)
 *   none              nothing card-related to wait for: cash on delivery, paying
 *                     at the shop, a canceled order
 *
 * A card hold lives in Medusa's own payment (authorized, not captured, not
 * canceled); what Medusa cannot say (released on purpose, a link, a deadline)
 * lives on the order, under `metadata.acropora_payment`. Once that key is
 * written it is the state; before it, the state is read from the payment.
 */
export const ORDER_PAYMENT_METADATA_KEY = "acropora_payment"

export const ORDER_PAYMENT_STATES = [
  "hold",
  "awaiting_payment",
  "link_sent",
  "reminded",
  "paid",
  "expired",
  "none",
] as const
export type OrderPaymentState = (typeof ORDER_PAYMENT_STATES)[number]

/** The states the shop writes on the order; the others are read from the payment. */
export type StoredOrderPaymentState = Extract<
  OrderPaymentState,
  "awaiting_payment" | "link_sent" | "reminded" | "paid" | "expired"
>
const STORED_STATES: readonly string[] = ["awaiting_payment", "link_sent", "reminded", "paid", "expired"]

export type StoredOrderPayment = {
  state: StoredOrderPaymentState
  /** When the release started, ISO; without `released_at` it stopped half way (`releaseHold`). */
  releasing_at?: string
  /** When the hold was released, ISO. */
  released_at?: string
  /** The released hold, forint: this order's part of it. */
  released_amount?: number
  link?: {
    /** The collection the link pays (a mixed cart: the shipped order's). */
    collection_id: string
    /** A mixed cart's pickup order's collection, paid with the same Stripe payment. */
    pickup_collection_id?: string | null
    sent_at: string
    expires_at: string
    reminded_at?: string | null
    amount: number
    url: string
  } | null
  paid_at?: string | null
}

/**
 * A Stripe authorization lasts 7 days for an online card payment; after that
 * Stripe cancels the intent itself. The expiry is counted from the payment's
 * creation, which in Medusa is the authorization.
 */
export const HOLD_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

/** One Medusa payment of the order, as far as the payment state needs it. */
export type OrderPaymentFacts = {
  id: string
  provider_id: string | null
  amount: number
  created_at: Date | string | null
  canceled_at?: Date | string | null
  /** Booked as captured so far (the sum of its captures). */
  captured: number
  captured_at?: Date | string | null
}

export type OrderPaymentHold = { authorized_at: string; expires_at: string; amount: number }

export type OrderPaymentView = {
  state: OrderPaymentState
  hold: OrderPaymentHold | null
  link: { sent_at: string; expires_at: string; reminded_at: string | null; amount: number; url: string } | null
  paid_at: string | null
}

const iso = (value: Date | string): string => new Date(value).toISOString()

/** The stored state, or null while the order has none (or it is not one we write). */
export const storedOrderPaymentOf = (
  metadata: Record<string, unknown> | null | undefined
): StoredOrderPayment | null => {
  const stored = metadata?.[ORDER_PAYMENT_METADATA_KEY] as Partial<StoredOrderPayment> | undefined
  if (!stored || typeof stored !== "object" || !STORED_STATES.includes(String(stored.state))) return null
  return stored as StoredOrderPayment
}

/** The live card hold: a Stripe payment neither canceled nor captured. */
export const livePaymentOf = (payments: readonly OrderPaymentFacts[]): OrderPaymentFacts | null =>
  payments.find((payment) => !payment.canceled_at) ?? null

export const holdOf = (payments: readonly OrderPaymentFacts[]): OrderPaymentHold | null => {
  const live = livePaymentOf(payments)
  if (!live || live.provider_id !== STRIPE_PROVIDER_ID || live.captured > 0 || !live.created_at) return null
  const authorized = new Date(live.created_at)
  return {
    authorized_at: authorized.toISOString(),
    expires_at: new Date(authorized.getTime() + HOLD_DAYS * DAY_MS).toISOString(),
    amount: live.amount,
  }
}

/** What `GET /admin/order-payment/:order_id` answers, and the OS shows. */
export const orderPaymentView = (input: {
  metadata: Record<string, unknown> | null | undefined
  payments: readonly OrderPaymentFacts[]
}): OrderPaymentView => {
  const stored = storedOrderPaymentOf(input.metadata)
  if (stored) {
    const link = stored.link
    return {
      state: stored.state,
      // released: the hold is gone, whatever Stripe kept of it
      hold: null,
      link: link
        ? {
            sent_at: link.sent_at,
            expires_at: link.expires_at,
            reminded_at: link.reminded_at ?? null,
            amount: link.amount,
            url: link.url,
          }
        : null,
      paid_at: stored.paid_at ?? null,
    }
  }

  const hold = holdOf(input.payments)
  if (hold) return { state: "hold", hold, link: null, paid_at: null }

  const live = livePaymentOf(input.payments)
  if (live && live.provider_id === STRIPE_PROVIDER_ID && live.captured > 0) {
    return {
      state: "paid",
      hold: null,
      link: null,
      paid_at: live.captured_at ? iso(live.captured_at) : null,
    }
  }
  return { state: "none", hold: null, link: null, paid_at: null }
}

/** The order list's field: when the live hold runs out, ISO; null without one. */
export const holdExpiresAt = (input: {
  metadata: Record<string, unknown> | null | undefined
  payments: readonly OrderPaymentFacts[]
}): string | null => orderPaymentView(input).hold?.expires_at ?? null

/** The states in which the order waits for the customer's money: no parcel may leave. */
export const AWAITING_PAYMENT_STATES: readonly OrderPaymentState[] = [
  "awaiting_payment",
  "link_sent",
  "reminded",
  "expired",
]

/**
 * "KISZÁLLÍTÁS" WAITS FOR THE MONEY (brief, point 4: the parcel leaves only
 * after payment; nautilus 26480, point 4: refused in the commerce too, not only
 * on the OS's button). After a released hold the capture finds no live card
 * payment and would pass as if the order were cash on delivery; this stops it
 * first.
 */
export const refuseWhileAwaitingPayment = (metadata: Record<string, unknown> | null | undefined): void => {
  const stored = storedOrderPaymentOf(metadata)
  if (!stored || !AWAITING_PAYMENT_STATES.includes(stored.state)) return
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    stored.state === "expired"
      ? "Fizetésre vár: a fizetési határidő lejárt, a rendelés nem szállítható ki."
      : "Fizetésre vár: a kártyás zárolást feloldottuk, ezért a csomag csak a vevő fizetése után indulhat. Előbb küldd ki a fizetési linket, és várd meg a fizetést."
  )
}
