import { MedusaError } from "@medusajs/framework/utils"

import { BANK_TRANSFER_PROVIDER_ID } from "../../../modules/acropora-transfer"
import { findCashOnDeliveryFeeLineItems } from "../cod-fee-line-item"
import type { PaymentRole } from "../payment-eligibility"
import { orderPaymentRoleOf } from "../payment-providers"
import { PARENT_ORDER_METADATA_KEY, PICKUP_ORDER_METADATA_KEY } from "../split-completion"
import { ORDER_PAYMENT_METADATA_KEY } from "./state"

/**
 * "ÁTÁLLÍTÁS ELŐRE UTALÁSRA" (card d31a66a3; Balázs, 2026-11-25 10:19 UTC): the customer ordered with any method; for a high-value
 * product we call them, and if they agree to a deposit, WE switch the placed order to bank transfer in the OS and issue the
 * proforma. This is the shop's side of that switch.
 *
 * WHAT IT DOES, IN THIS ORDER:
 *   1. marks the switch as started on the order (`acropora_payment_switch`, state "switching"), so a retry after a half-done run
 *      carries on instead of reading the order's half-changed payment;
 *   2. cash on delivery: removes the cash-on-delivery fee line by an order edit (the proforma must not carry it);
 *   3. cancels every live, uncaptured payment (a card hold: the Stripe intent is canceled, as "Csúszik a szállítás" does; paying in
 *      the store: the system provider's authorization) and every open payment collection (a sent card link stops working);
 *   4. opens a collection for the order's total and a bank-transfer session on it, authorized the way checkout leaves it:
 *      `pending_authorization`, no payment. That is exactly what `recordTransferReceipt` looks for, so the OS's proforma and its
 *      "Utalás beérkezett" work on the switched order as on one placed by transfer;
 *   5. marks it done, with where it came from, when, and who (the OS user's name).
 *
 * THE SHOP'S CHECKOUT MATRIX IS NOT ASKED (acrobot 61176): it filters what a customer may choose at checkout, and the bank
 * transfer is hidden there; this is the shop's own admin decision on a placed order.
 *
 * WHAT IS REFUSED (409, in Hungarian, as the OS shows it): an order paid already (any captured amount); one shipped or closed; a
 * mixed cart's pair (the two orders share one card payment; first round); an order whose payment method is not known.
 * Switching an order that is already on bank transfer is not an error: it reports `switched: false`.
 *
 * ONE RUN AT A TIME PER ORDER (barracuda on #905): a double press, the OS's retry, or a hand retry under the first would both read
 * the unmarked order, both cancel the payments, and both open a transfer collection (two proforma-ready collections, the receipt
 * settles one). So the whole run is under the order's lock, and reads the order inside it.
 *
 * ONLY OUR OWN KEYS ARE WRITTEN (barracuda on #905): the order module MERGES metadata (`mergeMetadata`), so writing the whole object
 * back would put every key's load-time value back, over whatever the deadlines job (or anything else) wrote meanwhile.
 */
export const ORDER_PAYMENT_SWITCH_METADATA_KEY = "acropora_payment_switch"

export { ORDER_PAYMENT_LOCK_KEY } from "./lock"

export type SwitchOrder = {
  id: string
  total: number
  metadata: Record<string, unknown> | null
  business_status: string | null
  items: { id: string; quantity: number; metadata?: Record<string, unknown> | null }[]
  payment_collections: {
    id: string
    status: string | null
    payment_sessions: { id: string; provider_id: string; status: string | null }[]
    payments: { id: string; provider_id: string | null; canceled_at: unknown; captured: number }[]
  }[]
}

export type SwitchToTransferOperations = {
  load(orderId: string): Promise<SwitchOrder | null>
  roles(): Map<string, PaymentRole>
  /** Removes these line items by an order edit (quantity 0), as the given actor. */
  removeLines(orderId: string, itemIds: string[], actor: string): Promise<void>
  cancelPayment(paymentId: string): Promise<void>
  cancelCollection(collectionId: string): Promise<void>
  openCollection(orderId: string, amount: number): Promise<{ id: string; amount: number }>
  /** A bank-transfer session on the collection, authorized as checkout leaves it; the session's status afterwards. */
  startTransferSession(collectionId: string): Promise<{ id: string; status: string | null }>
  /** Writes THESE keys; the order module merges them, every other key stays as it is. */
  setMetadata(orderId: string, keys: Record<string, unknown>): Promise<void>
  /** The job under the order's payment lock (`ORDER_PAYMENT_LOCK_KEY`); a run that cannot get it answers a 409. */
  withLock<T>(orderId: string, job: () => Promise<T>): Promise<T>
}

export type SwitchToTransferResult = {
  switched: boolean
  from: PaymentRole | null
  amount: number
  collection_id: string | null
  removed_cod_fee: boolean
}

type SwitchMark = {
  state: "switching" | "done"
  from: PaymentRole | null
  started_at: string
  by: string
  done_at?: string
  removed_cod_fee?: boolean
}

const ENDED_BUSINESS_STATUSES = new Set(["out_for_delivery", "closed", "closed_unsuccessfully"])

const refuse = (message: string): never => {
  throw new MedusaError(MedusaError.Types.CONFLICT, message)
}

const markOf = (metadata: Record<string, unknown> | null): SwitchMark | null => {
  const mark = metadata?.[ORDER_PAYMENT_SWITCH_METADATA_KEY] as Partial<SwitchMark> | undefined
  return mark && (mark.state === "switching" || mark.state === "done") ? (mark as SwitchMark) : null
}

const openCollections = (order: SwitchOrder) =>
  order.payment_collections.filter((c) => c.status !== "canceled" && c.status !== "completed")

const waitingTransferSession = (order: SwitchOrder) =>
  openCollections(order)
    .flatMap((c) => c.payment_sessions)
    .find((s) => s.provider_id === BANK_TRANSFER_PROVIDER_ID && s.status === "pending_authorization")

export const switchToBankTransfer = (
  orderId: string,
  input: { actor: string },
  ops: SwitchToTransferOperations,
  now: () => Date = () => new Date()
): Promise<SwitchToTransferResult> => ops.withLock(orderId, () => switchLocked(orderId, input, ops, now))

const switchLocked = async (
  orderId: string,
  input: { actor: string },
  ops: SwitchToTransferOperations,
  now: () => Date
): Promise<SwitchToTransferResult> => {
  const order = await ops.load(orderId)
  if (!order) throw new MedusaError(MedusaError.Types.NOT_FOUND, `Order ${orderId} was not found`)
  const mark = markOf(order.metadata)

  // already on bank transfer, waiting for the money: nothing to do (a second press, or an order placed by transfer)
  const waiting = waitingTransferSession(order)
  if (waiting && mark?.state !== "switching")
    return { switched: false, from: mark?.from ?? "BANK_TRANSFER", amount: order.total, collection_id: null, removed_cod_fee: false }

  if (order.metadata?.[PARENT_ORDER_METADATA_KEY] || order.metadata?.[PICKUP_ORDER_METADATA_KEY])
    refuse("Vegyes kosár rendelése (élő állat és kiszállítandó tétel két rendelésben): az előre utalásra állítás most nem érhető el.")
  if (order.business_status && ENDED_BUSINESS_STATUSES.has(order.business_status))
    refuse("A rendelés már úton van vagy lezárult: az előre utalásra állítás már nem érhető el.")
  const live = order.payment_collections.flatMap((c) => c.payments).filter((p) => !p.canceled_at)
  if (live.some((p) => p.captured > 0)) refuse("A rendelést már (részben) kifizették: előre utalásra nem állítható.")

  const from = mark?.state === "switching" ? mark.from : orderPaymentRoleOf(order, ops.roles())
  if (mark?.state !== "switching") {
    if (from === "BANK_TRANSFER") refuse("A rendelés előre utalásos, de nem vár befizetésre: nézd meg a fizetését.")
    if (!from) refuse("A rendelés fizetési módja nem ismert: előre utalásra így nem állítható.")
  }

  const started: SwitchMark = mark?.state === "switching" ? mark : { state: "switching", from, started_at: now().toISOString(), by: input.actor }
  await ops.setMetadata(orderId, { [ORDER_PAYMENT_SWITCH_METADATA_KEY]: started })

  // the cash-on-delivery fee leaves with cash on delivery
  const fees = findCashOnDeliveryFeeLineItems(order.items).filter((item) => item.quantity > 0)
  if (fees.length) {
    await ops.removeLines(orderId, fees.map((item) => item.id), input.actor)
    started.removed_cod_fee = true
    await ops.setMetadata(orderId, { [ORDER_PAYMENT_SWITCH_METADATA_KEY]: started })
  }

  // every live payment (card hold, the store's authorization) and every open collection go
  for (const payment of live) await ops.cancelPayment(payment.id)
  const after = (await ops.load(orderId)) ?? order
  for (const collection of openCollections(after)) {
    if (waitingTransferSession({ ...after, payment_collections: [collection] })) continue // a retry's own new collection
    await ops.cancelCollection(collection.id)
  }

  let collectionId: string | null = null
  const again = waitingTransferSession(after)
  if (!again) {
    const collection = await ops.openCollection(orderId, after.total)
    const session = await ops.startTransferSession(collection.id)
    if (session.status !== "pending_authorization")
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `A bank transfer session on order ${orderId} reads "${session.status}", not pending_authorization.`
      )
    collectionId = collection.id
  }

  const done: SwitchMark = {
    ...started,
    state: "done",
    done_at: now().toISOString(),
    removed_cod_fee: started.removed_cod_fee === true,
  }
  const keys: Record<string, unknown> = { [ORDER_PAYMENT_SWITCH_METADATA_KEY]: done }
  // a card order's payment state (hold, link) no longer applies: the guest page and the deadlines job must not read it
  if (after.metadata && ORDER_PAYMENT_METADATA_KEY in after.metadata) keys[ORDER_PAYMENT_METADATA_KEY] = null
  await ops.setMetadata(orderId, keys)

  return { switched: true, from, amount: after.total, collection_id: collectionId, removed_cod_fee: done.removed_cod_fee === true }
}
