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
  /**
   * Which payment the state is about: the released hold (L1, the default), or
   * the difference over a hold that stays (plan section 5).
   */
  kind?: "release" | "difference"
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
  /** What the payment link would charge now; null when nothing is owed. */
  due: { amount: number; reason: "released" | "difference" } | null
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

const isStripe = (payment: OrderPaymentFacts) => payment.provider_id === STRIPE_PROVIDER_ID
const isLive = (payment: OrderPaymentFacts) => !payment.canceled_at
const time = (value: Date | string | null | undefined) => (value ? new Date(value).getTime() : 0)

/**
 * THE LIVE CARD HOLD: a Stripe payment neither canceled nor captured. An order
 * can carry two live payments (the hold and a paid difference, plan section
 * 5); the hold is the uncaptured one, and of two uncaptured ones the earlier
 * (the order's own, not a link's being paid this second).
 */
export const holdPaymentOf = (payments: readonly OrderPaymentFacts[]): OrderPaymentFacts | null =>
  payments
    .filter((payment) => isLive(payment) && isStripe(payment) && payment.captured === 0)
    .sort((a, b) => time(a.created_at) - time(b.created_at))[0] ?? null

export const holdOf = (payments: readonly OrderPaymentFacts[]): OrderPaymentHold | null => {
  const live = holdPaymentOf(payments)
  if (!live?.created_at) return null
  const authorized = new Date(live.created_at)
  return {
    authorized_at: authorized.toISOString(),
    expires_at: new Date(authorized.getTime() + HOLD_DAYS * DAY_MS).toISOString(),
    amount: live.amount,
  }
}

/**
 * WHAT THE HOLD DOES NOT COVER (plan section 5): an item added after the order
 * made it cost more than the card holds. The difference is the order's total
 * less the hold and less what was already paid on other card payments (an
 * earlier difference link).
 */
export const differenceOf = (input: { payments: readonly OrderPaymentFacts[]; total?: number | null }): number => {
  const hold = holdPaymentOf(input.payments)
  if (!hold || typeof input.total !== "number") return 0
  const paidElsewhere = input.payments
    .filter((payment) => payment !== hold && isLive(payment) && isStripe(payment))
    .reduce((sum, payment) => sum + payment.captured, 0)
  return Math.max(0, input.total - hold.amount - paidElsewhere)
}

const linkView = (link: StoredOrderPayment["link"]): OrderPaymentView["link"] =>
  link
    ? {
        sent_at: link.sent_at,
        expires_at: link.expires_at,
        reminded_at: link.reminded_at ?? null,
        amount: link.amount,
        url: link.url,
      }
    : null

/** What `GET /admin/order-payment/:order_id` answers, and the OS shows. */
export const orderPaymentView = (input: {
  metadata: Record<string, unknown> | null | undefined
  payments: readonly OrderPaymentFacts[]
  /** The order's current total; without it no difference is counted. */
  total?: number | null
}): OrderPaymentView => {
  const stored = storedOrderPaymentOf(input.metadata)

  // THE RELEASED HOLD (L1, L2): the stored state is the state, there is no hold
  if (stored && stored.kind !== "difference") {
    const owes = stored.state === "awaiting_payment" || stored.state === "link_sent" || stored.state === "reminded"
    const amount = stored.link?.amount ?? input.total ?? null
    return {
      state: stored.state,
      hold: null,
      link: linkView(stored.link),
      paid_at: stored.paid_at ?? null,
      due: owes && typeof amount === "number" ? { amount, reason: "released" } : null,
    }
  }

  const hold = holdOf(input.payments)
  if (hold) {
    const difference = differenceOf(input)
    /*
      The hold stays; the difference's link (if one went) says where the
      payment is, while it is for TODAY's difference. An edit since moved the
      difference: that link no longer pays (its collection is closed with the
      edit), and the order waits for a new one.
    */
    const waiting =
      stored?.kind === "difference" && stored.state !== "paid" && stored.link?.amount === difference ? stored : null
    if (difference > 0 || waiting) {
      return {
        state: waiting?.state ?? "awaiting_payment",
        hold,
        link: linkView(waiting?.link),
        paid_at: null,
        due: { amount: waiting?.link?.amount ?? difference, reason: "difference" },
      }
    }
    return { state: "hold", hold, link: null, paid_at: null, due: null }
  }

  const captured = input.payments
    .filter((payment) => isLive(payment) && isStripe(payment) && payment.captured > 0)
    .sort((a, b) => time(b.captured_at) - time(a.captured_at))
  if (captured.length) {
    return {
      state: "paid",
      hold: null,
      link: null,
      paid_at: captured[0].captured_at ? iso(captured[0].captured_at) : null,
      due: null,
    }
  }
  return { state: "none", hold: null, link: null, paid_at: null, due: null }
}

/** The order list's field: when the live hold runs out, ISO; null without one. */
export const holdExpiresAt = (input: {
  metadata: Record<string, unknown> | null | undefined
  payments: readonly OrderPaymentFacts[]
}): string | null => orderPaymentView(input).hold?.expires_at ?? null

/** Kiszállítás refused while an added item's difference is not paid (plan section 5). */
export const DIFFERENCE_UNPAID =
  "Fizetésre vár: a rendelés többe kerül, mint a kártyán zárolt összeg, és a különbözet még nincs kifizetve. Küldd ki a fizetési linket a különbözetre, és várd meg a fizetést."

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
      : stored.kind === "difference"
        ? DIFFERENCE_UNPAID
        : "Fizetésre vár: a kártyás zárolást feloldottuk, ezért a csomag csak a vevő fizetése után indulhat. Előbb küldd ki a fizetési linket, és várd meg a fizetést."
  )
}
