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
 * order, once per run, until it is fixed. That line is the alert today; where
 * the shop's alert should land (mail, the OS) is a decision still open.
 */
export const RETRY_AFTER_MINUTES = 3
export const ALERT_AFTER_MINUTES = 30
/** How far back the job looks: a stuck pickup older than this needs a person. */
export const LOOK_BACK_DAYS = 7
const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

export type StuckPickup = {
  pickup_cart_id: string
  parent_cart_id: string
  /** When the shipped cart was completed (its order exists since then). */
  parent_completed_at: Date
}

export type PickupRetryOperations = {
  /** Unfinished pickup carts created since `since` whose parent is completed and names them back. */
  stuck(since: Date): Promise<StuckPickup[]>
  /** The split's idempotent completion for the parent cart. */
  completeSplit(parentCartId: string): Promise<{ order_ids: string[] }>
  info(message: string): void
  error(message: string): void
}

export type PickupRetryReport = { finished: string[]; pending: string[]; failed: string[] }

export const runPickupRetry = async (
  ops: PickupRetryOperations,
  now: Date = new Date()
): Promise<PickupRetryReport> => {
  const report: PickupRetryReport = { finished: [], pending: [], failed: [] }
  const found = await ops.stuck(new Date(now.getTime() - LOOK_BACK_DAYS * DAY_MS))

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
      if (ageMinutes >= ALERT_AFTER_MINUTES) alert(ops, item, ageMinutes)
    } catch (error) {
      report.failed.push(item.parent_cart_id)
      if (ageMinutes >= ALERT_AFTER_MINUTES) alert(ops, item, ageMinutes, error)
      else {
        ops.info(
          `Pickup retry: cart ${item.parent_cart_id} failed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
  return report
}

const alert = (ops: PickupRetryOperations, item: StuckPickup, ageMinutes: number, error?: unknown) =>
  ops.error(
    `ALERT pickup order missing: the shipped cart ${item.parent_cart_id} was completed ${Math.round(ageMinutes)} minutes ago, its pickup cart ${item.pickup_cart_id} still has no order${
      error ? ` (${error instanceof Error ? error.message : String(error)})` : ""
    }. The customer's card may be held for it. Finish it with POST /store/carts/${item.parent_cart_id}/complete-split.`
  )

export const pickupRetryOperations = (container: MedusaContainer): PickupRetryOperations => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  return {
    stuck: async (since) => {
      const { data: carts } = await query.graph({
        entity: "cart",
        filters: { completed_at: null, created_at: { $gte: since } },
        fields: ["id", "metadata"],
      })
      const pickups = (carts as { id: string; metadata?: Record<string, unknown> | null }[])
        .map((cart) => ({ id: cart.id, parent: cart.metadata?.[PARENT_CART_METADATA_KEY] }))
        .filter((cart): cart is { id: string; parent: string } => typeof cart.parent === "string" && !!cart.parent)
      if (!pickups.length) return []

      const { data: parents } = await query.graph({
        entity: "cart",
        filters: { id: pickups.map((pickup) => pickup.parent) },
        fields: ["id", "metadata", "completed_at"],
      })
      const parentOf = new Map(
        (parents as { id: string; metadata?: Record<string, unknown> | null; completed_at?: string | Date | null }[]).map(
          (parent) => [parent.id, parent]
        )
      )
      const stuck: StuckPickup[] = []
      for (const pickup of pickups) {
        const parent = parentOf.get(pickup.parent)
        if (!parent?.completed_at) continue
        // the link from both sides
        if (parent.metadata?.[PICKUP_CART_METADATA_KEY] !== pickup.id) continue
        stuck.push({
          pickup_cart_id: pickup.id,
          parent_cart_id: parent.id,
          parent_completed_at: new Date(parent.completed_at),
        })
      }
      return stuck
    },
    completeSplit: (parentCartId) => completeSplitForCart(container, parentCartId),
    info: (message) => logger.info(message),
    error: (message) => logger.error(message),
  }
}
