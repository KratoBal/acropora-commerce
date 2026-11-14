import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { listShippingOptionsForCartWorkflow } from "@medusajs/medusa/core-flows"

import {
  isCartPickupLocation,
  shortLinesAt,
  type CartOptionFacts,
  type PickupLineFacts,
  type PickupShortLine,
} from "./pickup-shortage"
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
 * The location must be one of the cart's own pickup locations (`isCartPickupLocation`), otherwise the answer is an empty list.
 * Unlike `soldUniqueLinesOfCart` a failure is NOT swallowed: the route answers 503 and the storefront then names nothing, it
 * does not guess.
 */
export async function pickupShortLinesOfCart(
  scope: MedusaContainer,
  cartId: string,
  locationId: string
): Promise<PickupShortLine[]> {
  // only the cart's OWN pickup locations may be asked about: any other location answers an empty list (nothing to read off it)
  const { result: options } = await listShippingOptionsForCartWorkflow(scope).run({
    input: {
      cart_id: cartId,
      is_return: false,
      fields: ["id", "service_zone.fulfillment_set.type", "service_zone.fulfillment_set.location.id"],
    },
  })
  if (!isCartPickupLocation(options as CartOptionFacts[], locationId)) return []
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
