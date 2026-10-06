import type { OrderBusinessStatus } from "../../../modules/order-business-status/types"
import { isCashOnDeliveryFeeLineItem } from "../cod-fee-line-item"
import { PARENT_ORDER_METADATA_KEY } from "../split-completion"

/**
 * A PLACED ORDER SPLIT INTO TWO (card 0a14f739, C/3; Balázs, 2026-10-06
 * 04:46 UTC, memory 2124; 2026-08-31: "szetbontjuk a rendelest, ami megvan
 * elkuldjuk, a maradekot kulon rendelesbe"): the lines the OS selected move to
 * a new, linked order with its own number; the rest stays and ships.
 *
 * This file decides only WHETHER and WHAT: no Medusa call. The link is NOT the
 * mixed cart's pickup link (`acropora_parent_order_id` /
 * `acropora_pickup_order_id`): the shared Stripe capture reads those to take
 * the pair's two parts from one hold, and the new order has no part there.
 */
export const SPLIT_ORDER_IDS_KEY = "acropora_split_order_ids"
export const SPLIT_FROM_ORDER_KEY = "acropora_split_from_order_id"

/** Before Kiszállítás only: Kiszállítás takes the money, a split after it is a refund. */
export const SPLITTABLE_STATUSES: readonly OrderBusinessStatus[] = ["pending_processing", "confirmed", "stocking"]

export type SplitLine = {
  id: string
  variant_id: string | null
  title: string
  quantity: number
  /**
   * The line's stored price per unit (forint), on the line's own tax basis
   * (`is_tax_inclusive`, which the new order's line copies). Not a computed
   * total: a discounted line is refused below, so nothing else is in it.
   */
  unit_price: number
  /** The line's discount, forint; a discounted line is not split in this round. */
  discount_total?: number | null
  metadata?: Record<string, unknown> | null
}

export type SplitOrder = {
  id: string
  status: string
  business_status: OrderBusinessStatus | null
  metadata: Record<string, unknown> | null
  fulfillments: Array<{ id: string; canceled_at?: unknown } | null> | null
  items: SplitLine[]
}

export type SplitBlock = "canceled" | "fulfilled" | "status" | "pickup_half" | "paid"

export const SPLIT_BLOCK_MESSAGE: Record<SplitBlock, string> = {
  canceled: "A rendelés törölve van, nem bontható szét.",
  fulfilled: "A rendelésből már ment csomag, nem bontható szét.",
  status: "Szétbontani csak kiszállítás előtt lehet (Feldolgozásra vár, Visszaigazolva, Készletezés alatt).",
  pickup_half:
    "Ez egy vegyes kosár bolti rendelése, ami a kiszállítandó rendeléssel közös fizetésen áll; ez a rész most nem bontható szét.",
  paid: "A rendelés már ki van fizetve; kifizetett rendelés szétbontása most nem lehetséges.",
}

/** Why the order cannot be split now; null if it can. `paid` comes from the payment state. */
export const splitBlock = (order: SplitOrder, paid: boolean): SplitBlock | null => {
  if (order.status === "canceled") return "canceled"
  if ((order.fulfillments ?? []).some((f) => f && !f.canceled_at)) return "fulfilled"
  if (!order.business_status || !SPLITTABLE_STATUSES.includes(order.business_status)) return "status"
  if (typeof order.metadata?.[PARENT_ORDER_METADATA_KEY] === "string") return "pickup_half"
  if (paid) return "paid"
  return null
}

export type MovedLine = {
  from_item_id: string
  variant_id: string | null
  title: string
  quantity: number
  /** A's stored price per unit; the new order's unit price, on the same tax basis. */
  unit_price: number
  metadata: Record<string, unknown> | null
}

export type SplitPlan =
  | { status: "invalid"; message: string }
  | {
      status: "ok"
      moved: MovedLine[]
      /** The original lines' quantities after the split (0: the line goes). */
      remaining: Array<{ item_id: string; quantity: number }>
    }

const invalid = (message: string): SplitPlan => ({ status: "invalid", message })

/**
 * The selected lines and quantities, checked against the order. Every unit
 * of a line costs the same (no discount on a moved line in this round), so a
 * line's price per unit is its total over its quantity, and the two orders
 * add up to the original.
 */
export const planSplit = (order: SplitOrder, lines: Array<{ item_id: string; quantity: number }>): SplitPlan => {
  if (!lines.length) return invalid("Jelölj ki legalább egy tételt.")
  const byId = new Map(order.items.map((item) => [item.id, item]))
  const asked = new Map<string, number>()
  for (const line of lines) {
    const item = byId.get(line.item_id)
    if (!item) return invalid("A kijelölt tétel nincs ebben a rendelésben.")
    if (isCashOnDeliveryFeeLineItem(item)) return invalid("Az utánvét díja nem tétel, nem vihető át.")
    if (!Number.isInteger(line.quantity) || line.quantity < 1) return invalid("A mennyiség legalább 1 legyen.")
    const total = (asked.get(item.id) ?? 0) + line.quantity
    if (total > item.quantity) return invalid(`A(z) „${item.title}” tételből csak ${item.quantity} db van a rendelésben.`)
    if ((item.discount_total ?? 0) > 0) {
      return invalid(`A(z) „${item.title}” tétel kedvezményes; kedvezményes tétel most nem vihető át.`)
    }
    asked.set(item.id, total)
  }
  const goods = order.items.filter((item) => !isCashOnDeliveryFeeLineItem(item))
  if (goods.every((item) => (asked.get(item.id) ?? 0) === item.quantity)) {
    return invalid("Minden tétel átkerülne, és üres rendelés maradna; ez nem szétbontás.")
  }
  return {
    status: "ok",
    moved: [...asked].map(([itemId, quantity]) => {
      const item = byId.get(itemId)!
      return {
        from_item_id: item.id,
        variant_id: item.variant_id,
        title: item.title,
        quantity,
        unit_price: item.unit_price,
        metadata: item.metadata ?? null,
      }
    }),
    remaining: [...asked].map(([itemId, quantity]) => ({ item_id: itemId, quantity: byId.get(itemId)!.quantity - quantity })),
  }
}
