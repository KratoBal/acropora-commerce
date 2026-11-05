import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { soldUniqueLines, type CartLineFacts, type SoldLine } from "./sold-lines"

type VariantRow = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?: { inventory_item_id: string; required_quantity?: number | null }[]
}

type CartRow = {
  sales_channel_id: string | null
  items?: {
    quantity: number
    title: string
    product_handle: string | null
    variant_id: string | null
    product?: { metadata?: Record<string, unknown> | null } | null
  }[]
}

/**
 * The unique pieces of the cart that have no stock now: the thin Medusa wiring around `soldUniqueLines`. Each line is checked
 * with the inventory module's own `confirmInventory` (the call `confirm-inventory` makes) over the sales channel's stock locations
 * and the variant's inventory items, so the answer follows the completion's check. A variant that does not manage inventory, allows
 * backorder or has no inventory item counts as "has stock": the point is to NAME the shortage, never to invent one. Any failure
 * here (a query that throws) answers nothing, and the original error goes on.
 */
export async function soldUniqueLinesOfCart(scope: MedusaContainer, cartId: string): Promise<SoldLine[]> {
  try {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "cart",
      filters: { id: cartId },
      fields: ["sales_channel_id", "items.quantity", "items.title", "items.product_handle", "items.variant_id", "items.product.metadata"],
    })
    const cart = (data as CartRow[])[0]
    if (!cart?.items?.length) return []
    const variantIds = new Map<CartLineFacts, string>()
    const lines: CartLineFacts[] = []
    for (const item of cart.items) {
      if (!item.variant_id) continue
      const facts: CartLineFacts = {
        title: item.title,
        handle: item.product_handle,
        quantity: item.quantity,
        uniquePiece: item.product?.metadata?.unique_piece,
      }
      lines.push(facts)
      variantIds.set(facts, item.variant_id)
    }
    const { data: channels } = cart.sales_channel_id
      ? await query.graph({
          entity: "sales_channel",
          filters: { id: cart.sales_channel_id },
          fields: ["stock_locations.id"],
        })
      : { data: [] }
    const locationIds = ((channels as { stock_locations?: { id: string }[] }[])[0]?.stock_locations ?? []).map(
      (location) => location.id
    )
    const inventory = scope.resolve(Modules.INVENTORY)
    return await soldUniqueLines(lines, async (line) => {
      const { data: variants } = await query.graph({
        entity: "variant",
        filters: { id: variantIds.get(line)! },
        fields: ["id", "manage_inventory", "allow_backorder", "inventory_items.inventory_item_id", "inventory_items.required_quantity"],
      })
      const variant = (variants as VariantRow[])[0]
      // a variant that does not manage inventory, allows backorder or has no inventory item cannot be "out of stock"
      if (!variant || !variant.manage_inventory || variant.allow_backorder) return true
      for (const link of variant.inventory_items ?? []) {
        const wanted = line.quantity * Number(link.required_quantity ?? 1)
        if (!(await inventory.confirmInventory(link.inventory_item_id, locationIds, wanted))) return false
      }
      return true
    })
  } catch {
    return []
  }
}
