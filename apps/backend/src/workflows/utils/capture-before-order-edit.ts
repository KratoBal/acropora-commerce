import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import {
  type CapturePaymentSide,
  type SharedCaptureOperations,
  captureSharedStripePayment,
} from "./shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "./stripe-config"

/**
 * A CARD HOLD IS CAPTURED BEFORE AN ORDER EDIT IS CONFIRMED (acrobot 25584,
 * measured on stage 2026-10-01, orders #15 and #16).
 *
 * Medusa 2.20.1 confirms an order edit with
 * `createOrUpdateOrderPaymentCollectionWorkflow`: if the order's payment
 * collection is AUTHORIZED and the edited order still has something to pay,
 * it CANCELS the collection (the Stripe intent is canceled, the whole hold
 * released) and opens a new one for the difference. Before any capture the
 * paid total is 0, so every edit of an uncaptured card order lost its hold
 * (#15). Captured first, the difference is 0 and Medusa leaves the payment
 * alone (#16).
 *
 * So the capture moves to the edit: the new total is captured, then the
 * confirm runs. Balázs's decision holds ("levonás kisebb összeggel, már az
 * első körben"): the smaller amount, once. On a mixed cart the one capture is
 * for both orders, the edited one at its new total. At "Kiszállítás" the shared
 * capture then finds both parts booked (`already_captured`).
 *
 * What is refused (the edit would otherwise lose the hold, or ask the card
 * for money it never held): more than the hold, more than was already
 * captured, or nothing left at all (that is a cancel, not an edit).
 */
export type EditCaptureOperations = SharedCaptureOperations & {
  /** The order's total with its REQUESTED edit applied; null if none is requested. */
  requestedEditTotal(orderId: string): Promise<number | null>
  /** A split's pickup order: its shipped (parent) order. */
  parentOrderId(orderId: string): Promise<string | null>
  /** Brings a payment collection's amount to what the order now owes. */
  setCollectionAmount(collectionId: string, amount: number): Promise<void>
}

export type EditCaptureResult =
  | { action: "pass"; reason: "no_requested_edit" | "no_card_hold" | "already_captured" }
  | { action: "captured"; amount: number }
  | { action: "refuse"; message: string }

const refuse = (message: string): EditCaptureResult => ({ action: "refuse", message })

export const captureBeforeOrderEdit = async (
  orderId: string,
  ops: EditCaptureOperations,
  /** The online card providers (`ACROPORA_PP_ONLINE_CARD`): real money held on a card. */
  onlineCardProviders: readonly string[] = []
): Promise<EditCaptureResult> => {
  const newTotal = await ops.requestedEditTotal(orderId)

  if (newTotal === null) {
    return { action: "pass", reason: "no_requested_edit" }
  }

  const own = (await ops.loadPair(orderId))?.shipped
  const payment = own?.payment

  if (!payment) {
    return { action: "pass", reason: "no_card_hold" }
  }

  /*
    ANOTHER CARD PROVIDER WITH AN UNCAPTURED HOLD (c64d463f, acrobot 25718).
    SimplePay is one step today: its payment is captured when the order is
    placed, so Medusa's confirm leaves it alone. A two-step setup would leave
    it AUTHORIZED, and the confirm would cancel the hold silently, as it did to
    Stripe (#15). Only Stripe's capture is ours to make here; for another card
    provider the edit stops and says so. Cash on delivery and pay-at-store are
    not card holds, and are left to Medusa.
  */
  if (payment.provider_id !== STRIPE_PROVIDER_ID) {
    if (
      payment.provider_id &&
      onlineCardProviders.includes(payment.provider_id) &&
      payment.captured === 0
    ) {
      return refuse(
        "A kártyás fizetés még nincs levonva, és a szerkesztés megerősítése elvinné a zárolást. Előbb vond le a fizetést, utána szerkeszd a rendelést."
      )
    }
    return { action: "pass", reason: "no_card_hold" }
  }

  if (payment.captured > 0) {
    // Medusa would cancel a captured payment's collection to ask for more.
    if (newTotal > payment.captured) {
      return refuse(
        "A kártyás fizetés már le van vonva, többet nem lehet ráterhelni. A többletet külön fizetéssel kell rendezni."
      )
    }
    return { action: "pass", reason: "already_captured" }
  }

  if (!(newTotal > 0)) {
    return refuse("A szerkesztés után a rendelésben nem marad fizetendő összeg: a rendelést törölni kell, nem szerkeszteni.")
  }

  if (newTotal > payment.amount) {
    return refuse(
      `A szerkesztés után a rendelés többe kerül (${newTotal} Ft), mint amennyit a kártyán zároltunk (${payment.amount} Ft). A többletet külön fizetéssel kell rendezni.`
    )
  }

  const share = stripeShareFactsOf(payment.data)
  const root = share?.joined ? await ops.parentOrderId(orderId) : orderId

  if (share && !root) {
    return refuse("A vegyes kosár bolti rendeléséhez nem található a szállított rendelés.")
  }

  // The collection asks for the new total BEFORE the capture: the payment module
  // recomputes the collection's status on capture, and so finds it COMPLETED
  // (set after, the amount was right but the status stayed AUTHORIZED; stage
  // order #17). If the capture fails, the collection asks for the hold again.
  const collectionId = payment.collection_id
  if (collectionId) {
    await ops.setCollectionAmount(collectionId, newTotal)
  }

  let captured: boolean
  try {
    if (share) {
      // The one capture for both orders; the shipped order is the root of the pair.
      const result = await captureSharedStripePayment(root!, {
        ...ops,
        loadPair: async (id) => {
          const pair = await ops.loadPair(id)
          const edited = (side: CapturePaymentSide | null) =>
            side && side.order_id === orderId ? { ...side, total: newTotal } : side
          return pair && { shipped: edited(pair.shipped)!, pickup: edited(pair.pickup) }
        },
      })
      captured = result.captured
    } else {
      await ops.capture(payment.id, newTotal)
      captured = true
    }
  } catch (error) {
    if (collectionId) {
      await ops.setCollectionAmount(collectionId, payment.amount)
    }
    throw error
  }

  if (!captured) {
    if (collectionId) {
      await ops.setCollectionAmount(collectionId, payment.amount)
    }
    return refuse("A vegyes kosár közös kártyás fizetését nem sikerült levonni.")
  }

  return { action: "captured", amount: newTotal }
}
