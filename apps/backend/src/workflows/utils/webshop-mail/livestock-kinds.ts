import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { SHIPPING_ATTRIBUTES_MODULE } from "../../../modules/shipping-attributes"
import { type LivestockKind, distinctLivestockKinds } from "../../../modules/shipping-attributes/livestock-kind"
import type ShippingAttributesModuleService from "../../../modules/shipping-attributes/service"

/**
 * THE KINDS OF LIVE ANIMAL IN AN ORDER (V2.6, card f4e4832b), for the order
 * confirmation's acclimatisation section: the distinct `livestock_kind`s of
 * the shipping attributes of the order's products, in the fixed kind order.
 *
 * The read is a convenience for the mail, never a reason to hold the mail
 * back: EVERYTHING that can fail (the order read, the module, the list) sits
 * inside the guard, so a failure sends the order without kinds (so without the
 * section) and says so in the log. A product with no record, or one the OS
 * has not written a kind to, simply adds nothing.
 */
export const livestockKindsOf = async (
  productIdsOf: () => Promise<readonly (string | null | undefined)[]>,
  list: (productIds: string[]) => Promise<readonly { livestock_kind?: unknown }[]>,
  warn: (message: string) => void = () => undefined
): Promise<LivestockKind[]> => {
  try {
    const ids = [...new Set((await productIdsOf()).filter((id): id is string => typeof id === "string" && id !== ""))]
    if (!ids.length) return []
    const rows = await list(ids)
    return distinctLivestockKinds(rows.map((row) => row.livestock_kind))
  } catch (error) {
    warn(`The livestock kinds of an order could not be read: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/** The Medusa side: the order's product ids, then one list call on the shipping attributes module. */
export const livestockKindsOfOrder = (container: MedusaContainer, orderId: string): Promise<LivestockKind[]> =>
  livestockKindsOf(
    async () => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({ entity: "order", filters: { id: orderId }, fields: ["id", "items.product_id"] })
      const items = ((data?.[0] as { items?: ({ product_id?: string | null } | null)[] } | undefined)?.items ?? []).filter(
        Boolean
      ) as { product_id?: string | null }[]
      return items.map((item) => item.product_id)
    },
    (product_id) =>
      container.resolve<ShippingAttributesModuleService>(SHIPPING_ATTRIBUTES_MODULE).listShippingAttributes({ product_id }),
    (message) => {
      try {
        container.resolve<Logger>(ContainerRegistrationKeys.LOGGER).warn(`Order ${orderId}: ${message}`)
      } catch {
        // the log is a courtesy: with none to write to, the mail still goes
      }
    }
  )
