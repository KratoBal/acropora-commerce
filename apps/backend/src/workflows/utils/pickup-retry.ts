import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { completeSplitForCart } from "./complete-split-for-cart"
import { PARENT_CART_METADATA_KEY, PICKUP_CART_METADATA_KEY } from "./split-completion"

/**
 * A MIXED CART'S PICKUP ORDER THAT DID NOT GET MADE IS RETRIED, AND SAID ALOUD
 * (audit P1/6, F2 in 07-fizetes-rendeles.md). When the shipped order exists
 * but the pickup (live-animal) order failed, `completeSplitCart` keeps the
 * shipped order and reports `pending_pickup_cart_id`; the customer's route and
 * the `order.placed` subscriber then only wrote a log line, so the pickup order
 * could be missing while the card hold was already taken, and nobody was told.
 *
 * This job (every ten minutes) finds those carts and runs the same idempotent,
 * locked completion again. It never creates a second shipped order: the
 * completion finds the first and finishes only the pickup half.
 *
 * WHAT COUNTS AS STUCK: a pickup cart not completed, whose parent cart IS
 * completed (its order exists) for at least `RETRY_AFTER_MINUTES`, so the
 * normal route and subscriber had their chance. The link must hold from both
 * sides (the parent names this pickup cart, and the pickup cart names the
 * parent), the rule the split itself enforces.
 *
 * SAID ALOUD: a retry that still leaves the pickup order missing after
 * `ALERT_AFTER_MINUTES` writes an ERROR line naming both carts and the shipped
 * order, and repeats it for the same cart at most once per
 * `ALERT_REPEAT_MINUTES` (barracuda's note on #592: a cart that can never be
 * finished would write one every ten minutes for seven days). The list the OS
 * shows (`order-attention.ts`) is the lasting alert; this line stays beside it.
 *
 * RETRY STOPPED ON PURPOSE: a person can mark a shipped cart "do not retry"
 * (`PICKUP_RETRY_SKIP_METADATA_KEY`, set through `POST /admin/order-attention/
 * pickup-skip`). Without it the job would finish a pickup order the shop
 * deliberately does not fulfil (the customer cancelled the live animal) within
 * the seven days. The mark stops ONLY the retry (acrobot, 2026-10-27 20:51 UTC):
 * the customer's card may still be held for the missing order, and releasing or
 * refunding it is a person's decision, so the cart stays on the OS list
 * (`order-attention.ts`, with the mark shown) for as long as it is a candidate.
 * The job neither retries nor writes its ERROR line for it; the OS list is its
 * reminder.
 *
 * THE CANDIDATE QUERY starts from the COMPLETED carts of the last seven days
 * (an order each), not from every open cart: open carts are mostly abandoned
 * ones and grow without bound (barracuda: "first thing to narrow on
 * production").
 */
export const RETRY_AFTER_MINUTES = 3
export const ALERT_AFTER_MINUTES = 30
/** The same cart's ERROR line repeats at most this often. */
export const ALERT_REPEAT_MINUTES = 60
/** Set on the SHIPPED (parent) cart by a person: do not retry, alert on or list its pickup order. */
export const PICKUP_RETRY_SKIP_METADATA_KEY = "acropora_pickup_retry_skip"

/** Who stopped the retry, when and why (what `POST /admin/order-attention/pickup-skip` wrote). */
export type RetryStopped = { at: string; reason: string; by: string | null }
export const retryStoppedOf = (metadata?: Record<string, unknown> | null): RetryStopped | null => {
  const mark = metadata?.[PICKUP_RETRY_SKIP_METADATA_KEY]
  if (!mark || typeof mark !== "object") return mark ? { at: "", reason: "", by: null } : null
  const { at, reason, by } = mark as Record<string, unknown>
  return {
    at: typeof at === "string" ? at : "",
    reason: typeof reason === "string" ? reason : "",
    by: typeof by === "string" ? by : null,
  }
}
/** How far back the job looks: a stuck pickup older than this needs a person. */
export const LOOK_BACK_DAYS = 7
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export type StuckPickup = {
  pickup_cart_id: string
  parent_cart_id: string
  /** When the shipped cart was completed (its order exists since then). */
  parent_completed_at: Date
  /** Set when a person stopped the retry: the job leaves the cart alone, the OS list still shows it. */
  retry_stopped?: RetryStopped | null
}

export type PickupRetryOperations = {
  /**
   * Unfinished pickup carts whose parent cart was completed since `since` and
   * names them back. Carts a person marked "do not retry" are INCLUDED, with
   * `retry_stopped`: the job skips them, the OS list keeps them.
   */
  stuck(since: Date): Promise<StuckPickup[]>
  /** The split's idempotent completion for the parent cart. */
  completeSplit(parentCartId: string): Promise<{ order_ids: string[] }>
  info(message: string): void
  error(message: string): void
}

export type PickupRetryReport = { finished: string[]; pending: string[]; failed: string[] }

/**
 * WHEN EACH CART LAST GOT ITS ERROR LINE. In memory: a restart forgets it and
 * the next run writes one line per stuck cart at once, which is the point of a
 * restart anyway. The job runs in one process, so one map is the whole truth.
 */
export type AlertMemory = Map<string, number>
const processAlertMemory: AlertMemory = new Map()

export const runPickupRetry = async (
  ops: PickupRetryOperations,
  now: Date = new Date(),
  memory: AlertMemory = processAlertMemory
): Promise<PickupRetryReport> => {
  const report: PickupRetryReport = { finished: [], pending: [], failed: [] }
  // a cart whose retry a person stopped is not touched, and writes no line
  const found = (await ops.stuck(new Date(now.getTime() - LOOK_BACK_DAYS * DAY_MS))).filter(
    (item) => !item.retry_stopped
  )
  // a cart that finished, was marked or aged out is forgotten, so the map stays as small as the list
  for (const cartId of Array.from(memory.keys())) {
    if (!found.some((item) => item.parent_cart_id === cartId)) memory.delete(cartId)
  }

  for (const item of found) {
    const ageMinutes = (now.getTime() - item.parent_completed_at.getTime()) / MINUTE_MS
    // the route and the order.placed subscriber go first
    if (ageMinutes < RETRY_AFTER_MINUTES) continue

    try {
      const result = await ops.completeSplit(item.parent_cart_id)
      // two orders: the shipped one and the pickup one
      if (result.order_ids.length >= 2) {
        report.finished.push(item.parent_cart_id)
        ops.info(
          `Pickup retry: cart ${item.parent_cart_id} finished, orders ${result.order_ids.join(", ")}.`
        )
        continue
      }
      report.pending.push(item.parent_cart_id)
      if (ageMinutes >= ALERT_AFTER_MINUTES) alert(ops, memory, now, item, ageMinutes)
    } catch (error) {
      report.failed.push(item.parent_cart_id)
      if (ageMinutes >= ALERT_AFTER_MINUTES) alert(ops, memory, now, item, ageMinutes, error)
      else {
        ops.info(
          `Pickup retry: cart ${item.parent_cart_id} failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
  return report
}

const alert = (
  ops: PickupRetryOperations,
  memory: AlertMemory,
  now: Date,
  item: StuckPickup,
  ageMinutes: number,
  error?: unknown
) => {
  const last = memory.get(item.parent_cart_id)
  if (last !== undefined && now.getTime() - last < ALERT_REPEAT_MINUTES * MINUTE_MS) return
  memory.set(item.parent_cart_id, now.getTime())
  ops.error(
    `ALERT pickup order missing: the shipped cart ${item.parent_cart_id} was completed ${Math.round(ageMinutes)} minutes ago, its pickup cart ${item.pickup_cart_id} still has no order${
      error ? ` (${error instanceof Error ? error.message : String(error)})` : ""
    }. The customer's card may be held for it. Finish it with POST /store/carts/${item.parent_cart_id}/complete-split, or, if the shop does not fulfil it, stop the retry with POST /admin/order-attention/pickup-skip (that stops only the retry: the card hold still has to be released or refunded by a person).`
  )
}

export const pickupRetryOperations = (container: MedusaContainer): PickupRetryOperations => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  return {
    stuck: async (since) => {
      type CartRow = { id: string; metadata?: Record<string, unknown> | null; completed_at?: string | Date | null }
      // the shipped carts: completed (an order each) in the window, naming a pickup cart
      const { data: completed } = await query.graph({
        entity: "cart",
        filters: { completed_at: { $gte: since } },
        fields: ["id", "metadata", "completed_at"],
      })
      const parents = (completed as CartRow[]).flatMap((cart) => {
        const pickupId = cart.metadata?.[PICKUP_CART_METADATA_KEY]
        if (typeof pickupId !== "string" || !pickupId || !cart.completed_at) return []
        return [{ cart, pickupId }]
      })
      if (!parents.length) return []

      const { data: open } = await query.graph({
        entity: "cart",
        filters: { id: parents.map((parent) => parent.pickupId), completed_at: null },
        fields: ["id", "metadata"],
      })
      const pickupOf = new Map((open as CartRow[]).map((pickup) => [pickup.id, pickup]))
      const stuck: StuckPickup[] = []
      for (const { cart, pickupId } of parents) {
        const pickup = pickupOf.get(pickupId)
        if (!pickup) continue
        // the link from both sides
        if (pickup.metadata?.[PARENT_CART_METADATA_KEY] !== cart.id) continue
        stuck.push({
          pickup_cart_id: pickup.id,
          parent_cart_id: cart.id,
          parent_completed_at: new Date(cart.completed_at as string | Date),
          retry_stopped: retryStoppedOf(cart.metadata),
        })
      }
      return stuck
    },
    completeSplit: (parentCartId) => completeSplitForCart(container, parentCartId),
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
  }
}
