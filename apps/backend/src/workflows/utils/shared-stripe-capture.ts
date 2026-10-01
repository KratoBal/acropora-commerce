import { MedusaError } from "@medusajs/framework/utils"

import {
  STRIPE_CAPTURE_PARTS_KEY,
  type StripeCaptureParts,
  stripeShareFactsOf,
} from "../../modules/stripe-capture/share"
import { smallestUnit } from "../../modules/stripe-capture/smallest-unit"

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
 * payment books its part. Safe to run again: a part already booked is skipped,
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
  } | null
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
  | { captured: false; reason: "not_shared" }
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
  if (!pickup?.payment) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `The shared card payment of order ${orderId} has no pickup order payment`
    )
  }

  // Each order's current amount, never more than its part of the hold.
  const shippedAmount = Math.min(shipped.total, shipped.payment.amount)
  const pickupAmount = Math.min(pickup.total, pickup.payment.amount)

  if (!(shippedAmount > 0)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Order ${orderId} has nothing to capture`
    )
  }

  const booked = (side: CapturePaymentSide, amount: number) =>
    side.payment!.captured === amount
  const partial = (side: CapturePaymentSide, amount: number) =>
    side.payment!.captured > 0 && side.payment!.captured !== amount

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
        ...(pickupAmount > 0
          ? { [pickup.payment.id]: smallestUnit(pickupAmount, pickup.currency_code) }
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

  if (pickupAmount > 0 && !booked(pickup, pickupAmount)) {
    await ops.capture(pickup.payment.id, pickupAmount)
  }

  return { captured: true, shipped: shippedAmount, pickup: pickupAmount }
}

/** The status whose transition captures the shared payment: the shop's "Kiszállítás". */
export const CAPTURE_ON_STATUS = "out_for_delivery"

/** The transition's part: only `out_for_delivery` captures, every other status passes. */
export const captureOnTransition = async (
  input: { order_id: string; to: string },
  ops: SharedCaptureOperations
): Promise<SharedCaptureResult | null> =>
  input.to === CAPTURE_ON_STATUS ? captureSharedStripePayment(input.order_id, ops) : null
