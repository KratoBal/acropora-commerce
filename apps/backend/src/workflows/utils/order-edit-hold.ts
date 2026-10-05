import { MedusaError } from "@medusajs/framework/utils"

import { stripeShareFactsOf } from "../../modules/stripe-capture/share"
import type { SharedCaptureOperations } from "./shared-stripe-capture"
import { STRIPE_PROVIDER_ID } from "./stripe-config"

/**
 * AN ORDER EDIT KEEPS THE CARD HOLD, AND THE CAPTURE WAITS FOR "KISZÁLLÍTÁS"
 * (acrobot 26310, decision 1: before Kiszállítás a line operation only
 * prepares; the money is taken at Kiszállítás, for the reduced total).
 *
 * WHY MEDUSA WOULD RELEASE THE HOLD (measured in @medusajs/core-flows 2.20.1,
 * create-or-update-order-payment-collection.js): the edit's confirm runs
 * `createOrUpdateOrderPaymentCollectionWorkflow`. If the order's collection is
 * AUTHORIZED or PARTIALLY_AUTHORIZED and the order still owes something, it
 * CANCELS the collection (the Stripe intent canceled, the whole hold released)
 * and opens a new one; before any capture the order always owes something.
 * For a collection in NOT_PAID or AWAITING the same workflow only sets the
 * collection's amount to what the order owes.
 *
 * SO THE CONFIRM RUNS WITH THE COLLECTION IN AWAITING (acrobot 26449, option
 * B): it is moved AUTHORIZED -> AWAITING just before Medusa's own confirm, and
 * AWAITING -> AUTHORIZED right after, each move only from the expected state.
 * Medusa's confirm, its reservations and its events stay Medusa's; no core code
 * is copied. The Stripe intent is not touched: its hold stays, and at
 * Kiszállítás the capture takes the order's current total, never more than
 * the hold (`plain-stripe-capture.ts`, `shared-stripe-capture.ts`).
 *
 * THE WINDOW: while the collection is AWAITING, a capture refuses with a
 * retryable error (`refuseWhileEditing`) instead of taking money; a
 * capture that lands in that second is a retry, never a wrong amount.
 *
 * THE CONDITION IS MEDUSA'S, so a test reads the installed workflow and turns
 * red if an upgrade changes it (order-edit-hold.medusa.unit.spec.ts).
 *
 * What is refused, as before: more than was already captured, nothing left to
 * pay (that is a cancel, not an edit), and another card provider's uncaptured
 * hold (only Stripe's is ours to keep). More than the hold is refused only on
 * a mixed cart's shared hold; a plain order's difference goes through a
 * payment link (plan section 5).
 */
export type EditHoldOperations = Pick<SharedCaptureOperations, "loadPair"> & {
  /** The order's total with its REQUESTED edit applied; null if none is requested. */
  requestedEditTotal(orderId: string): Promise<number | null>
  /** AUTHORIZED -> AWAITING, only if it is AUTHORIZED now; false if it was not. */
  holdCollection(collectionId: string): Promise<boolean>
  /** AWAITING -> AUTHORIZED, only if it is still AWAITING; false if it was not. */
  releaseCollection(collectionId: string): Promise<boolean>
  /**
   * The order's open collections other than the hold's (a difference link's,
   * plan section 5) closed: after an edit their amount is not what the order
   * owes, and a new link is sent for the new difference.
   */
  closeOtherOpenCollections(orderId: string, holdCollectionId: string): Promise<void>
}

export type EditHoldDecision =
  | { action: "pass"; reason: "no_requested_edit" | "no_card_hold" | "already_captured" }
  | { action: "keep_hold"; collectionId: string; newTotal: number }
  | { action: "refuse"; message: string }

const refuse = (message: string): EditHoldDecision => ({ action: "refuse", message })

export const orderEditHoldDecision = async (
  orderId: string,
  ops: EditHoldOperations,
  /** The online card providers (`ACROPORA_PP_ONLINE_CARD`): real money held on a card. */
  onlineCardProviders: readonly string[] = []
): Promise<EditHoldDecision> => {
  const newTotal = await ops.requestedEditTotal(orderId)

  if (newTotal === null) {
    return { action: "pass", reason: "no_requested_edit" }
  }

  const payment = (await ops.loadPair(orderId))?.shipped?.payment

  if (!payment) {
    return { action: "pass", reason: "no_card_hold" }
  }

  if (payment.provider_id !== STRIPE_PROVIDER_ID) {
    // another card provider's uncaptured hold would be cancelled by the confirm
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

  /*
    OVER THE HOLD (Balázs, 2026-10-05 18:01 UTC; plan section 5): an item
    added after the order. The edit goes through and the hold stays; the
    difference is paid through a payment link, and Kiszállítás waits for it
    (`plainStripeCapture`). A mixed cart's shared hold is not split this way
    yet: there the edit is still refused.
  */
  if (newTotal > payment.amount && stripeShareFactsOf(payment.data)) {
    return refuse(
      `A szerkesztés után a rendelés többe kerül (${newTotal} Ft), mint amennyit a kártyán zároltunk (${payment.amount} Ft). Vegyes kosárnál a különbözetre még nem küldhető fizetési link: a többletet külön fizetéssel kell rendezni.`
    )
  }

  if (!payment.collection_id) {
    return refuse("A kártyás fizetés gyűjtője nem található, ezért a zárolás nem tartható meg. A szerkesztés nincs megerősítve.")
  }

  return { action: "keep_hold", collectionId: payment.collection_id, newTotal }
}

/**
 * Medusa's confirm with the collection in AWAITING, and back to AUTHORIZED
 * whatever happens. If the collection is not AUTHORIZED when the edit starts
 * (a capture or another edit got there first), nothing runs.
 */
export const confirmKeepingHold = async <T>(
  collectionId: string,
  ops: Pick<EditHoldOperations, "holdCollection" | "releaseCollection">,
  confirm: () => Promise<T>
): Promise<T> => {
  if (!(await ops.holdCollection(collectionId))) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "A kártyás fizetés állapota közben megváltozott. Töltsd újra a rendelést, és nézd meg, mielőtt újra megerősíted."
    )
  }
  try {
    return await confirm()
  } finally {
    await ops.releaseCollection(collectionId)
  }
}

/** Collection statuses as Medusa stores them (`PaymentCollectionStatus`). */
export const COLLECTION_AWAITING = "awaiting"

/**
 * A capture that meets a collection in the middle of an edit's confirm stops
 * with a retryable error, before any money moves.
 */
export const refuseWhileEditing = (
  sides: ({ payment: { collection_status?: string | null } | null } | null | undefined)[]
): void => {
  if (sides.some((side) => side?.payment?.collection_status === COLLECTION_AWAITING)) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "A rendelés szerkesztése épp most fut. Próbáld újra néhány másodperc múlva: a kártyáról semmi nem lett levonva."
    )
  }
}
