import { MedusaContainer } from "@medusajs/framework"

import { SHIPPING_ATTRIBUTES_MODULE } from "../../../modules/shipping-attributes"
import ShippingAttributesModuleService from "../../../modules/shipping-attributes/service"

export type ShippingAttributeFlags = {
  pickup_only: boolean
  foxpost_forbidden: boolean
  is_heavy: boolean
  is_frozen: boolean
}

/**
 * A product with no record is not "unknown", it is "nothing set". Missing data
 * must never read as a restriction, so every default is false.
 */
export const defaultFlags = (product_id: string) => ({
  id: null,
  product_id,
  pickup_only: false,
  foxpost_forbidden: false,
  is_heavy: false,
  is_frozen: false,
})

export const resolveService = (
  scope: MedusaContainer
): ShippingAttributesModuleService =>
  scope.resolve(SHIPPING_ATTRIBUTES_MODULE)

/**
 * Upsert by product id. The unique index on `product_id` is the real guard;
 * this lookup keeps the common path from relying on a constraint violation.
 */
export const upsertByProductId = async (
  scope: MedusaContainer,
  product_id: string,
  flags: Partial<ShippingAttributeFlags>
) => {
  const service = resolveService(scope)

  const [existing] = await service.listShippingAttributes(
    { product_id },
    { take: 1 }
  )

  if (!existing) {
    const [created] = await service.createShippingAttributes([
      { product_id, ...flags },
    ])
    return created
  }

  const [updated] = await service.updateShippingAttributes([
    { id: existing.id, ...flags },
  ])
  return updated
}
