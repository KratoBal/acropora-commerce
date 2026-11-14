import type { IInventoryService, RemoteQueryFunction } from "@medusajs/framework/types"

type VariantRow = {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_items?: { inventory_item_id: string; required_quantity?: number | null }[]
}

/**
 * Whether `quantity` of the variant is in stock over the given stock locations: the inventory module's own `confirmInventory`
 * (the call `confirm-inventory` makes), once per inventory item the variant is made of. A variant that does not manage
 * inventory, allows backorder or has no inventory item counts as "has stock": the point is to NAME a shortage, never to
 * invent one.
 */
export async function variantHasStock(
  query: Pick<RemoteQueryFunction, "graph">,
  inventory: Pick<IInventoryService, "confirmInventory">,
  variantId: string,
  quantity: number,
  locationIds: string[]
): Promise<boolean> {
  const { data } = await query.graph({
    entity: "variant",
    filters: { id: variantId },
    fields: ["id", "manage_inventory", "allow_backorder", "inventory_items.inventory_item_id", "inventory_items.required_quantity"],
  })
  const variant = (data as VariantRow[])[0]
  if (!variant || !variant.manage_inventory || variant.allow_backorder) return true
  for (const link of variant.inventory_items ?? []) {
    const wanted = quantity * Number(link.required_quantity ?? 1)
    if (!(await inventory.confirmInventory(link.inventory_item_id, locationIds, wanted))) return false
  }
  return true
}
