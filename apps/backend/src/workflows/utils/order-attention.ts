import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  ALERT_AFTER_MINUTES,
  pickupRetryOperations,
  type RetryStopped,
  type StuckPickup,
} from "./pickup-retry"

/**
 * THE ORDERS THAT NEED SOMEONE'S EYES (commerce-audit-p1, P1/6): the OS reads
 * this list and shows it where the shop works (acrobot, 2026-10-27 15:01: "an
 * entry in the OS, followable on the control panel; the log line stays beside
 * it"). The OS pulls from Medusa and has no push channel from here, so the
 * list is a read, not a notification.
 *
 * ONE KIND TODAY, only reported, nothing is done or closed:
 *
 * - `pickup_missing`: a mixed cart's shipped order exists, its pickup
 *   (live-animal) order does not, for at least `ALERT_AFTER_MINUTES` after the
 *   shipped cart was completed. The `pickup-retry` job keeps trying every ten
 *   minutes; this is the entry for the person who can look (the same threshold
 *   as its ERROR log line).
 *
 * WHY NOT THE UNPAID BANK-TRANSFER ORDERS (audit F3), which an earlier version
 * of this file also listed: the OS already tracks the proforma's own 8-day
 * deadline per order (`WEBSHOP_PROFORMA_DUE_DAYS`, `webshopProformaExpired`) and
 * flags "Lejárt díjbekérő" on its order list. This backend does not know when
 * the OS issued the proforma, so counting from the order date would flag an
 * order whose proforma was issued on day 9 and is valid until day 17, in
 * conflict with the OS. The system never closes a live order by itself
 * (acrobot, 2026-10-27 15:01, decision (b)); the one gap left is an order whose
 * proforma was never issued, and that is the OS's data, not this backend's.
 */
export type AttentionItem = {
  kind: "pickup_missing"
  /** The shipped order that exists; null if the cart's order cannot be found. */
  order_id: string | null
  display_id: number | null
  parent_cart_id: string
  pickup_cart_id: string
  since: string
  minutes: number
  /**
   * A person stopped the retry for this cart (`POST /admin/order-attention/
   * pickup-skip`). The entry stays: the card may still be held for the missing
   * order, and releasing or refunding it is a person's decision.
   */
  retry_stopped: RetryStopped | null
}

export type AttentionOperations = {
  stuckPickups(since: Date): Promise<StuckPickup[]>
  /** The shipped order a cart became, or null. */
  orderOfCart(cartId: string): Promise<{ order_id: string; display_id: number | null } | null>
}

const DAY_MS = 24 * 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export const computeAttention = async (
  ops: AttentionOperations,
  now: Date = new Date()
): Promise<AttentionItem[]> => {
  const items: AttentionItem[] = []

  const stuck = await ops.stuckPickups(new Date(now.getTime() - 7 * DAY_MS))
  for (const item of stuck) {
    const minutes = (now.getTime() - item.parent_completed_at.getTime()) / MINUTE_MS
    if (minutes < ALERT_AFTER_MINUTES) continue
    const order = await ops.orderOfCart(item.parent_cart_id)
    items.push({
      kind: "pickup_missing",
      order_id: order?.order_id ?? null,
      display_id: order?.display_id ?? null,
      parent_cart_id: item.parent_cart_id,
      pickup_cart_id: item.pickup_cart_id,
      since: item.parent_completed_at.toISOString(),
      minutes: Math.floor(minutes),
      retry_stopped: item.retry_stopped ?? null,
    })
  }

  // oldest first: the longest wait is the first thing to look at
  return items.sort((a, b) => a.since.localeCompare(b.since))
}

export const attentionOperations = (container: MedusaContainer): AttentionOperations => {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pickups = pickupRetryOperations(container)
  return {
    stuckPickups: (since) => pickups.stuck(since),
    orderOfCart: async (cartId) => {
      const { data } = await query.graph({
        entity: "order_cart",
        filters: { cart_id: cartId },
        fields: ["order_id", "order.display_id"],
      })
      const row = data?.[0] as { order_id?: string; order?: { display_id?: number | null } } | undefined
      return row?.order_id ? { order_id: row.order_id, display_id: row.order?.display_id ?? null } : null
    },
  }
}
