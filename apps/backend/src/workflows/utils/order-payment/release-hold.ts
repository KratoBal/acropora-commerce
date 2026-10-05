import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../../modules/stripe-capture/share"
import { refuseWhileEditing } from "../order-edit-hold"
import { STRIPE_PROVIDER_ID } from "../stripe-config"
import {
  ORDER_PAYMENT_METADATA_KEY,
  type OrderPaymentFacts,
  type OrderPaymentState,
  type StoredOrderPayment,
  storedOrderPaymentOf,
} from "./state"

/**
 * "CSÚSZIK A SZÁLLÍTÁS" (brief, point 3): the card hold is released, so it
 * cannot run out on the customer, and the order waits for a payment link.
 *
 * A MIXED CART'S PAIR GOES TOGETHER (acrobot 26483, decision 3): the two
 * orders share ONE Stripe intent, so releasing it releases both. Whichever of
 * the two the OS calls, both are released and both carry the state; the
 * later link pays for both at once.
 *
 * THE STRIPE CANCEL IS CALLED DIRECTLY, AND A FAILURE STOPS EVERYTHING.
 * Medusa's own `cancelPaymentCollectionWorkflow` would be shorter, but its
 * step logs a failed cancel and carries on (core-flows 2.20.1,
 * payment-collection/steps/cancel-payment.js): the order would read "released"
 * while the card is still held. Here a failed cancel throws, and the release
 * is not marked done. The shipped payment holds the intent and goes first; the
 * pickup payment's cancel does not touch Stripe (`stripe-capture` service,
 * `cancelPayment` on a joined share). A retry after a half-done release
 * cancels only the payments still live, and an intent Stripe already canceled
 * (the 7 days ran out) is accepted by the provider.
 */
export type ReleaseSide = {
  order_id: string
  display_id: number | null
  /** The order's current total (the difference over the hold is counted from it). */
  total?: number
  metadata: Record<string, unknown> | null
  payments: (OrderPaymentFacts & {
    data: Record<string, unknown> | null
    collection_id: string
    collection_status: string | null
  })[]
}

export type ReleaseHoldOperations = {
  /** The order and its mixed-cart pair, the shipped (paying) order first. */
  loadPair(orderId: string): Promise<{ primary: ReleaseSide; pickup: ReleaseSide | null } | null>
  /** The payment module's cancel: the Stripe intent canceled, the payment marked canceled. */
  cancelPayment(paymentId: string): Promise<void>
  /** The collection marked canceled, as Medusa's order cancel does. */
  cancelCollection(collectionId: string): Promise<void>
  /** The order's metadata replaced by this (the caller keeps the other keys). */
  setMetadata(orderId: string, metadata: Record<string, unknown>): Promise<void>
}

export type ReleaseHoldResult = {
  state: OrderPaymentState
  /** False: an earlier call released it already, nothing was done now. */
  released: boolean
  /** The released hold, forint, both orders' parts together. */
  amount: number
  released_at: string
  /** The orders released: the shipped one first. */
  orders: { order_id: string; display_id: number | null }[]
}

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.CONFLICT, message)
}

export const releaseHold = async (
  orderId: string,
  ops: ReleaseHoldOperations,
  now: () => Date = () => new Date()
): Promise<ReleaseHoldResult> => {
  const pair = await ops.loadPair(orderId)
  if (!pair) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const sides = [pair.primary, ...(pair.pickup ? [pair.pickup] : [])]
  const orders = sides.map((side) => ({ order_id: side.order_id, display_id: side.display_id }))
  const storedOf = (side: ReleaseSide) => storedOrderPaymentOf(side.metadata)
  const releasedAmount = () => sides.reduce((sum, side) => sum + (storedOf(side)?.released_amount ?? 0), 0)

  const stored = storedOf(pair.primary)
  // released before: not an error (the button pressed twice), nothing more to do
  if (stored?.released_at) {
    return { state: stored.state, released: false, amount: releasedAmount(), released_at: stored.released_at, orders }
  }
  // a release that stopped half way (see below) is finished; any other state is not ours to undo
  const resuming = stored?.state === "awaiting_payment" && !!stored.releasing_at
  if (stored && !resuming) refuse("A rendelés fizetése már másik úton halad, a zárolás itt nem oldható fel.")

  const cards = sides.flatMap((side) =>
    side.payments.filter((payment) => !payment.canceled_at).map((payment) => ({ side, payment }))
  )
  if (cards.some(({ payment }) => payment.captured > 0)) {
    refuse(
      "A kártyáról már levontuk az összeget, ezért nincs feloldható zárolás. Ha pénzt kell visszaadni, az visszatérítés."
    )
  }
  if (cards.some(({ payment }) => payment.provider_id !== STRIPE_PROVIDER_ID) || (!resuming && !cards.length)) {
    refuse("Ezen a rendelésen nincs kártyás zárolás (utánvét, bolti fizetés, vagy törölt rendelés), nincs mit feloldani.")
  }
  // an order edit's confirm is moving a collection right now: retry
  refuseWhileEditing(cards.map(({ payment }) => ({ payment: { collection_status: payment.collection_status } })))

  /*
    THE STATE IS WRITTEN BEFORE STRIPE IS ASKED, so a release that stops half
    way leaves the SAFE side: the order already waits for payment, Kiszállítás
    is refused (`refuseWhileAwaitingPayment`), and pressing the button again
    finishes it. Written after, a stop between the two would leave an order
    with no live card payment and no state, which Kiszállítás takes for cash on
    delivery and lets go unpaid. If Stripe refuses the very first cancel,
    nothing was released, and the state is taken back.
  */
  const releasingAt = stored?.releasing_at ?? now().toISOString()
  const metadataOf = (side: ReleaseSide, state: StoredOrderPayment) => ({
    ...(side.metadata ?? {}),
    [ORDER_PAYMENT_METADATA_KEY]: state,
  })
  const partOf = (side: ReleaseSide) =>
    resuming
      ? storedOf(side)?.released_amount ?? 0
      : cards.filter((card) => card.side === side).reduce((sum, card) => sum + card.payment.amount, 0)
  const releasing = sides.map((side) => ({
    side,
    state: { state: "awaiting_payment", releasing_at: releasingAt, released_amount: partOf(side) } as StoredOrderPayment,
  }))
  if (!resuming) for (const { side, state } of releasing) await ops.setMetadata(side.order_id, metadataOf(side, state))

  // the payment holding the Stripe intent first; a joined share only books
  const ordered = [...cards].sort(
    (a, b) => Number(!!stripeShareFactsOf(a.payment.data)?.joined) - Number(!!stripeShareFactsOf(b.payment.data)?.joined)
  )
  for (const [index, { payment }] of ordered.entries()) {
    try {
      await ops.cancelPayment(payment.id)
    } catch (error) {
      if (index === 0 && !resuming) {
        for (const side of sides) await ops.setMetadata(side.order_id, side.metadata ?? {})
      }
      throw error
    }
  }

  // every collection left with no live payment, the ones a stopped release left behind too
  const collections = new Set(
    sides.flatMap((side) =>
      side.payments
        .filter((payment) => payment.provider_id === STRIPE_PROVIDER_ID && payment.collection_status !== "canceled")
        .map((payment) => payment.collection_id)
    )
  )
  for (const collectionId of collections) await ops.cancelCollection(collectionId)

  const releasedAt = now().toISOString()
  for (const { side, state } of releasing) {
    await ops.setMetadata(side.order_id, metadataOf(side, { ...state, released_at: releasedAt }))
  }

  return {
    state: "awaiting_payment",
    released: true,
    amount: releasing.reduce((sum, { state }) => sum + (state.released_amount ?? 0), 0),
    released_at: releasedAt,
    orders,
  }
}
