import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { shortLinesAt, type PickupLineFacts, type PickupShortLine } from "./pickup-shortage"
import { variantHasStock } from "./variant-stock"

type CartRow = {
  items?: {
    quantity: number
    title: string
    product_handle: string | null
    variant_id: string | null
  }[]
}

/**
 * The cart lines that have no stock at ONE stock location (the pickup option's), the thin Medusa wiring around `shortLinesAt`.
 * Unlike `soldUniqueLinesOfCart` a failure is NOT swallowed: the route answers 503 and the storefront then names nothing, it
 * does not guess.
 */
export async function pickupShortLinesOfCart(
  scope: MedusaContainer,
  cartId: string,
  locationId: string
): Promise<PickupShortLine[]> {
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "cart",
    filters: { id: cartId },
    fields: ["items.quantity", "items.title", "items.product_handle", "items.variant_id"],
  })
  const items = (data as CartRow[])[0]?.items ?? []
  const variantOf = new Map<PickupLineFacts, string>()
  const lines: PickupLineFacts[] = []
  for (const item of items) {
    if (!item.variant_id) continue
    const facts: PickupLineFacts = { title: item.title, handle: item.product_handle, quantity: item.quantity }
    lines.push(facts)
    variantOf.set(facts, item.variant_id)
  }
  const inventory = scope.resolve(Modules.INVENTORY)
  return shortLinesAt(lines, (line) => variantHasStock(query, inventory, variantOf.get(line)!, line.quantity, [locationId]))
}
