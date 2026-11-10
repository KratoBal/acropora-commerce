import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { lineTitle } from "../webshop-mail/operations"

/**
 * THE TITLES OF THE LINES A WITHDRAWAL DECLARATION NAMES (V0.3, card 3c292c56), for the acknowledgement mail: the OS lists
 * them, so the customer sees WHAT was declared and not only a reference. The titles are the order's own, in the order of
 * the ids, written the way the order mail writes a line (`lineTitle`: the product, and the variant when it says
 * something). A line the order does not show, or one with no title, is left out.
 *
 * IT NEVER THROWS, AND AN UNREADABLE ORDER IS AN EMPTY LIST: the acknowledgement is the durable medium of a legal
 * declaration and goes out with or without the titles (the OS renders no list for none). The log has the order id and
 * the error's kind only.
 */
export const withdrawalLineTitles = async (
  container: MedusaContainer,
  orderId: string,
  itemIds: string[],
): Promise<string[]> => {
  if (!orderId || itemIds.length === 0) return []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order",
      filters: { id: orderId } as Record<string, unknown>,
      fields: ["id", "items.id", "items.title", "items.product_title", "items.variant_title"],
    })
    const order = (data?.[0] ?? null) as { id: string; items?: ({ id: string } | null)[] } | null
    if (!order || order.id !== orderId) return []
    const byId = new Map((order.items ?? []).filter(Boolean).map((item) => [String(item!.id), item]))
    return itemIds.flatMap((id) => {
      const title = byId.has(id) ? lineTitle(byId.get(id)) : ""
      return title ? [title] : []
    })
  } catch (error) {
    try {
      container
        .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
        .warn(`order ${orderId}: the withdrawal's line titles could not be read (${(error as Error)?.name ?? "error"})`)
    } catch {
      // no logger either: nothing more to do, the mail goes without the titles
    }
    return []
  }
}
