import { MedusaError } from "@medusajs/framework/utils"

import {
  STRIPE_CAPTURE_PARTS_KEY,
  type StripeCaptureParts,
  stripeShareFactsOf,
} from "../../modules/stripe-capture/share"
import { smallestUnit } from "../../modules/stripe-capture/smallest-unit"
import { refuseWhileEditing } from "./order-edit-hold"
import {
  capturePlainStripePayment,
  type PlainCaptureResult,
} from "./plain-stripe-capture"

/**
 * THE SHARED STRIPE PAYMENT IS CAPTURED AT "KISZÁLLÍTÁS" (Balázs, 2026-10-01
 * 06:00 UTC, variant 1; the trigger is the shop's own `out_for_delivery`
 * status, acrobot 25523 -- Medusa's shipment does NOT capture).
 *
 * One Stripe capture for both orders, each for its CURRENT amount (an item
 * dropped from either before now makes the capture smaller); each Medusa
 * payment books its own part, and the parts add up to what Stripe took. A
 * pickup item dropped AFTER this is a refund on the pickup order.
 *
 * Steps: the parts go on the shipped payment's data; its capture makes the
 * single Stripe capture (the provider, `captureShared`); then the pickup
 * payment books its part. An order edit captures EARLIER, before Medusa's
 * confirm would cancel the hold (capture-before-order-edit.ts); this one then
 * finds both parts booked and leaves them. Safe to run again: a part already booked is skipped,
 * and the provider accepts the pickup's booking only against the recorded part.
 */
export type CapturePaymentSide = {
  order_id: string
  /** The order's current total. */
  total: number
  currency_code: string
  payment: {
    id: string
    /** The authorized amount of this payment (its part of the hold). */
    amount: number
    /** What Medusa has booked as captured on it so far. */
    captured: number
    data: Record<string, unknown> | null
    /** The payment provider; the order edit's capture acts only on Stripe. */
    provider_id?: string
    /** The payment's collection; an order edit's confirm sets its amount. */
    collection_id?: string
    /** The collection's status; AWAITING only while an order edit is being confirmed. */
    collection_status?: string | null
  } | null
  /** The order's payments are all canceled (the order was canceled before the capture). */
  payment_canceled?: boolean
}

export type SharedCaptureOperations = {
  /** The order and, if it is a split's shipped order, its pickup order. */
  loadPair(orderId: string): Promise<{
    shipped: CapturePaymentSide
    pickup: CapturePaymentSide | null
  } | null>
  setPaymentData(paymentId: string, data: Record<string, unknown>): Promise<void>
  capture(paymentId: string, amount: number): Promise<void>
}

export type SharedCaptureResult =
  | { captured: false; reason: "not_shared" | "already_captured" }
  | { captured: true; shipped: number; pickup: number }

export const captureSharedStripePayment = async (
  orderId: string,
  ops: SharedCaptureOperations
): Promise<SharedCaptureResult> => {
  const pair = await ops.loadPair(orderId)
  const shipped = pair?.shipped
  const share = stripeShareFactsOf(shipped?.payment?.data)

  // Not a shared Stripe payment (another provider, a single cart, the pickup
  // order itself): nothing to do here.
  if (!pair || !shipped?.payment || !share || share.joined) {
    return { captured: false, reason: "not_shared" }
  }

  const pickup = pair.pickup
  /*
    A PICKUP ORDER CANCELED BEFORE THE CAPTURE (acrobot 25694, stage #28/#29: the
    animal's order canceled, then Kiszállítás refused with "no pickup order
    payment", the hold stuck). Its payment is canceled, so its part is 0: only
    the shipped part is captured, and Stripe releases the rest.
  */
  const pickupPayment = pickup?.payment ?? null
  if (!pickup || (!pickupPayment && !pickup.payment_canceled)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The shared card payment of order ${orderId} has no pickup order payment`
    )
  }
  // an order edit's confirm is moving one of the two collections: retry, take nothing
  refuseWhileEditing([shipped, pickup])

  // Each order's current amount, never more than its part of the hold.
  const shippedAmount = Math.min(shipped.total, shipped.payment.amount)
  const pickupAmount = pickupPayment ? Math.min(pickup.total, pickupPayment.amount) : 0

  if (!(shippedAmount > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order ${orderId} has nothing to capture`
    )
  }

  const booked = (side: CapturePaymentSide, amount: number) =>
    !side.payment || side.payment.captured === amount
  const partial = (side: CapturePaymentSide, amount: number) =>
    !!side.payment && side.payment.captured > 0 && side.payment.captured !== amount

  // Captured earlier, when an order edit was confirmed (capture-before-order-edit):
  // the hold is gone, so an item dropped since then is a refund, not a capture.
  if (
    shipped.payment.captured > 0 &&
    (pickupPayment?.captured ?? 0) > 0 &&
    (partial(shipped, shippedAmount) || partial(pickup, pickupAmount))
  ) {
    return { captured: false, reason: "already_captured" }
  }

  if (partial(shipped, shippedAmount) || partial(pickup, pickupAmount)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `The shared card payment of order ${orderId} is partly booked for other amounts; it needs a look`
    )
  }

  if (!booked(shipped, shippedAmount)) {
    const parts: StripeCaptureParts = {
      total: 0,
      parts: {
        [shipped.payment.id]: smallestUnit(shippedAmount, shipped.currency_code),
        ...(pickupPayment && pickupAmount > 0
          ? { [pickupPayment.id]: smallestUnit(pickupAmount, pickup.currency_code) }
          : {}),
      },
    }
    parts.total = Object.values(parts.parts).reduce((sum, part) => sum + part, 0)

    await ops.setPaymentData(shipped.payment.id, {
      ...(shipped.payment.data ?? {}),
      [STRIPE_CAPTURE_PARTS_KEY]: parts,
    })
    await ops.capture(shipped.payment.id, shippedAmount)
  }

  if (pickupPayment && pickupAmount > 0 && !booked(pickup, pickupAmount)) {
    await ops.capture(pickupPayment.id, pickupAmount)
  }

  return { captured: true, shipped: shippedAmount, pickup: pickupAmount }
}

/** The status whose transition captures the shared payment: the shop's "Kiszállítás". */
export const CAPTURE_ON_STATUS = "out_for_delivery"

/**
 * The transition's part: only `out_for_delivery` captures, every other status
 * passes.
 *
 * THE TRANSITION RULES ARE ASKED FIRST (`assertAllowed`). The capture runs
 * before the status step, and a capture is not undone when a later step fails:
 * without this, a refused Kiszállítás (an order still in Feldolgozásra vár)
 * took the money and then kept the old status.
 */
export const captureOnTransition = async (
  input: { order_id: string; to: string },
  ops: SharedCaptureOperations,
  assertAllowed: () => Promise<void>
): Promise<SharedCaptureResult | PlainCaptureResult | null> => {
  if (input.to !== CAPTURE_ON_STATUS) return null
  await assertAllowed()
  const shared = await captureSharedStripePayment(input.order_id, ops)
  // not a mixed cart's shared payment: the order's own card payment (C2)
  if (!shared.captured && shared.reason === "not_shared") {
    return capturePlainStripePayment(input.order_id, ops)
  }
  return shared
}
